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

  Notes
  -----
  1) This model uses *surface pressure inferred from total atmospheric mass*.
     If your pressure model differs, you can swap getSurfacePressurePa().
  2) Exobase height here is computed from a mean-free-path style estimate.
     It is used only to pick “reasonable” layer boundaries.
  3) Density is computed from a hydrostatic pressure profile with inverse-square
     gravity (analytic, fast), and ideal gas law.
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

  function estimateMeanMolecularWeightGmol(atmosphericResources) {
    const { totalTons, byKey } = getAtmosphericMassBreakdownTons(atmosphericResources);
    if (totalTons <= 0) return 0;

    // Convert: 1 ton = 1e6 grams.
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

  function getSurfacePressurePa(terraforming, resources, celestialParameters) {
    // Best: use terraforming's own pressure calc if available.
    if (terraforming && typeof terraforming.calculateTotalPressure === 'function') {
      const kPa = terraforming.calculateTotalPressure();
      if (isFiniteNumber(kPa) && kPa >= 0) return kPa * 1000;
    }

    // Next: use atmospheric-utils if it was loaded and exposed globally.
    const getTotalSurfacePressureKPa = getGlobal('getTotalSurfacePressureKPa');
    if (typeof getTotalSurfacePressureKPa === 'function') {
      const kPa = getTotalSurfacePressureKPa(resources?.atmospheric, celestialParameters?.gravity, celestialParameters?.radius);
      if (isFiniteNumber(kPa) && kPa >= 0) return kPa * 1000;
    }

    // Fallback: P = (totalMass * g) / surfaceArea.
    const totalMassKg = getTotalAtmosphericMassKg(resources);
    const g = getSurfaceGravity(celestialParameters);
    const area = getSurfaceAreaM2(celestialParameters);
    if (!(area > 0) || !(g > 0) || !(totalMassKg > 0)) return 0;
    return (totalMassKg * g) / area;
  }

  // ---------- Temperature heuristics (key to “Earth/Mars/Venus/Titan-ish”) ----------
  function estimateColdPointTemperatureK(surfaceTemperatureK, co2MassFraction, surfacePressurePa) {
    // Generic “mesopause-ish” cold point.
    // - Scales weakly with surface temperature.
    // - CO2-rich *and* high-pressure atmospheres get cooler upper layers (strong IR cooling).
    const pBar = surfacePressurePa / 1e5;

    let T = 160 + 0.18 * (surfaceTemperatureK - 200);
    const co2 = clamp(co2MassFraction, 0, 1);
    const cool = 1 + 0.35 * co2 * safeLog10(1 + pBar);
    T = T / cool;

    return clamp(T, 90, 220);
  }

  function estimateExosphereTemperatureK(solarFluxWm2, surfaceTemperatureK, co2MassFraction, ch4MassFraction, surfacePressurePa, meanMolecularWeightGmol) {
    // Heuristic thermosphere/exosphere temperature.
    // Key behaviors we want:
    // - Earth: ~900–1200 K (solar-cycle dependent; we don't model cycles here)
    // - Mars/Venus: ~200–350 K (CO2 radiative cooling dominates)
    // - Titan: ~120–200 K (low solar flux, some CH4 haze cooling)
    const pBar = surfacePressurePa / 1e5;
    const s = Math.max(0, solarFluxWm2);
    const sRatio = s / SOLAR_FLUX_EARTH;

    const co2 = clamp(co2MassFraction, 0, 1);
    const ch4 = clamp(ch4MassFraction, 0, 1);
    const isCO2Dominant = (co2 > 0.5) || (meanMolecularWeightGmol > 36);

    let T;
    if (isCO2Dominant) {
      // CO2-dominated: keep exosphere relatively cool even at high insolation.
      T = 180 + 160 * Math.sqrt(Math.max(sRatio, 0));
      // Very thick CO2 atmospheres cool more efficiently aloft.
      T *= 1 / (1 + 0.2 * safeLog10(1 + pBar));
      // Very hot surfaces do not necessarily imply a hot exosphere; keep coupling weak.
      T += 0.01 * (surfaceTemperatureK - 250);
    } else {
      // N2/O2-ish: strong EUV heating -> hot thermosphere.
      // This saturating form behaves well from Titan-like flux to Earth-like flux.
      T = 150 + 1300 * (s / (s + 700));
      // Methane/haze: mild cooling (important for Titan-ish atmospheres).
      T *= 1 / (1 + 2.0 * ch4);
      T += 0.02 * (surfaceTemperatureK - 250);
    }

    return clamp(T, 60, 2000);
  }

  // ---------- Exobase height estimate (used to place layer boundaries) ----------
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

    // Clamp the log to keep things sane under extreme terraforming.
    const logValue = Math.log(clamp(logTerm, 1 + 1e-12, 1e40));
    return clamp(scaleHeight * logValue, 0, 5_000_000);
  }

  // ---------- Hydrostatic integration with inverse-square gravity (analytic) ----------
  function pressureRatioBetweenRadii(rStart, rEnd, molarMassKgPerMol, GM, temperatureK) {
    // Hydrostatic equilibrium for an isothermal layer:
    //   dP/P = -(M g(r) / (R T)) dr
    // with g(r)=GM/r^2 -> integral gives:
    //   P_end = P_start * exp(-(M*GM/(R*T)) * (1/rStart - 1/rEnd))
    if (!(rStart > 0) || !(rEnd > 0) || !(temperatureK > 0) || !(molarMassKgPerMol > 0) || !(GM > 0)) {
      return 1;
    }
    const K = (molarMassKgPerMol * GM) / (R_UNIVERSAL * temperatureK);
    const exponent = -K * (1 / rStart - 1 / rEnd);
    // Avoid NaNs from overflow; exp(-large) underflows cleanly to 0.
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
        massFractions,
        totalAtmosphericMassKg,
        surfaceAreaM2,
        collisionSigmaM2
      } = this._inputs;

      this._debug = {
        planetRadiusM,
        gravity,
        surfacePressurePa,
        surfaceTemperatureK,
        solarFluxWm2,
        meanMolecularWeightGmol,
        massFractions: { ...massFractions },
        totalAtmosphericMassKg,
        surfaceAreaM2,
        collisionSigmaM2
      };

      // Handle vacuum quickly.
      if (!(surfacePressurePa > 0) || !(meanMolecularWeightGmol > 0) || !(surfaceTemperatureK > 0)) {
        this._layers = [];
        this._debug.vacuum = true;
        return;
      }

      const Tcold = estimateColdPointTemperatureK(surfaceTemperatureK, massFractions.co2, surfacePressurePa);
      const Texo = estimateExosphereTemperatureK(
        solarFluxWm2,
        surfaceTemperatureK,
        massFractions.co2,
        massFractions.ch4,
        surfacePressurePa,
        meanMolecularWeightGmol
      );

      // A “lower atmosphere effective T” (average-ish over the first tens of km).
      // Weighted blend avoids the Venus failure mode where a hard cap makes densities too low at 50 km.
      const Tlower = clamp(0.6 * surfaceTemperatureK + 0.4 * Tcold, 60, 800);

      // Column mass from total mass / area (consistent with P ≈ mcol*g).
      const columnMassKgPerM2 = (totalAtmosphericMassKg > 0 && surfaceAreaM2 > 0)
        ? totalAtmosphericMassKg / surfaceAreaM2
        : (surfacePressurePa / gravity);

      const blend = columnMassKgPerM2 / (columnMassKgPerM2 + 2000);
      const Texobase = Tlower + (Texo - Tlower) * blend;

      const zExo = estimateExobaseHeightMeters({
        totalMassKg: totalAtmosphericMassKg,
        surfaceAreaM2,
        gravity,
        meanMolecularWeightGmol,
        exobaseTemperatureK: Texobase,
        collisionSigmaM2
      });

      // Base scale height at the surface (for boundary heuristics).
      const M0 = meanMolecularWeightGmol / 1000;
      const Hsurf = (R_UNIVERSAL * surfaceTemperatureK) / (M0 * gravity);

      // Layer boundaries (meters). We pick Earth/Mars/Venus/Titan-ish values by
      // combining scale height heuristics with the exobase estimate.
      const z1Base = clamp(5 * Hsurf, 25_000, 120_000);
      const z2Base = clamp(12 * Hsurf, z1Base + 10_000, 250_000);

      const zExoSafe = zExo > 0 ? zExo : Math.max(200_000, 30 * Hsurf);
      const z1 = clamp(Math.min(z1Base, 0.35 * zExoSafe), 0, 0.6 * zExoSafe);
      const z2 = clamp(Math.min(z2Base, 0.70 * zExoSafe), z1 + 5_000, 0.85 * zExoSafe);
      let z3 = Math.max(z2 + 10_000, 0.60 * zExoSafe);
      z3 = clamp(z3, z2 + 1_000, zExoSafe - 5_000);
      const z4 = zExoSafe;

      // Upper-atmosphere molecular weight reduction (diffusive separation / dissociation heuristic).
      // This is important for getting “reasonable” densities around 400–1200 km on Earth-like planets.
      let MUpperG;
      if (meanMolecularWeightGmol > 40 || massFractions.co2 > 0.5) {
        // CO2-dominated: upper atmosphere tends toward CO/O mixtures.
        MUpperG = clamp(meanMolecularWeightGmol * 0.60, 16, 32);
      } else {
        // N2/O2-ish: upper atmosphere becomes O/He/H-enriched.
        MUpperG = clamp(meanMolecularWeightGmol * 0.42, 4, 28);
      }
      // If the atmosphere is actually H2-rich, allow it to get even lighter.
      if (massFractions.h2 > 0.05) {
        MUpperG = Math.max(2.5, MUpperG * 0.7);
      }
      const MTransG = 0.5 * (meanMolecularWeightGmol + MUpperG);

      // Thermosphere “effective” temperature for the mixed region.
      const Tthermo = Tcold + 0.9 * (Texo - Tcold);

      // Precompute GM (m^3/s^2) from g0 and radius.
      const GM = gravity * planetRadiusM * planetRadiusM;

      this._layers = [
        { name: 'lower', zStart: 0,  zEnd: z1, T: Tlower,  molarMassG: meanMolecularWeightGmol },
        { name: 'cold',  zStart: z1, zEnd: z2, T: Tcold,   molarMassG: meanMolecularWeightGmol },
        { name: 'thermo',zStart: z2, zEnd: z3, T: Tthermo, molarMassG: meanMolecularWeightGmol },
        { name: 'upper', zStart: z3, zEnd: z4, T: Texo,    molarMassG: MTransG },
        { name: 'exo',   zStart: z4, zEnd: Infinity, T: Texo, molarMassG: MUpperG }
      ];

      // Compute pressure at each layer start.
      let P = surfacePressurePa;
      this._layers[0].PStart = P;

      for (let i = 0; i < this._layers.length; i += 1) {
        const layer = this._layers[i];
        if (i > 0) {
          layer.PStart = P;
        }
        if (!isFiniteNumber(layer.zEnd)) {
          continue;
        }
        const rStart = planetRadiusM + layer.zStart;
        const rEnd = planetRadiusM + layer.zEnd;
        const Mkg = (layer.molarMassG / 1000);
        const ratio = pressureRatioBetweenRadii(rStart, rEnd, Mkg, GM, layer.T);
        P = P * ratio;
      }

      // Surface density (for debugging).
      this._debug.temperaturesK = { lower: Tlower, cold: Tcold, thermo: Tthermo, exo: Texo, exobase: Texobase };
      this._debug.molarMassG = { surface: meanMolecularWeightGmol, transition: MTransG, upper: MUpperG };
      this._debug.heightsM = { z1, z2, z3, z4, exobase: zExoSafe };
      this._debug.surfaceScaleHeightM = Hsurf;
      this._debug.columnMassKgPerM2 = columnMassKgPerM2;
    }

    _findLayerIndex(zMeters) {
      const layers = this._layers;
      if (!layers || layers.length === 0) return -1;
      // Layers are in ascending order.
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

      // For z <= 0, return ideal-gas density at the surface.
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

      const rStart = planetRadiusM + layer.zStart;
      const rZ = planetRadiusM + zMeters;
      const Mkg = layer.molarMassG / 1000;

      // GM from surface gravity.
      const GM = gravity * planetRadiusM * planetRadiusM;
      const ratio = pressureRatioBetweenRadii(rStart, rZ, Mkg, GM, layer.T);
      const Pz = layer.PStart * ratio;
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

  // ---------- Model caching (per terraforming instance) ----------
  const _MODEL_CACHE = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;

  function buildModelSignature(inputs) {
    // Round inputs to avoid rebuilds from tiny numerical drift.
    const pKey = Math.round((inputs.surfacePressurePa || 0) / 50);      // 50 Pa
    const tKey = Math.round(inputs.surfaceTemperatureK || 0);           // 1 K
    const mwKey = Math.round((inputs.meanMolecularWeightGmol || 0) * 10) / 10; // 0.1 g/mol
    const sKey = Math.round(inputs.solarFluxWm2 || 0);                  // 1 W/m^2
    const gKey = Math.round((inputs.gravity || 0) * 1000) / 1000;
    const rKey = Math.round(inputs.planetRadiusM || 0);
    const mKey = Math.round((inputs.totalAtmosphericMassKg || 0) / 1e9); // 1e9 kg

    // Include dominant composition proxies.
    const co2Key = Math.round((inputs.massFractions?.co2 || 0) * 1000) / 1000;
    const ch4Key = Math.round((inputs.massFractions?.ch4 || 0) * 1000) / 1000;
    return `${pKey}|${tKey}|${mwKey}|${sKey}|${gKey}|${rKey}|${mKey}|${co2Key}|${ch4Key}`;
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
    const massFractions = getMassFractions(resources?.atmospheric);

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
      massFractions,
      collisionSigmaM2
    };
  }

  function getAtmosphericDensityModel(explicitTerraforming, options = {}) {
    const terraforming = getTerraformingState(explicitTerraforming);

    // If we can't key by terraforming (null), fall back to a single global cache bucket.
    const cacheKey = terraforming || getGlobal('currentPlanetParameters') || getGlobal('resources') || {};

    const inputs = buildDensityInputs(terraforming, options);
    const signature = buildModelSignature(inputs);

    if (_MODEL_CACHE) {
      const cached = _MODEL_CACHE.get(cacheKey);
      if (cached && cached.signature === signature) {
        return cached.model;
      }
      const model = new AtmosphericDensityModel(inputs, options);
      _MODEL_CACHE.set(cacheKey, { signature, model });
      return model;
    }

    // WeakMap unavailable: just rebuild.
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
    // Browser globals
    window.getAtmosphericDensityModel = getAtmosphericDensityModel;
    window.estimateAtmosphericDensityKgPerM3 = estimateAtmosphericDensityKgPerM3;
    window.estimateAtmosphericDensitiesKgPerM3 = estimateAtmosphericDensitiesKgPerM3;
  } catch (error) {
    // ignore
  }

  try {
    // Node / tests
    if (isNode) {
      module.exports = {
        AtmosphericDensityModel,
        getAtmosphericDensityModel,
        estimateAtmosphericDensityKgPerM3,
        estimateAtmosphericDensitiesKgPerM3,
        // Expose internals for tuning/tests.
        _internals: {
          estimateMeanMolecularWeightGmol,
          estimateColdPointTemperatureK,
          estimateExosphereTemperatureK,
          estimateExobaseHeightMeters
        }
      };
    }
  } catch (error) {
    // ignore
  }
})();
