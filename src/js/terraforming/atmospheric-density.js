/*
  atmospheric-density.js

  Purpose
  -------
  Fast-ish, game-friendly estimate of average atmospheric density (kg/m^3)
  versus altitude, using *only* the information your game already tracks:
  - atmospheric mass by species (resources.atmospheric.*.value)
  - surface temperature (terraforming.temperature.value)
  - surface gravity + radius (terraforming.celestialParameters)
  - solar flux / luminosity (terraforming.luminosity.*)

  This is NOT a scientific atmosphere model (no full radiative-convective
  profile, no chemistry, no winds). It is a hydrostatic + ideal-gas
  approximation with a small number of isothermal layers and heuristic
  thermosphere/exosphere temperatures.

  ✅ H2O handling (condensable)
  ----------------------------
  Water vapor is treated as a *condensable* species, not well-mixed to orbit.
  - We compute a surface H2O partial pressure from inventory (mole fraction).
  - We cap H2O by saturation vapor pressure *and* a cold-trap cap aloft.

  This captures the “2 kPa H2O on cold Mars mostly condenses and does not
  reach debris altitudes” intuition without a full weather model.

  Design goals
  ------------
  - “Decent enough” density falloff for Earth / Mars / Venus / Titan.
  - Stable behavior under terraforming (pressure/composition/temperature changes).
  - O(1) density queries after a one-time per-tick model build.
  - Optional bin-level memoization for your debris altitude bins.

  API
  ---
  - estimateAtmosphericDensityKgPerM3(altitudeMeters, terraforming?) -> number
  - estimateAtmosphericDensitiesKgPerM3(altitudeMetersArray, terraforming?) -> number[]
  - getAtmosphericDensityModel(terraforming?, options?) -> model
      model.getDensity(altitudeMeters) -> number
      model.getDensities(altitudeMetersArray) -> number[]
      model.getDebug() -> object (useful for tuning)

  Options (new)
  ------------
  - relativeHumidity: 0..1 (default 0.7)  // troposphere-ish
  - coldTrapRelativeHumidity: 0..1 (default 0.1) // stratosphere-ish dryness cap
  - enableWaterCondensation: boolean (default true)
  - adjustSurfacePressureForWaterCondensation: boolean (default auto)
      If surface pressure comes from mass-based inference (fallback), we subtract
      any “excess” H2O above saturation from total surface pressure.

      If surface pressure comes from terraforming.calculateTotalPressure(), we
      assume your terraforming system already decided what is vapor vs condensed.
*/

(function () {
  const isNode = (typeof module !== 'undefined' && module.exports);

  // ---------- Constants ----------
  const R_UNIVERSAL = 8.314462618;          // J/(mol*K)
  const AVOGADRO = 6.02214076e23;           // 1/mol
  const BOLTZMANN = 1.380649e-23;           // J/K
  const SOLAR_FLUX_EARTH = 1361;            // W/m^2
  const DEFAULT_COLLISION_SIGMA_M2 = 2e-19; // m^2 (order-of-magnitude molecular collision cross-section)

  // ---------- Small helpers ----------
  function clamp(x, min, max) {
    return Math.max(min, Math.min(max, x));
  }

  function isFiniteNumber(x) {
    return Number.isFinite(x);
  }

  function safeLog10(x) {
    // log10(<=0) is invalid; clamp to small positive.
    const v = x > 1e-30 ? x : 1e-30;
    return Math.log(v) / Math.LN10;
  }

  function extractTons(maybeResource) {
    if (typeof maybeResource === 'number') return isFiniteNumber(maybeResource) ? maybeResource : 0;
    if (!maybeResource || typeof maybeResource !== 'object') return 0;
    const v = maybeResource.value ?? maybeResource.amount ?? maybeResource.initialValue ?? 0;
    return isFiniteNumber(v) ? v : 0;
  }

  function getGlobal(name) {
    try {
      return globalThis[name];
    } catch (error) {
      return undefined;
    }
  }

  // ---------- Atmospheric composition / molar mass ----------
  const MOLECULAR_WEIGHT_G_PER_MOL = {
    carbonDioxide: 44.0095,
    oxygen: 31.998,
    inertGas: 28.014,            // treated as N2
    atmosphericWater: 18.01528,
    atmosphericMethane: 16.043,
    atmosphericAmmonia: 17.031,
    hydrogen: 2.016,
    greenhouseGas: 146.06,       // SF6 (your “safe GHG”)
    sulfuricAcid: 98.079,
    calciteAerosol: 100.0869
  };

  const MW_H2O_G = MOLECULAR_WEIGHT_G_PER_MOL.atmosphericWater;

  function getAtmosphericMassBreakdownTons(atmosphericResources) {
    const byKey = {};
    let totalTons = 0;

    if (!atmosphericResources) {
      return { totalTons: 0, byKey };
    }

    for (const key of Object.keys(atmosphericResources)) {
      const tons = extractTons(atmosphericResources[key]);
      if (tons > 0) {
        byKey[key] = tons;
        totalTons += tons;
      }
    }

    return { totalTons, byKey };
  }

  function estimateMeanMolecularWeightGmol(atmosphericResources, excludeKeysSet) {
    const { totalTons, byKey } = getAtmosphericMassBreakdownTons(atmosphericResources);
    if (totalTons <= 0) return 0;

    // Convert: 1 ton = 1e6 grams.
    let totalMassG = 0;
    let totalMoles = 0;

    for (const [key, tons] of Object.entries(byKey)) {
      if (excludeKeysSet && excludeKeysSet.has(key)) continue;
      const mw = MOLECULAR_WEIGHT_G_PER_MOL[key] ?? MOLECULAR_WEIGHT_G_PER_MOL.inertGas;
      const massG = tons * 1e6;
      totalMassG += massG;
      totalMoles += massG / mw;
    }

    if (totalMoles <= 0) return 0;
    return totalMassG / totalMoles;
  }

  function fadeSF6Fraction(zMeters, zHomopauseMeters, scaleHeightMeters) {
    if (!(zMeters > zHomopauseMeters)) return 1;
    const dz = zMeters - zHomopauseMeters;
    const H = scaleHeightMeters > 0 ? scaleHeightMeters : 1;
    return Math.exp(-dz / H);
  }

  function estimateMoleFractions(atmosphericResources) {
    // Returns mole fractions by key (sums to 1), based on mass inventory.
    const { totalTons, byKey } = getAtmosphericMassBreakdownTons(atmosphericResources);
    if (totalTons <= 0) return { totalMoles: 0, byKey: {}, xByKey: {} };

    let totalMoles = 0;
    const molesByKey = {};
    for (const [key, tons] of Object.entries(byKey)) {
      const mw = MOLECULAR_WEIGHT_G_PER_MOL[key] ?? MOLECULAR_WEIGHT_G_PER_MOL.inertGas;
      const massG = tons * 1e6;
      const moles = massG / mw;
      if (moles > 0) {
        molesByKey[key] = moles;
        totalMoles += moles;
      }
    }
    const xByKey = {};
    if (totalMoles > 0) {
      for (const [key, moles] of Object.entries(molesByKey)) {
        xByKey[key] = moles / totalMoles;
      }
    }
    return { totalMoles, byKey, xByKey };
  }

  function getMassFractions(atmosphericResources, excludeKeysSet) {
    const { totalTons, byKey } = getAtmosphericMassBreakdownTons(atmosphericResources);
    let total = totalTons > 0 ? totalTons : 0;

    if (excludeKeysSet) {
      total = 0;
      for (const [k, v] of Object.entries(byKey)) {
        if (excludeKeysSet.has(k)) continue;
        total += v;
      }
    }

    const getFrac = (key) => {
      if (!(total > 0)) return 0;
      const v = byKey[key] || 0;
      if (excludeKeysSet && excludeKeysSet.has(key)) return 0;
      return v / total;
    };

    return {
      totalTons: total,
      co2: getFrac('carbonDioxide'),
      ch4: getFrac('atmosphericMethane'),
      h2: getFrac('hydrogen'),
      h2o: getFrac('atmosphericWater'),
      so4: getFrac('sulfuricAcid'),
      sf6: getFrac('greenhouseGas')
    };
  }

  // ---------- Planet / state accessors ----------
  function getTerraformingState(explicitTerraforming) {
    return explicitTerraforming || getGlobal('terraforming') || null;
  }

  function getResources(terraforming) {
    // Prefer terraforming.resources, fall back to global resources.
    return terraforming?.resources || getGlobal('resources') || null;
  }

  function getCelestialParameters(terraforming) {
    return terraforming?.celestialParameters
      || getGlobal('currentPlanetParameters')?.celestialParameters
      || {};
  }

  function getPlanetRadiusMeters(celestialParameters) {
    const radiusKm = celestialParameters?.radius;
    return isFiniteNumber(radiusKm) && radiusKm > 0 ? radiusKm * 1000 : 6371000;
  }

  function getSurfaceAreaM2(celestialParameters) {
    const area = celestialParameters?.surfaceArea;
    if (isFiniteNumber(area) && area > 0) return area;
    const r = getPlanetRadiusMeters(celestialParameters);
    return 4 * Math.PI * r * r;
  }

  function getSurfaceGravity(celestialParameters) {
    const g = celestialParameters?.gravity;
    return isFiniteNumber(g) && g > 0 ? g : 9.81;
  }

  function getSurfaceTemperatureK(terraforming) {
    const t = terraforming?.temperature?.value;
    if (isFiniteNumber(t) && t > 0) return t;

    // Fallback: try currentPlanetParameters zonalTemperatures mean.
    const zones = getGlobal('currentPlanetParameters')?.zonalTemperatures;
    if (zones && typeof zones === 'object') {
      const temps = [];
      for (const zoneKey of Object.keys(zones)) {
        const v = zones[zoneKey]?.value;
        if (isFiniteNumber(v) && v > 0) temps.push(v);
      }
      if (temps.length) {
        const sum = temps.reduce((a, b) => a + b, 0);
        return sum / temps.length;
      }
    }

    return 288.15;
  }

  function getSolarFluxWm2(terraforming, celestialParameters) {
    // Prefer unpenalized modified flux (mirrors/lanterns included, clouds/haze penalty excluded).
    const unpenalized = terraforming?.luminosity?.modifiedSolarFluxUnpenalized;
    if (isFiniteNumber(unpenalized) && unpenalized > 0) return unpenalized;

    // Next: base orbital flux.
    const base = terraforming?.luminosity?.solarFlux;
    if (isFiniteNumber(base) && base > 0) return base;

    // Fallback: scale from Earth constant using AU + starLuminosity (in solar units).
    const dAu = celestialParameters?.distanceFromSun;
    const L = celestialParameters?.starLuminosity;
    const d = isFiniteNumber(dAu) && dAu > 0 ? dAu : 1;
    const lum = isFiniteNumber(L) && L > 0 ? L : 1;
    return SOLAR_FLUX_EARTH * lum / (d * d);
  }

  function getTotalAtmosphericMassKg(resources) {
    const atmospheric = resources?.atmospheric;
    if (!atmospheric) return 0;
    let totalTons = 0;
    for (const key of Object.keys(atmospheric)) {
      totalTons += extractTons(atmospheric[key]);
    }
    return Math.max(0, totalTons) * 1000;
  }

  function getSurfacePressurePaWithSource(terraforming, resources, celestialParameters) {
    // Best: use terraforming's own pressure calc if available.
    if (terraforming && typeof terraforming.calculateTotalPressure === 'function') {
      const kPa = terraforming.calculateTotalPressure();
      if (isFiniteNumber(kPa) && kPa >= 0) return { pressurePa: kPa * 1000, source: 'terraforming' };
    }

    // Next: use atmospheric-utils if it was loaded and exposed globally.
    const getTotalSurfacePressureKPa = getGlobal('getTotalSurfacePressureKPa');
    if (typeof getTotalSurfacePressureKPa === 'function') {
      const kPa = getTotalSurfacePressureKPa(resources?.atmospheric, celestialParameters?.gravity, celestialParameters?.radius);
      if (isFiniteNumber(kPa) && kPa >= 0) return { pressurePa: kPa * 1000, source: 'atmospheric-utils' };
    }

    // Fallback: P = (totalMass * g) / surfaceArea.
    const totalMassKg = getTotalAtmosphericMassKg(resources);
    const g = getSurfaceGravity(celestialParameters);
    const area = getSurfaceAreaM2(celestialParameters);
    if (!(area > 0) || !(g > 0) || !(totalMassKg > 0)) return { pressurePa: 0, source: 'none' };
    return { pressurePa: (totalMassKg * g) / area, source: 'mass' };
  }

  // ---------- Water vapor: saturation + cold-trap (cheap) ----------
  function saturationVaporPressurePa(Tk) {
    // Magnus-Tetens style approximation.
    // Good enough for gameplay; we mostly need “drops off a cliff when cold” behavior.
    const T = clamp(Tk, 60, 400);
    const Tc = T - 273.15;

    // Over liquid water vs over ice.
    if (Tc >= 0) {
      const a = 17.625;
      const b = 243.04;
      return 610.94 * Math.exp((a * Tc) / (Tc + b));
    } else {
      const a = 22.587;
      const b = 273.86;
      return 610.94 * Math.exp((a * Tc) / (Tc + b));
    }
  }

  function clampPartialPressure(pa, totalPa) {
    if (!(pa > 0)) return 0;
    if (!(totalPa > 0)) return pa;
    return clamp(pa, 0, totalPa);
  }

  // ---------- Temperature heuristics ----------
  function estimateColdPointTemperatureK(surfaceTemperatureK, co2MassFraction, surfacePressurePa) {
    const pBar = surfacePressurePa / 1e5;

    let T = 160 + 0.18 * (surfaceTemperatureK - 200);
    const co2 = clamp(co2MassFraction, 0, 1);
    const cool = 1 + 0.35 * co2 * safeLog10(1 + pBar);
    T = T / cool;

    return clamp(T, 90, 220);
  }

  function estimateExosphereTemperatureK(solarFluxWm2, surfaceTemperatureK, co2MassFraction, ch4MassFraction, surfacePressurePa, meanMolecularWeightGmol) {
    const pBar = surfacePressurePa / 1e5;
    const s = Math.max(0, solarFluxWm2);
    const sRatio = s / SOLAR_FLUX_EARTH;

    const co2 = clamp(co2MassFraction, 0, 1);
    const ch4 = clamp(ch4MassFraction, 0, 1);
    const isCO2Dominant = (co2 > 0.5) || (meanMolecularWeightGmol > 36);

    let T;
    if (isCO2Dominant) {
      T = 180 + 160 * Math.sqrt(Math.max(sRatio, 0));
      T *= 1 / (1 + 0.2 * safeLog10(1 + pBar));
      T += 0.01 * (surfaceTemperatureK - 250);
    } else {
      T = 150 + 1300 * (s / (s + 700));
      T *= 1 / (1 + 2.0 * ch4);
      T += 0.02 * (surfaceTemperatureK - 250);
    }

    return clamp(T, 60, 2000);
  }

  // ---------- Exobase height estimate ----------
  function estimateExobaseHeightMeters(options) {
    const {
      totalMassKg,
      surfaceAreaM2,
      gravity,
      meanMolecularWeightGmol,
      exobaseTemperatureK,
      collisionSigmaM2
    } = options;

    if (!(totalMassKg > 0) || !(surfaceAreaM2 > 0) || !(gravity > 0) || !(meanMolecularWeightGmol > 0) || !(exobaseTemperatureK > 0)) {
      return 0;
    }

    const sigma = isFiniteNumber(collisionSigmaM2) && collisionSigmaM2 > 0
      ? collisionSigmaM2
      : DEFAULT_COLLISION_SIGMA_M2;

    const particleMassKg = (meanMolecularWeightGmol / 1000) / AVOGADRO;
    const scaleHeight = (BOLTZMANN * exobaseTemperatureK) / (particleMassKg * gravity);

    const columnNumberPerM2 = totalMassKg / (surfaceAreaM2 * particleMassKg);
    const logTerm = columnNumberPerM2 * sigma;
    if (!(logTerm > 1)) return 0;

    const logValue = Math.log(clamp(logTerm, 1 + 1e-12, 1e40));
    return clamp(scaleHeight * logValue, 0, 5_000_000);
  }

  // ---------- Hydrostatic integration with inverse-square gravity (analytic) ----------
  function pressureRatioBetweenRadii(rStart, rEnd, molarMassKgPerMol, GM, temperatureK) {
    if (!(rStart > 0) || !(rEnd > 0) || !(temperatureK > 0) || !(molarMassKgPerMol > 0) || !(GM > 0)) {
      return 1;
    }
    const K = (molarMassKgPerMol * GM) / (R_UNIVERSAL * temperatureK);
    const exponent = -K * (1 / rStart - 1 / rEnd);
    if (!isFiniteNumber(exponent)) {
      return exponent < 0 ? 0 : 1;
    }
    return Math.exp(exponent);
  }

  // ---------- Model builder ----------
  class AtmosphericDensityModel {
    constructor(inputs, options = {}) {
      this._inputs = inputs;
      this._options = options;

      this._altitudeCacheStepMeters = isFiniteNumber(options.altitudeCacheStepMeters)
        ? Math.max(1, options.altitudeCacheStepMeters)
        : 1000;

      this._altitudeCache = new Map();

      // Water options
      this._enableWaterCondensation = (options.enableWaterCondensation !== false);
      this._RH = clamp(isFiniteNumber(options.relativeHumidity) ? options.relativeHumidity : 0.7, 0, 1);
      this._RHColdTrap = clamp(isFiniteNumber(options.coldTrapRelativeHumidity) ? options.coldTrapRelativeHumidity : 0.1, 0, 1);

      this._buildLayers();
    }

    _buildLayers() {
      const {
        planetRadiusM,
        gravity,
        surfacePressurePa,
        surfacePressureSource,
        surfaceTemperatureK,
        solarFluxWm2,
      meanMolecularWeightGmol,
      meanMolecularWeightDryGmol,
      meanMolecularWeightDryNoSF6Gmol,
      massFractions,
      massFractionsDry,
      xH2O_inventory,
      totalAtmosphericMassKg,
      surfaceAreaM2,
        collisionSigmaM2
      } = this._inputs;

      this._debug = {
        planetRadiusM,
        gravity,
        surfacePressurePa,
        surfacePressureSource,
        surfaceTemperatureK,
        solarFluxWm2,
        meanMolecularWeightGmol,
        meanMolecularWeightDryGmol,
        meanMolecularWeightDryNoSF6Gmol,
        massFractions: { ...massFractions },
        massFractionsDry: { ...massFractionsDry },
        xH2O_inventory,
        totalAtmosphericMassKg,
        surfaceAreaM2,
        collisionSigmaM2,
        waterOptions: {
          enableWaterCondensation: this._enableWaterCondensation,
          relativeHumidity: this._RH,
          coldTrapRelativeHumidity: this._RHColdTrap
        }
      };

      // Handle vacuum quickly.
      if (!(surfacePressurePa > 0) || !(meanMolecularWeightDryGmol > 0) || !(surfaceTemperatureK > 0)) {
        this._layers = [];
        this._debug.vacuum = true;
        return;
      }

      // --- temperatures (use DRY fractions for CO2/CH4 heuristics) ---
      const Tcold = estimateColdPointTemperatureK(surfaceTemperatureK, massFractionsDry.co2, surfacePressurePa);
      const Texo = estimateExosphereTemperatureK(
        solarFluxWm2,
        surfaceTemperatureK,
        massFractionsDry.co2,
        massFractionsDry.ch4,
        surfacePressurePa,
        meanMolecularWeightDryGmol
      );

      const Tlower = clamp(0.6 * surfaceTemperatureK + 0.4 * Tcold, 60, 800);

      const columnMassKgPerM2 = (totalAtmosphericMassKg > 0 && surfaceAreaM2 > 0)
        ? totalAtmosphericMassKg / surfaceAreaM2
        : (surfacePressurePa / gravity);

      const blend = columnMassKgPerM2 / (columnMassKgPerM2 + 2000);
      const Texobase = Tlower + (Texo - Tlower) * blend;

      const zExo = estimateExobaseHeightMeters({
        totalMassKg: totalAtmosphericMassKg,
        surfaceAreaM2,
        gravity,
        meanMolecularWeightGmol: meanMolecularWeightDryGmol,
        exobaseTemperatureK: Texobase,
        collisionSigmaM2
      });

      const M0dry = meanMolecularWeightDryGmol / 1000;
      const Hsurf = (R_UNIVERSAL * surfaceTemperatureK) / (M0dry * gravity);

      const z1Base = clamp(5 * Hsurf, 25_000, 120_000);
      const z2Base = clamp(12 * Hsurf, z1Base + 10_000, 250_000);

      const zExoSafe = zExo > 0 ? zExo : Math.max(200_000, 30 * Hsurf);
      const z1 = clamp(Math.min(z1Base, 0.35 * zExoSafe), 0, 0.6 * zExoSafe);
      const z2 = clamp(Math.min(z2Base, 0.70 * zExoSafe), z1 + 5_000, 0.85 * zExoSafe);
      let z3 = Math.max(z2 + 10_000, 0.60 * zExoSafe);
      z3 = clamp(z3, z2 + 1_000, zExoSafe - 5_000);
      const z4 = zExoSafe;

      const Tthermo = Tcold + 0.9 * (Texo - Tcold);

      // Upper-atmosphere molar mass reduction for DRY air.
      const meanDryNoSF6 = meanMolecularWeightDryNoSF6Gmol > 0
        ? meanMolecularWeightDryNoSF6Gmol
        : meanMolecularWeightDryGmol;

      let MUpperG;
      if (meanDryNoSF6 > 40 || massFractionsDry.co2 > 0.5) {
        MUpperG = clamp(meanDryNoSF6 * 0.60, 16, 32);
      } else {
        MUpperG = clamp(meanDryNoSF6 * 0.42, 4, 28);
      }
      if (massFractionsDry.h2 > 0.05) {
        MUpperG = Math.max(2.5, MUpperG * 0.7);
      }
      const MTransG = 0.5 * (meanDryNoSF6 + MUpperG);

      const GM = gravity * planetRadiusM * planetRadiusM;

      // ---- Water vapor at surface (inventory-derived) ----
      const pH2O_raw0 = clampPartialPressure(xH2O_inventory * surfacePressurePa, surfacePressurePa);
      const eSat0 = saturationVaporPressurePa(surfaceTemperatureK);
      const pH2O_sat0 = clampPartialPressure(this._RH * eSat0, surfacePressurePa);

      let pH2O0 = pH2O_raw0;
      let pSurfaceEffective = surfacePressurePa;
      let appliedSurfaceCondensation = 0;

      if (this._enableWaterCondensation) {
        pH2O0 = Math.min(pH2O_raw0, pH2O_sat0);

        const opt = this._options || {};
        const adjustOpt = opt.adjustSurfacePressureForWaterCondensation;
        const shouldAutoAdjust = (surfacePressureSource !== 'terraforming');
        const shouldAdjust = (adjustOpt === true) || (adjustOpt === undefined && shouldAutoAdjust);

        if (shouldAdjust) {
          const excess = Math.max(0, pH2O_raw0 - pH2O0);
          pSurfaceEffective = Math.max(0, surfacePressurePa - excess);
          appliedSurfaceCondensation = excess;
        }
      }

      const pDry0 = Math.max(0, pSurfaceEffective - pH2O0);

      this._debug.waterSurface = {
        xH2O_inventory,
        eSat0Pa: eSat0,
        pH2O_raw0Pa: pH2O_raw0,
        pH2O_capped0Pa: pH2O0,
        pDry0Pa: pDry0,
        pSurfaceEffectivePa: pSurfaceEffective,
        appliedSurfaceCondensationPa: appliedSurfaceCondensation
      };

      this._pSurfaceEffective = pSurfaceEffective;
      this._pDry0 = pDry0;
      this._pH2O0 = pH2O0;
      this._coldTrapZ = z2;
      this._coldTrapTempK = Tcold;
      this._pColdTrapCap = this._enableWaterCondensation
        ? (this._RHColdTrap * saturationVaporPressurePa(Tcold))
        : Infinity;

      const sf6Fraction = clamp(massFractionsDry.sf6 || 0, 0, 1);
      const zHomopause = z1;
      const sf6ScaleHeight = Math.max(1, Hsurf);

      const adjustDryMolarMassAt = (zMeters) => {
        if (!(sf6Fraction > 0)) return meanMolecularWeightDryGmol;
        const mixFactor = fadeSF6Fraction(zMeters, zHomopause, sf6ScaleHeight);
        return meanDryNoSF6 + (meanMolecularWeightDryGmol - meanDryNoSF6) * mixFactor;
      };

      // Build layers for DRY pressure profile.
      this._layers = [
        { name: 'lower', zStart: 0,  zEnd: z1, T: Tlower,  molarMassDryG: adjustDryMolarMassAt(0.5 * z1) },
        { name: 'cold',  zStart: z1, zEnd: z2, T: Tcold,   molarMassDryG: adjustDryMolarMassAt(0.5 * (z1 + z2)) },
        { name: 'thermo',zStart: z2, zEnd: z3, T: Tthermo, molarMassDryG: adjustDryMolarMassAt(0.5 * (z2 + z3)) },
        { name: 'upper', zStart: z3, zEnd: z4, T: Texo,    molarMassDryG: adjustDryMolarMassAt(0.5 * (z3 + z4)) },
        { name: 'exo',   zStart: z4, zEnd: Infinity, T: Texo, molarMassDryG: adjustDryMolarMassAt(z4 + sf6ScaleHeight) }
      ];

      // Compute DRY pressure at each layer start.
      let Pdry = pDry0;
      this._layers[0].PdryStart = Pdry;

      for (let i = 0; i < this._layers.length; i += 1) {
        const layer = this._layers[i];
        if (i > 0) {
          layer.PdryStart = Pdry;
        }
        if (!isFiniteNumber(layer.zEnd)) {
          continue;
        }
        const rStart = planetRadiusM + layer.zStart;
        const rEnd = planetRadiusM + layer.zEnd;
        const Mkg = (layer.molarMassDryG / 1000);
        const ratio = pressureRatioBetweenRadii(rStart, rEnd, Mkg, GM, layer.T);
        Pdry = Pdry * ratio;
      }

      this._debug.temperaturesK = { lower: Tlower, cold: Tcold, thermo: Tthermo, exo: Texo, exobase: Texobase };
      this._debug.molarMassG = { surfaceDry: meanMolecularWeightDryGmol, transitionDry: MTransG, upperDry: MUpperG, dryNoSF6: meanDryNoSF6 };
      this._debug.heightsM = { z1, z2, z3, z4, exobase: zExoSafe, coldTrapZ: this._coldTrapZ };
      this._debug.surfaceScaleHeightM = Hsurf;
      this._debug.columnMassKgPerM2 = columnMassKgPerM2;
      this._debug.waterAloft = { coldTrapCapPa: this._pColdTrapCap };
      this._debug.sf6 = { fraction: sf6Fraction, homopauseM: zHomopause, scaleHeightM: sf6ScaleHeight };
    }

    _findLayerIndex(zMeters) {
      const layers = this._layers;
      if (!layers || layers.length === 0) return -1;
      for (let i = 0; i < layers.length; i += 1) {
        const L = layers[i];
        if (zMeters >= L.zStart && (zMeters < L.zEnd || !isFiniteNumber(L.zEnd))) {
          return i;
        }
      }
      return layers.length - 1;
    }

    _computeDryPressureAt(zMeters, layerIdx) {
      const layers = this._layers;
      const { planetRadiusM, gravity } = this._inputs;
      const layer = layers[layerIdx];

      const rStart = planetRadiusM + layer.zStart;
      const rZ = planetRadiusM + zMeters;
      const Mkg = layer.molarMassDryG / 1000;

      const GM = gravity * planetRadiusM * planetRadiusM;
      const ratio = pressureRatioBetweenRadii(rStart, rZ, Mkg, GM, layer.T);
      return layer.PdryStart * ratio;
    }

    _computeWaterVaporPressureAt(zMeters, Pdry, layerT) {
      // Cheap condensable model:
      // - Constant mixing ratio relative to DRY air up to cold trap.
      // - Local saturation cap (RH * e_sat(T)).
      // - Above cold trap, cap to cold-trap value (RHColdTrap * e_sat(Tcold)).
      if (!this._enableWaterCondensation) {
        if (!(this._pDry0 > 0) || !(this._pH2O0 > 0)) return 0;
        const scaled = this._pH2O0 * (Pdry / this._pDry0);
        return clampPartialPressure(scaled, Pdry + scaled);
      }

      if (!(this._pDry0 > 0) || !(this._pH2O0 > 0) || !(Pdry > 0)) return 0;

      const pRaw = this._pH2O0 * (Pdry / this._pDry0);
      const pSatLocal = this._RH * saturationVaporPressurePa(layerT);
      let p = Math.min(pRaw, pSatLocal);

      if (zMeters >= this._coldTrapZ) {
        p = Math.min(p, this._pColdTrapCap);
      }

      return clampPartialPressure(p, Pdry + pRaw);
    }

    _computeDensityAtAltitude(zMeters) {
      const layers = this._layers;
      if (!layers || layers.length === 0) return 0;

      const surfaceT = this._inputs.surfaceTemperatureK;

      // z <= 0: use surface effective dry + capped vapor.
      if (!(zMeters > 0)) {
        const Pdry0 = this._pDry0;
        const pH2O0 = this._pH2O0;
        const P0 = Pdry0 + pH2O0;
        if (!(P0 > 0) || !(surfaceT > 0)) return 0;

        const Mdry = this._inputs.meanMolecularWeightDryGmol / 1000;
        const Mh2o = MW_H2O_G / 1000;
        const Mmix = (Pdry0 * Mdry + pH2O0 * Mh2o) / P0;

        return (P0 * Mmix) / (R_UNIVERSAL * surfaceT);
      }

      const idx = this._findLayerIndex(zMeters);
      if (idx < 0) return 0;

      const layer = layers[idx];
      const Pdry = this._computeDryPressureAt(zMeters, idx);
      if (!(Pdry > 0)) return 0;

      const pH2O = this._computeWaterVaporPressureAt(zMeters, Pdry, layer.T);
      const P = Pdry + pH2O;
      if (!(P > 0)) return 0;

      const Mdry = layer.molarMassDryG / 1000;
      const Mh2o = MW_H2O_G / 1000;
      const Mmix = (Pdry * Mdry + pH2O * Mh2o) / P;

      return (P * Mmix) / (R_UNIVERSAL * layer.T);
    }

    getDensity(altitudeMeters) {
      const z = isFiniteNumber(altitudeMeters) ? altitudeMeters : 0;
      const step = this._altitudeCacheStepMeters;
      const key = Math.round(z / step) * step;
      const cached = this._altitudeCache.get(key);
      if (cached !== undefined) return cached;
      const rho = this._computeDensityAtAltitude(key);
      this._altitudeCache.set(key, rho);
      return rho;
    }

    getDensities(altitudeMetersArray) {
      if (!Array.isArray(altitudeMetersArray)) return [];
      const out = new Array(altitudeMetersArray.length);
      for (let i = 0; i < altitudeMetersArray.length; i += 1) {
        out[i] = this.getDensity(altitudeMetersArray[i]);
      }
      return out;
    }

    clearAltitudeCache() {
      this._altitudeCache.clear();
    }

    getDebug() {
      return { ...this._debug };
    }
  }

  // ---------- Model caching (per terraforming instance) ----------
  const _MODEL_CACHE = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;

  function buildModelSignature(inputs, options) {
    const pKey = Math.round((inputs.surfacePressurePa || 0) / 50);
    const tKey = Math.round(inputs.surfaceTemperatureK || 0);
    const mwKey = Math.round((inputs.meanMolecularWeightDryGmol || 0) * 10) / 10;
    const sKey = Math.round(inputs.solarFluxWm2 || 0);
    const gKey = Math.round((inputs.gravity || 0) * 1000) / 1000;
    const rKey = Math.round(inputs.planetRadiusM || 0);
    const mKey = Math.round((inputs.totalAtmosphericMassKg || 0) / 1e9);

    const co2Key = Math.round((inputs.massFractionsDry?.co2 || 0) * 1000) / 1000;
    const ch4Key = Math.round((inputs.massFractionsDry?.ch4 || 0) * 1000) / 1000;
    const h2oKey = Math.round((inputs.xH2O_inventory || 0) * 10000) / 10000;

    const rhKey = Math.round((isFiniteNumber(options?.relativeHumidity) ? options.relativeHumidity : 0.7) * 100) / 100;
    const rhcKey = Math.round((isFiniteNumber(options?.coldTrapRelativeHumidity) ? options.coldTrapRelativeHumidity : 0.1) * 100) / 100;
    const wcKey = (options?.enableWaterCondensation === false) ? 0 : 1;
    const adjKey = (options?.adjustSurfacePressureForWaterCondensation === true) ? 2
      : (options?.adjustSurfacePressureForWaterCondensation === false) ? 0
      : 1;

    const srcKey = inputs.surfacePressureSource || 'none';

    return `${pKey}|${tKey}|${mwKey}|${sKey}|${gKey}|${rKey}|${mKey}|${co2Key}|${ch4Key}|${h2oKey}|${rhKey}|${rhcKey}|${wcKey}|${adjKey}|${srcKey}`;
  }

  function buildDensityInputs(terraforming, options = {}) {
    const resources = getResources(terraforming);
    const celestial = getCelestialParameters(terraforming);

    const planetRadiusM = getPlanetRadiusMeters(celestial);
    const surfaceAreaM2 = getSurfaceAreaM2(celestial);
    const gravity = getSurfaceGravity(celestial);

    const surfaceTemperatureK = getSurfaceTemperatureK(terraforming);
    const solarFluxWm2 = getSolarFluxWm2(terraforming, celestial);

    const totalAtmosphericMassKg = getTotalAtmosphericMassKg(resources);

    const pObj = getSurfacePressurePaWithSource(terraforming, resources, celestial);
    const surfacePressurePa = pObj.pressurePa;
    const surfacePressureSource = pObj.source;

    const atmospheric = resources?.atmospheric;

    const meanMolecularWeightGmol = estimateMeanMolecularWeightGmol(atmospheric);

    const excludeWater = new Set(['atmosphericWater']);
    const meanMolecularWeightDryGmol = estimateMeanMolecularWeightGmol(atmospheric, excludeWater) || meanMolecularWeightGmol;
    const excludeWaterAndSF6 = new Set(['atmosphericWater', 'greenhouseGas']);
    const meanMolecularWeightDryNoSF6Gmol = estimateMeanMolecularWeightGmol(atmospheric, excludeWaterAndSF6) || meanMolecularWeightDryGmol;

    const massFractions = getMassFractions(atmospheric);
    const massFractionsDry = getMassFractions(atmospheric, excludeWater);

    const mole = estimateMoleFractions(atmospheric);
    const xH2O_inventory = clamp(mole.xByKey?.atmosphericWater || 0, 0, 1);

    const collisionSigmaM2 = isFiniteNumber(options.collisionSigmaM2)
      ? options.collisionSigmaM2
      : DEFAULT_COLLISION_SIGMA_M2;

    return {
      planetRadiusM,
      surfaceAreaM2,
      gravity,
      surfacePressurePa,
      surfacePressureSource,
      surfaceTemperatureK,
      solarFluxWm2,
      totalAtmosphericMassKg,
      meanMolecularWeightGmol,
      meanMolecularWeightDryGmol,
      meanMolecularWeightDryNoSF6Gmol,
      massFractions,
      massFractionsDry,
      xH2O_inventory,
      collisionSigmaM2
    };
  }

  function getAtmosphericDensityModel(explicitTerraforming, options = {}) {
    const terraforming = getTerraformingState(explicitTerraforming);

    const cacheKey = terraforming || getGlobal('currentPlanetParameters') || getGlobal('resources') || {};

    const inputs = buildDensityInputs(terraforming, options);
    const signature = buildModelSignature(inputs, options);

    if (_MODEL_CACHE) {
      const cached = _MODEL_CACHE.get(cacheKey);
      if (cached && cached.signature === signature) {
        return cached.model;
      }
      const model = new AtmosphericDensityModel(inputs, options);
      _MODEL_CACHE.set(cacheKey, { signature, model });
      return model;
    }

    return new AtmosphericDensityModel(inputs, options);
  }

  // ---------- Convenience functions (single/batch) ----------
  function estimateAtmosphericDensityKgPerM3(altitudeMeters, explicitTerraforming, options = {}) {
    const model = getAtmosphericDensityModel(explicitTerraforming, options);
    return model.getDensity(altitudeMeters);
  }

  function estimateAtmosphericDensitiesKgPerM3(altitudeMetersArray, explicitTerraforming, options = {}) {
    const model = getAtmosphericDensityModel(explicitTerraforming, options);
    return model.getDensities(altitudeMetersArray);
  }

  // ---------- Exports / globals ----------
  try {
    window.getAtmosphericDensityModel = getAtmosphericDensityModel;
    window.estimateAtmosphericDensityKgPerM3 = estimateAtmosphericDensityKgPerM3;
    window.estimateAtmosphericDensitiesKgPerM3 = estimateAtmosphericDensitiesKgPerM3;
  } catch (error) {
    // ignore
  }

  try {
    if (isNode) {
      module.exports = {
        AtmosphericDensityModel,
        getAtmosphericDensityModel,
        estimateAtmosphericDensityKgPerM3,
        estimateAtmosphericDensitiesKgPerM3,
        _internals: {
          estimateMeanMolecularWeightGmol,
          estimateColdPointTemperatureK,
          estimateExosphereTemperatureK,
          estimateExobaseHeightMeters,
          saturationVaporPressurePa
        }
      };
    }
  } catch (error) {
    // ignore
  }
})();
