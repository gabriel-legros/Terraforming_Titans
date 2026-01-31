
/*
  atmospheric-density.js  (v2)

  Purpose
  -------
  Game-friendly estimate of average atmospheric density (kg/m^3) versus
  altitude, based on:
  - atmospheric mass by species (resources.atmospheric.*.value)
  - surface temperature (terraforming.temperature.value)
  - surface gravity + radius (terraforming.celestialParameters)
  - solar flux / luminosity (terraforming.luminosity.*)

  This is NOT a full scientific atmosphere model. It is a hydrostatic +
  ideal-gas approximation with a few isothermal layers, plus heuristics
  for thermosphere/exosphere temperature.

  v2 fixes two common “puffy low‑g” failure modes in v1:
  1) Layer boundary clamps were Earth-centric (e.g. z2 <= 250 km). On low-g
     worlds the *scale height is larger*, so those clamps forced the hot
     thermosphere to begin at too-high pressure, producing unrealistically
     large densities at 500–2000 km.
     -> v2 places boundaries mainly in *multiples of the surface scale height*,
        only clamped against the estimated exobase.
  2) A purely hydrostatic isothermal exosphere with inverse-square gravity
     has a non-zero asymptote as r -> infinity (Boltzmann in a finite potential).
     -> v2 uses a constant-g "escape tail" above the exobase that always decays
        to ~0, with an optional Jeans-parameter-based tightening on very low-g
        / light-gas cases.

  API (unchanged)
  ---------------
  - estimateAtmosphericDensityKgPerM3(altitudeMeters, terraforming?, options?) -> number
  - estimateAtmosphericDensitiesKgPerM3(altitudeMetersArray, terraforming?, options?) -> number[]
  - getAtmosphericDensityModel(terraforming?, options?) -> model
      model.getDensity(altitudeMeters) -> number
      model.getDensities(altitudeMetersArray) -> number[]
      model.getDebug() -> object

  Options (new, all optional)
  ---------------------------
  - altitudeCacheStepMeters (default 1000)
  - treatHeavyTraceAsLowerAtmosphere (default true)  // as before
  - collisionSigmaM2 (default 2e-19)
  - enableEscapeTail (default true)                  // use constant-g exosphere that decays to zero
  - jeansLambdaTarget (default 30)                   // lower => puffier; higher => tighter upper tail
  - minEscapeScaleFactor (default 0.02)              // minimum multiplier on exosphere scale height
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

  // Heavy / aerosol / trace species that should not control upper-atmosphere scale height.
  const HEAVY_TRACE_KEYS = ['greenhouseGas', 'sulfuricAcid', 'calciteAerosol'];

  function getAtmosphericMassBreakdownTons(atmosphericResources) {
    const byKey = {};
    let totalTons = 0;

    if (!atmosphericResources) return { totalTons: 0, byKey };

    for (const key of Object.keys(atmosphericResources)) {
      const tons = extractTons(atmosphericResources[key]);
      if (tons > 0) {
        byKey[key] = tons;
        totalTons += tons;
      }
    }

    return { totalTons, byKey };
  }

  function estimateMeanMolecularWeightGmol(atmosphericResources) {
    const { totalTons, byKey } = getAtmosphericMassBreakdownTons(atmosphericResources);
    if (totalTons <= 0) return 0;

    // 1 ton = 1e6 grams
    let totalMassG = 0;
    let totalMoles = 0;

    for (const [key, tons] of Object.entries(byKey)) {
      const mw = MOLECULAR_WEIGHT_G_PER_MOL[key] ?? MOLECULAR_WEIGHT_G_PER_MOL.inertGas;
      const massG = tons * 1e6;
      totalMassG += massG;
      totalMoles += massG / mw;
    }

    if (totalMoles <= 0) return 0;
    return totalMassG / totalMoles;
  }

  function estimateMeanMolecularWeightGmolExcluding(atmosphericResources, excludedKeys) {
    const excluded = new Set(Array.isArray(excludedKeys) ? excludedKeys : []);
    const { totalTons, byKey } = getAtmosphericMassBreakdownTons(atmosphericResources);
    if (totalTons <= 0) return 0;

    let totalMassG = 0;
    let totalMoles = 0;

    for (const [key, tons] of Object.entries(byKey)) {
      if (excluded.has(key)) continue;
      const mw = MOLECULAR_WEIGHT_G_PER_MOL[key] ?? MOLECULAR_WEIGHT_G_PER_MOL.inertGas;
      const massG = tons * 1e6;
      totalMassG += massG;
      totalMoles += massG / mw;
    }

    if (totalMoles <= 0) return 0;
    return totalMassG / totalMoles;
  }

  function getMassFractions(atmosphericResources) {
    const { totalTons, byKey } = getAtmosphericMassBreakdownTons(atmosphericResources);
    const total = totalTons > 0 ? totalTons : 0;
    const getFrac = (key) => (total > 0 ? (byKey[key] || 0) / total : 0);
    return {
      totalTons,
      co2: getFrac('carbonDioxide'),
      ch4: getFrac('atmosphericMethane'),
      h2: getFrac('hydrogen'),
      h2o: getFrac('atmosphericWater'),
      so4: getFrac('sulfuricAcid'),
      sf6: getFrac('greenhouseGas')
    };
  }

  function getMassFractionsExcludingKeys(atmosphericResources, excludedKeys) {
    const excluded = new Set(Array.isArray(excludedKeys) ? excludedKeys : []);
    const { totalTons, byKey } = getAtmosphericMassBreakdownTons(atmosphericResources);

    let total = 0;
    for (const [k, v] of Object.entries(byKey)) {
      if (!excluded.has(k) && v > 0) total += v;
    }
    const getFrac = (key) => (total > 0 ? ((excluded.has(key) ? 0 : (byKey[key] || 0)) / total) : 0);

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
    const unpenalized = terraforming?.luminosity?.modifiedSolarFluxUnpenalized;
    if (isFiniteNumber(unpenalized) && unpenalized > 0) return unpenalized;

    const base = terraforming?.luminosity?.solarFlux;
    if (isFiniteNumber(base) && base > 0) return base;

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
    // 1 (metric) ton = 1000 kg
    return Math.max(0, totalTons) * 1000;
  }

  function getSurfacePressurePa(terraforming, resources, celestialParameters) {
    if (terraforming && typeof terraforming.calculateTotalPressure === 'function') {
      const kPa = terraforming.calculateTotalPressure();
      if (isFiniteNumber(kPa) && kPa >= 0) return kPa * 1000;
    }

    const getTotalSurfacePressureKPa = getGlobal('getTotalSurfacePressureKPa');
    if (typeof getTotalSurfacePressureKPa === 'function') {
      const kPa = getTotalSurfacePressureKPa(resources?.atmospheric, celestialParameters?.gravity, celestialParameters?.radius);
      if (isFiniteNumber(kPa) && kPa >= 0) return kPa * 1000;
    }

    const totalMassKg = getTotalAtmosphericMassKg(resources);
    const g = getSurfaceGravity(celestialParameters);
    const area = getSurfaceAreaM2(celestialParameters);
    if (!(area > 0) || !(g > 0) || !(totalMassKg > 0)) return 0;
    return (totalMassKg * g) / area;
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
    // Still clamp hard to avoid pathological terraforming extremes.
    return clamp(scaleHeight * logValue, 0, 5_000_000);
  }

  // ---------- Hydrostatic pressure ratios ----------
  function pressureRatioInverseSquare(rStart, rEnd, molarMassKgPerMol, GM, temperatureK) {
    // P_end = P_start * exp(-(M*GM/(R*T)) * (1/rStart - 1/rEnd))
    if (!(rStart > 0) || !(rEnd > 0) || !(temperatureK > 0) || !(molarMassKgPerMol > 0) || !(GM > 0)) {
      return 1;
    }
    const K = (molarMassKgPerMol * GM) / (R_UNIVERSAL * temperatureK);
    const exponent = -K * (1 / rStart - 1 / rEnd);
    if (!isFiniteNumber(exponent)) return exponent < 0 ? 0 : 1;
    return Math.exp(exponent);
  }

  function pressureRatioConstantG(deltaZ, molarMassKgPerMol, gConst, temperatureK) {
    // P_end = P_start * exp(-(M*g*Δz)/(R*T))
    if (!(deltaZ >= 0) || !(temperatureK > 0) || !(molarMassKgPerMol > 0) || !(gConst > 0)) return 1;
    const exponent = -(molarMassKgPerMol * gConst * deltaZ) / (R_UNIVERSAL * temperatureK);
    if (!isFiniteNumber(exponent)) return exponent < 0 ? 0 : 1;
    return Math.exp(exponent);
  }

  function jeansLambda(GM, rMeters, molarMassKgPerMol, temperatureK) {
    // λ = GM*m/(k*T*r), m = M/Na
    if (!(GM > 0) || !(rMeters > 0) || !(molarMassKgPerMol > 0) || !(temperatureK > 0)) return 0;
    const mParticle = (molarMassKgPerMol / AVOGADRO);
    return (GM * mParticle) / (BOLTZMANN * temperatureK * rMeters);
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

      this._buildLayers();
    }

    _buildLayers() {
      const {
        planetRadiusM,
        gravity,
        surfacePressurePa,
        surfaceTemperatureK,
        solarFluxWm2,
        meanMolecularWeightGmol,
        meanMolecularWeightForHydrostaticsGmol,
        massFractions,
        massFractionsBulk,
        totalAtmosphericMassKg,
        surfaceAreaM2,
        collisionSigmaM2
      } = this._inputs;

      const enableEscapeTail = (this._options.enableEscapeTail !== false);
      const jeansLambdaTarget = isFiniteNumber(this._options.jeansLambdaTarget) ? this._options.jeansLambdaTarget : 30;
      const minEscapeScaleFactor = isFiniteNumber(this._options.minEscapeScaleFactor) ? this._options.minEscapeScaleFactor : 0.02;

      this._debug = {
        planetRadiusM,
        gravity,
        surfacePressurePa,
        surfaceTemperatureK,
        solarFluxWm2,
        meanMolecularWeightGmol,
        meanMolecularWeightForHydrostaticsGmol,
        massFractions: { ...massFractions },
        massFractionsBulk: { ...(massFractionsBulk || {}) },
        totalAtmosphericMassKg,
        surfaceAreaM2,
        collisionSigmaM2,
        options: {
          enableEscapeTail,
          jeansLambdaTarget,
          minEscapeScaleFactor,
          altitudeCacheStepMeters: this._altitudeCacheStepMeters
        }
      };

      if (!(surfacePressurePa > 0) || !(meanMolecularWeightGmol > 0) || !(surfaceTemperatureK > 0)) {
        this._layers = [];
        this._debug.vacuum = true;
        return;
      }

      const meanMW_Hydro_Gmol = (isFiniteNumber(meanMolecularWeightForHydrostaticsGmol) && meanMolecularWeightForHydrostaticsGmol > 0)
        ? meanMolecularWeightForHydrostaticsGmol
        : meanMolecularWeightGmol;

      const frac_Hydro = (massFractionsBulk && typeof massFractionsBulk === 'object')
        ? massFractionsBulk
        : massFractions;

      const Tcold = estimateColdPointTemperatureK(surfaceTemperatureK, frac_Hydro.co2, surfacePressurePa);
      const Texo = estimateExosphereTemperatureK(
        solarFluxWm2,
        surfaceTemperatureK,
        frac_Hydro.co2,
        frac_Hydro.ch4,
        surfacePressurePa,
        meanMW_Hydro_Gmol
      );

      const Tlower = clamp(0.6 * surfaceTemperatureK + 0.4 * Tcold, 60, 800);

      const columnMassKgPerM2 = (totalAtmosphericMassKg > 0 && surfaceAreaM2 > 0)
        ? totalAtmosphericMassKg / surfaceAreaM2
        : (surfacePressurePa / gravity);

      const blend = columnMassKgPerM2 / (columnMassKgPerM2 + 2000);
      const Texobase = Tlower + (Texo - Tlower) * blend;

      // Exobase height estimate: use hydrostatic/bulk MW (not heavy trace).
      const zExo = estimateExobaseHeightMeters({
        totalMassKg: totalAtmosphericMassKg,
        surfaceAreaM2,
        gravity,
        meanMolecularWeightGmol: meanMW_Hydro_Gmol,
        exobaseTemperatureK: Texobase,
        collisionSigmaM2
      });

      // Surface scale height (m).
      const M0 = meanMW_Hydro_Gmol / 1000;
      const Hsurf = (R_UNIVERSAL * surfaceTemperatureK) / (M0 * gravity);

      // v2: Layer boundaries in multiples of Hsurf, only bounded by exobase.
      const zExoSafe = zExo > 0 ? zExo : Math.max(200_000, 30 * Hsurf);

      const z1Base = 5 * Hsurf;
      const z2Base = 12 * Hsurf;
      const z3Base = 25 * Hsurf;

      const z1 = clamp(z1Base, 10_000, 0.35 * zExoSafe);
      const z2 = clamp(z2Base, z1 + 10_000, 0.70 * zExoSafe);

      let z3 = clamp(z3Base, z2 + 10_000, 0.90 * zExoSafe);
      z3 = clamp(z3, z2 + 1_000, zExoSafe - 5_000);

      const z4 = zExoSafe;

      // Upper-atmosphere MW reduction heuristic.
      // Use the hydrostatic/bulk MW as the basis so heavy trace species (e.g. SF6/aerosols)
      // don't unrealistically "thicken" the thermosphere/exosphere.
      let MUpperG;
      if (meanMW_Hydro_Gmol > 40 || frac_Hydro.co2 > 0.5) {
        MUpperG = clamp(meanMW_Hydro_Gmol * 0.60, 16, 32);
      } else {
        MUpperG = clamp(meanMW_Hydro_Gmol * 0.42, 4, 28);
      }
      if (massFractions.h2 > 0.05) {
        MUpperG = Math.max(2.5, MUpperG * 0.7);
      }
      const MTransG = 0.5 * (meanMW_Hydro_Gmol + MUpperG);

      const Tthermo = Tcold + 0.9 * (Texo - Tcold);

      // GM (m^3/s^2) from g0 and radius.
      const GM = gravity * planetRadiusM * planetRadiusM;

      // Exosphere tail parameters (constant g at exobase, optionally tightened by Jeans λ).
      const rExo = planetRadiusM + z4;
      const gExo = GM / (rExo * rExo);
      const MExoKgPerMol = (MUpperG / 1000);
      const HExoBase = (R_UNIVERSAL * Texo) / (MExoKgPerMol * gExo);

      const lambdaExo = jeansLambda(GM, rExo, MExoKgPerMol, Texo);
      // If λ is small (weakly bound), shrink the effective scale height so densities
      // don't stay huge out to thousands of km on low-g / light-gas worlds.
      const escapeScaleFactor = enableEscapeTail
        ? clamp(lambdaExo / Math.max(1e-6, jeansLambdaTarget), minEscapeScaleFactor, 1)
        : 1;

      const HExoEffective = HExoBase * escapeScaleFactor;

      this._layers = [
        { name: 'lower', zStart: 0,  zEnd: z1, T: Tlower,  molarMassG: meanMW_Hydro_Gmol, mode: 'inverseSquare' },
        { name: 'cold',  zStart: z1, zEnd: z2, T: Tcold,   molarMassG: meanMW_Hydro_Gmol, mode: 'inverseSquare' },
        { name: 'thermo',zStart: z2, zEnd: z3, T: Tthermo, molarMassG: meanMW_Hydro_Gmol, mode: 'inverseSquare' },
        { name: 'upper', zStart: z3, zEnd: z4, T: Texo,    molarMassG: MTransG,           mode: 'inverseSquare' },
        {
          name: 'exo',
          zStart: z4,
          zEnd: Infinity,
          T: Texo,
          molarMassG: MUpperG,
          mode: enableEscapeTail ? 'escapeTail' : 'inverseSquare',
          // escapeTail parameters:
          gConst: gExo,
          scaleHeightM: HExoEffective
        }
      ];

      // Pressure at each layer start.
      let P = surfacePressurePa;
      this._layers[0].PStart = P;

      for (let i = 0; i < this._layers.length; i += 1) {
        const layer = this._layers[i];
        if (i > 0) layer.PStart = P;

        if (!isFiniteNumber(layer.zEnd)) continue;

        const Mkg = (layer.molarMassG / 1000);

        let ratio = 1;
        if (layer.mode === 'inverseSquare') {
          const rStart = planetRadiusM + layer.zStart;
          const rEnd = planetRadiusM + layer.zEnd;
          ratio = pressureRatioInverseSquare(rStart, rEnd, Mkg, GM, layer.T);
        } else if (layer.mode === 'escapeTail') {
          const dz = Math.max(0, layer.zEnd - layer.zStart);
          // constant-g exponential using precomputed effective scale height.
          ratio = Math.exp(-dz / Math.max(1, layer.scaleHeightM));
        } else {
          // Fallback to inverseSquare.
          const rStart = planetRadiusM + layer.zStart;
          const rEnd = planetRadiusM + layer.zEnd;
          ratio = pressureRatioInverseSquare(rStart, rEnd, Mkg, GM, layer.T);
        }

        P = P * ratio;
      }

      this._debug.temperaturesK = { lower: Tlower, cold: Tcold, thermo: Tthermo, exo: Texo, exobase: Texobase };
      this._debug.molarMassG = { surface: meanMolecularWeightGmol, hydro: meanMW_Hydro_Gmol, transition: MTransG, upper: MUpperG };
      this._debug.heightsM = { z1, z2, z3, z4, exobase: zExoSafe };
      this._debug.surfaceScaleHeightM = Hsurf;
      this._debug.columnMassKgPerM2 = columnMassKgPerM2;
      this._debug.escape = {
        enableEscapeTail,
        rExo,
        gExo,
        jeansLambdaAtExobase: lambdaExo,
        jeansLambdaTarget,
        escapeScaleFactor,
        exoScaleHeightM: HExoBase,
        exoScaleHeightEffectiveM: HExoEffective
      };
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

    _computeDensityAtAltitude(zMeters) {
      const layers = this._layers;
      if (!layers || layers.length === 0) return 0;

      const {
        planetRadiusM,
        gravity
      } = this._inputs;

      // Surface / below surface: ideal gas at surface.
      if (!(zMeters > 0)) {
        const P0 = this._inputs.surfacePressurePa;
        const M0 = (this._inputs.meanMolecularWeightGmol / 1000);
        const T0 = this._inputs.surfaceTemperatureK;
        if (!(P0 > 0) || !(M0 > 0) || !(T0 > 0)) return 0;
        return (P0 * M0) / (R_UNIVERSAL * T0);
      }

      const idx = this._findLayerIndex(zMeters);
      if (idx < 0) return 0;
      const layer = layers[idx];

      const GM = gravity * planetRadiusM * planetRadiusM;
      const Mkg = layer.molarMassG / 1000;

      let Pz;
      if (layer.mode === 'inverseSquare') {
        const rStart = planetRadiusM + layer.zStart;
        const rZ = planetRadiusM + zMeters;
        const ratio = pressureRatioInverseSquare(rStart, rZ, Mkg, GM, layer.T);
        Pz = layer.PStart * ratio;
      } else if (layer.mode === 'escapeTail') {
        const dz = Math.max(0, zMeters - layer.zStart);
        const ratio = Math.exp(-dz / Math.max(1, layer.scaleHeightM));
        Pz = layer.PStart * ratio;
      } else {
        // Fallback
        const rStart = planetRadiusM + layer.zStart;
        const rZ = planetRadiusM + zMeters;
        const ratio = pressureRatioInverseSquare(rStart, rZ, Mkg, GM, layer.T);
        Pz = layer.PStart * ratio;
      }

      if (!(Pz > 0)) return 0;
      return (Pz * Mkg) / (R_UNIVERSAL * layer.T);
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

  // ---------- Model caching ----------
  const _MODEL_CACHE = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;

  function buildModelSignature(inputs, options = {}) {
    const pKey = Math.round((inputs.surfacePressurePa || 0) / 50);
    const tKey = Math.round(inputs.surfaceTemperatureK || 0);
    const mwKey = Math.round((inputs.meanMolecularWeightGmol || 0) * 10) / 10;
    const mwHydKey = Math.round((inputs.meanMolecularWeightForHydrostaticsGmol || 0) * 10) / 10;
    const sKey = Math.round(inputs.solarFluxWm2 || 0);
    const gKey = Math.round((inputs.gravity || 0) * 1000) / 1000;
    const rKey = Math.round(inputs.planetRadiusM || 0);
    const mKey = Math.round((inputs.totalAtmosphericMassKg || 0) / 1e9);

    const co2Key = Math.round((inputs.massFractions?.co2 || 0) * 1000) / 1000;
    const ch4Key = Math.round((inputs.massFractions?.ch4 || 0) * 1000) / 1000;
    const sf6Key = Math.round(((inputs.massFractionsBulk?.sf6 ?? inputs.massFractions?.sf6) || 0) * 1000) / 1000;

    const escapeKey = (options.enableEscapeTail !== false) ? 1 : 0;
    const jlKey = Math.round((options.jeansLambdaTarget ?? 30) * 100) / 100;
    const mefKey = Math.round((options.minEscapeScaleFactor ?? 0.02) * 1000) / 1000;

    return `${pKey}|${tKey}|${mwKey}|${mwHydKey}|${sKey}|${gKey}|${rKey}|${mKey}|${co2Key}|${ch4Key}|${sf6Key}|${escapeKey}|${jlKey}|${mefKey}`;
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
    const surfacePressurePa = getSurfacePressurePa(terraforming, resources, celestial);

    const meanMolecularWeightGmol = estimateMeanMolecularWeightGmol(resources?.atmospheric);

    const meanMolecularWeightBulkGmol = estimateMeanMolecularWeightGmolExcluding(resources?.atmospheric, HEAVY_TRACE_KEYS) || meanMolecularWeightGmol;

    const treatHeavyTraceAsLowerAtmosphere = (options.treatHeavyTraceAsLowerAtmosphere !== false);
    const meanMolecularWeightForHydrostaticsGmol = treatHeavyTraceAsLowerAtmosphere
      ? meanMolecularWeightBulkGmol
      : meanMolecularWeightGmol;

    const massFractions = getMassFractions(resources?.atmospheric);
    const massFractionsBulk = getMassFractionsExcludingKeys(resources?.atmospheric, HEAVY_TRACE_KEYS);

    const collisionSigmaM2 = isFiniteNumber(options.collisionSigmaM2)
      ? options.collisionSigmaM2
      : DEFAULT_COLLISION_SIGMA_M2;

    return {
      planetRadiusM,
      surfaceAreaM2,
      gravity,
      surfacePressurePa,
      surfaceTemperatureK,
      solarFluxWm2,
      totalAtmosphericMassKg,
      meanMolecularWeightGmol,
      meanMolecularWeightForHydrostaticsGmol,
      massFractions,
      massFractionsBulk,
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

  // ---------- Convenience functions ----------
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
          estimateMeanMolecularWeightGmolExcluding,
          estimateColdPointTemperatureK,
          estimateExosphereTemperatureK,
          estimateExobaseHeightMeters,
          jeansLambda
        }
      };
    }
  } catch (error) {
    // ignore
  }
})();
