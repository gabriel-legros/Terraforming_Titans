
"use strict";

/**
 * Random World Generator — Fully Parameterized Module
 * - Central DEFAULT_PARAMS controls all knobs
 * - Canonical seeding:
 *    seed S := hash(input) if input is string, else numeric input >>> 0
 *    Use derived RNG streams to pick: target(planet|moon), orbit preset & aAU, and type.
 *    Generate everything else with mulberry32(S).
 *    Return canonical seed string:  S|<planet|moon>|<type>|<orbitPreset>
 * - Param API: rwgManager.setParams({...}), .getParams(), .withParams({...})
 */

// ===================== Utilities & Shims =====================
function hashStringToInt(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const randRange = (rng, a, b) => a + (b - a) * rng();
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const toTons = (kg) => kg / 1000;
function isObject(item) { return item && typeof item === "object" && !Array.isArray(item); }

// Deep merge shim
if (typeof globalThis.deepMerge === "undefined") {
  globalThis.deepMerge = function deepMerge(target, source) {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach((key) => {
        const t = target[key];
        const s = source[key];
        if (isObject(t) && isObject(s)) output[key] = deepMerge(t, s);
        else if (s !== undefined) output[key] = s;
      });
    }
    return output;
  };
}

// Provide defaultPlanetParameters if not present (very light stub)
if (typeof globalThis.defaultPlanetParameters === "undefined") {
  globalThis.defaultPlanetParameters = { resources: { colony: {} } };
}

// EffectableEntity shim
if (typeof globalThis.EffectableEntity === "undefined") {
  try { globalThis.EffectableEntity = require("./effectable-entity.js"); }
  catch (_) { globalThis.EffectableEntity = class {}; }
}

// Physics hooks (optional project-level overrides)
let dayNightTemperaturesModelFn = globalThis.dayNightTemperaturesModel;
let calcAtmPressure = globalThis.calculateAtmosphericPressure;
try {
  const physics = require("./terraforming/physics.js");
  dayNightTemperaturesModelFn = dayNightTemperaturesModelFn || physics.dayNightTemperaturesModel;
  calcAtmPressure = calcAtmPressure || physics.calculateAtmosphericPressure;
} catch (_) {}

// World type metadata
const RWG_WORLD_TYPES = {
  "mars-like": { displayName: "Mars-like" },
  "cold-desert": { displayName: "Desert" },
  "icy-moon": { displayName: "Water-rich" },
  "titan-like": { displayName: "Titan-like" },
  "carbon-planet": { displayName: "Carbon" },
  "desiccated-desert": { displayName: "Desiccated Desert" },
  "super-earth": { displayName: "Super-Earth" },
  "venus-like": { displayName: "Venus-like" },
};

const RWG_TYPE_BASE_COLORS = {
  "mars-like": "#8a2a2a",
  "cold-desert": "#b38c61",
  "icy-moon": "#7a8797",
  "titan-like": "#8a6a38",
  "carbon-planet": "#2c2b30",
  "desiccated-desert": "#caa16a",
  "super-earth": "#4c6f4e",
  "venus-like": "#cdb675",
};

function pickBaseColorForType(type) {
  return RWG_TYPE_BASE_COLORS[type] || "#7a4a3a";
}

// ===================== Parameter Pack (edit here) =====================
const DEFAULT_PARAMS = {
  naming: {
    starSyllables: ["al","be","ce","do","er","fi","ga","ha","io","ju","ka","lu","me","no","or","pi","qu","ra","su","ta","ul","ve","wo","xi","ya","zo"],
    planetSyllables: ["ta","ri","no","ka","mi","sa","lo","ve","du","an","ke","yo","ze","ur","phi","ran","sol","ter","mar","cal","thy","gan","tan","cys"]
  },
  star: {
    spectralWeights: [
      { v: "M", w: 76 }, { v: "K", w: 12 }, { v: "G", w: 7.6 },
      { v: "F", w: 3.0 }, { v: "A", w: 1.2 }, { v: "B", w: 0.2 }, { v: "O", w: 0.02 }
    ],
    massRanges: { O:[16,60], B:[2.1,16], A:[1.4,2.1], F:[1.1,1.4], G:[0.9,1.1], K:[0.6,0.9], M:[0.08,0.6] }
  },
  orbit: {
    logAU: { min: 0.2, max: 30, outwardIndexScale: 0.25 },
    presets: {
      hotFluxWm2: [1500, 4000],
      hzInnerFluxWm2: [1200, 1500],
      hzMidFluxWm2:   [800, 1200],
      hzOuterFluxWm2: [500, 800],
      coldFluxWm2: [100, 500],
      veryColdFluxWm2: [10, 100]
    },
    moonChance: { thresholdAU: 3, chance: 0.35 }
  },
  classification: {
    typeAlbedo: {
      "venus-like": 0.75, "mars-like": 0.25, "cold-desert": 0.5,
      "icy-moon": 0.17, "titan-like": 0.15,
      "carbon-planet": 0.08,
      "desiccated-desert": 0.38,
      "super-earth": 0.30,
    },
    albedoGuess: { default: 0.3, beyondHZouter: 0.55 },
    thresholdsK: { venusMin: 330, marsLow: 200, marsHigh: 255 },
    moonTitanLike: { rangeK: [80,110], chance: 0.7 }
  },
  bulk: {
    radiusER: {
      "venus-like": [0.85,1.05], "mars-like": [0.3,0.6],
      "icy-moon": [0.25,0.7], "titan-like": [0.25,0.6], "cold-desert": [0.4,0.9],
      "carbon-planet": [0.7, 1.4],
      "desiccated-desert": [0.6, 1.2],
      "super-earth": [1.2, 6]
    },
    densityRel: {
      "venus-like": [0.95,1.1], "mars-like": [0.7,0.95],
      "icy-moon": [0.3,0.55], "titan-like": [0.35,0.6], "cold-desert": [0.8,1.0],
      "carbon-planet": [0.90, 1.20],
      "desiccated-desert": [0.80, 1.05],
      "super-earth": [0.90, 1.30]
    }
  },
  atmosphere: {
    templates: {
      "venus-like": { pressureBar: 90, mix: { carbonDioxide: 0.965, inertGas: 0.03, oxygen: 0.0003, atmosphericWater: 0.0047 } },
      "mars-like": { pressureBar: 0.006, mix: { carbonDioxide: 0.95, inertGas: 0.03, oxygen: 0.0016, atmosphericWater: 0.0004 } },
      "cold-desert": { pressureBar: 0.02, mix: { carbonDioxide: 0.85, inertGas: 0.14, oxygen: 0.0005, atmosphericWater: 0.0095 } },
      "icy-moon": { pressureBar: 1e-5, mix: { carbonDioxide: 0.7, inertGas: 0.299, oxygen: 0.001, atmosphericWater: 0.0001 } },
      "titan-like": { pressureBar: 1.4, mix: { carbonDioxide: 0.00006, inertGas: 0.98, oxygen: 1e-6, atmosphericWater: 1e-9, atmosphericMethane: 0.02 } },
      "carbon-planet":     { pressureBar: 1.0,  mix: { atmosphericMethane: 0.5, inertGas: 0.49, carbonDioxide: 0.01 } },
      "desiccated-desert": { pressureBar: 0.05, mix: { carbonDioxide: 0.85, inertGas: 0.15 } },
      "super-earth": {
        pressureBar: 1.2,
        mix: {
          inertGas: 0.95,
          carbonDioxide: 0.045,
          oxygen: 0.001,
          atmosphericWater: 0.004
        }
      }
    },
    pressureBands: {
      "venus-like": [0.8,1.2], "mars-like": [0.3,3.0],
      "cold-desert": [0.2,2.0], "icy-moon": [0.1,10.0], "titan-like": [0.7,1.3],
      "carbon-planet": [0.5, 1.5],
      "desiccated-desert": [0.5, 2.0], 
      "super-earth": [0.7, 2.2],
    }
  },
  volatiles: {
    H2O_total: {
      "venus-like": 1e12, "mars-like": 8e15, "cold-desert": 2e14, "icy-moon": 4e19, "titan-like": 1e16,
      "carbon-planet": 5e13,
      "desiccated-desert": 1e13, "super-earth": 2e15,
    },
    CH4_total: {
      "titan-like": 3e14, "icy-moon": 0, "cold-desert": 0, "mars-like": 0, "venus-like": 0,
      "carbon-planet": 5e14,
      "desiccated-desert": 0, "super-earth": 0,
    },
    referenceLandHa: 14_400_000_000
  },
  zonal: {
    defaultZoneFractions: { tropical: 0.4, temperate: 0.4, polar: 0.2 },
    warmBiasK: { tropical: 1.0, temperate: 0.6, polar: 0.1 },
    coldBiasK: { tropical: 0.05, temperate: 0.2, polar: 0.75 },
    buriedFactorByType: {
      "icy-moon": 5.0, "titan-like": 3.0, "cold-desert": 2.0, "mars-like": 1.5, "venus-like": 0.1,
      "carbon-planet": 0.5,
      "desiccated-desert": 0.8, "super-earth": 0.2,
    },
    titanLiquidBiasK: { tropical: 0.05, temperate: 0.25, polar: 0.7 },
    coldLiquidBiasK: { tropical: 0.1, temperate: 0.4, polar: 0.5 },
    dryIceBias: { tropical: 0.0, temperate: 0.05, polar: 0.95 }
  },
 deposits: {
    // Scaling by surface area
    areaPerDepositHa: 100_000,
    maxDepositsFraction: 0.1,

    // RANDOM ORE TUNING (all tunable):
    ore: {
      // Type density multiplier (affects the max cap)
      densityByType: {
        "super-earth": 1.30,
        "venus-like": 1.00,
        "mars-like": 0.90,
        "carbon-planet": 0.90,
        "desiccated-desert": 0.70,
        "cold-desert": 0.80,
        "icy-moon": 0.60,
        "titan-like": 0.50,
        default: 1.00
      },
      // Initial fraction of max (randomized around this)
      initFracByType: {
        // ~2% by default; tweak per type if you want flavor
        default: 0.002,
        "super-earth": 0.003,
        "icy-moon": 0.001,
        "titan-like": 0.001
      },
      // Jitter knobs
      maxJitterRange: [0.85, 1.15], // applied to max
      initFracJitter: 0.5,          // ±50% around init fraction
      minMax: 5                     // minimum max cap
    },

    // Legacy seeds kept as hints; geothermal now uses an activity model
    geoVentInit: { "mars-like": 0, default: 2, coldLow: 1 },

    // RANDOM GEOTHERMAL ACTIVITY MODEL
    geothermal: {
      // Require fairly strong activity to exist at all
      activityThreshold: 0.35,

      // randomness for vents-per-area (independent of ore)
      perAreaMin: 0.0005,
      perAreaMax: 0.005,

      // Keep caps conservative
      maxPerArea: 0.001,

      // Intrinsic activity by archetype (0 = none unless tides help)
      baseActivityByType: {
        "venus-like": 0.80,
        "super-earth": 0.60,
        "carbon-planet": 0.35,

        // These only get geothermal if tides push them over threshold
        "mars-like": 0.00,
        "cold-desert": 0.00,
        "desiccated-desert": 0.00,
        "icy-moon": 0.00,
        "titan-like": 0.00,
        default: 0.00
      },

      // Tidal heating: only some moons have the right geometry
      moonTidalChance: 0.45,     // % of moons that get significant tidal forcing
      tidalBonusIfMoon: 0.35     // enough to push some moons over the threshold
    }
  },
  colonyCaps: { energy: 50_000_000, metal: 5000, silicon: 5000, glass: 5000, water: 5000, food: 5000, components: 500, electronics: 200, superconductors: 200, androids: 1000 },
  specials: { includeAlbedoUpgrades: true, includeSpaceships: true, includeAlienArtifact: true },
  magnetosphere: {
    chanceByType: {
      "venus-like": 0.02, "mars-like": 0.06, "cold-desert": 0.12,
      "icy-moon": 0.03, "titan-like": 0.03,
      "carbon-planet": 0.15,
      "desiccated-desert": 0.10,
      "super-earth": 0.35,
    },
    defaultChance: 0.12
  }
};


function resolveParams(current, overrides) { return deepMerge(current || DEFAULT_PARAMS, overrides || {}); }

// ===================== Seed helpers =====================
// Supports both legacy k=v annotations and positional: S|<planet|moon>|<type>|<orbitPreset>
function parseSeedSpec(seedInput) {
  let base = "";
  let ann = {}; // { target, type, orbitPreset, aAU }
  let seedInt;
  if (typeof seedInput === "string") {
    const segs = seedInput.split("|");
    base = (segs[0] || "").trim();
    const baseIsInt = /^\d+$/.test(base);
    const unkeyed = [];
    for (let i = 1; i < segs.length; i++) {
      const seg = (segs[i] || "").trim();
      if (!seg) continue;
      if (seg.includes("=")) {
        const [kRaw, vRaw] = seg.split("=");
        const k = (kRaw || "").trim().toLowerCase();
        const v = (vRaw || "").trim();
        if (!k || !v) continue;
        if (k === "t" || k === "type" || k === "archetype") ann.type = v;
        else if (k === "o" || k === "orbit" || k === "orbitpreset") ann.orbitPreset = v;
        else if (k === "tg" || k === "target") ann.target = v.toLowerCase();
        else if (k === "d" || k === "au") {
          const num = parseFloat(v);
          if (!Number.isNaN(num)) ann.aAU = num;
        }
      } else {
        unkeyed.push(seg);
      }
    }
    if (unkeyed.length) {
      const [p0, p1, p2] = unkeyed;
      const p0l = (p0 || "").toLowerCase();
      if (p0l === "planet" || p0l === "moon") ann.target = p0l;
      if (p1) ann.type = p1;
      if (p2) ann.orbitPreset = p2;
    }
    seedInt = baseIsInt ? (parseInt(base, 10) >>> 0) : hashStringToInt(base);
  } else {
    seedInt = seedInput >>> 0;
    base = String(seedInput ?? seedInt);
  }
  return { seedInt, baseSeed: base, ann };
}
function buildSeedSpec(baseInt, { target, type, orbitPreset } = {}) {
  const parts = [String(baseInt >>> 0)];
  if (target) parts.push(String(target));
  if (type) parts.push(String(type));
  if (orbitPreset) parts.push(String(orbitPreset));
  return parts.join("|");
}

// ===================== Physics-ish helpers =====================
function pickWeighted(rng, items) { const sum = items.reduce((s, it) => s + it.w, 0); let r = rng() * sum; for (const it of items) { r -= it.w; if (r <= 0) return it.v; } return items[items.length - 1].v; }
function luminosityFromMassSolar(m) { return Math.max(0.0005, Math.min(100000, Math.pow(m, 3.5))); }
function radiusFromMassSolar(m) { return Math.pow(m, 0.8); }
function eqTempK(L, dAU, albedo = 0.3) { const base = (278 * Math.pow(L, 0.25)) / Math.sqrt(dAU); return base * Math.pow((1 - albedo) / (1 - 0.3), 0.25); }
function gravityFromMassRadius(M_kg, R_km) { const G = 6.6743e-11; const R_m = R_km * 1000; return (G * M_kg) / (R_m * R_m); }
function surfaceAreaHa(radius_km) { const area_km2 = 4 * Math.PI * radius_km * radius_km; return Math.round(area_km2 * 100); }
function totalAtmosphereMassTons(pressureBar, radius_km, gravity_ms2) { const P = pressureBar * 1e5; const R_m = radius_km * 1000; const M_kg = (4 * Math.PI * R_m * R_m * P) / gravity_ms2; return toTons(M_kg); }

// ===================== Naming =====================
function starName(seed, params) {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const s = params.naming.starSyllables; const pick = () => s[Math.floor(rng() * s.length)];
  const core = pick() + pick() + pick(); const num = Math.floor(rng() * 999) + 1;
  return core.charAt(0).toUpperCase() + core.slice(1) + "-" + num;
}
function planetName(seed, params) {
  const rng = mulberry32(seed ^ 0xa5a5a5);
  const s = params.naming.planetSyllables; const pick = () => s[Math.floor(rng() * s.length)];
  const core = pick() + pick() + pick();
  return core.charAt(0).toUpperCase() + core.slice(1);
}

// ===================== Star & Orbit =====================
function generateStar(seed, params) {
  const rng = mulberry32(seed);
  const spectral = pickWeighted(rng, params.star.spectralWeights);
  const m = randRange(rng, ...params.star.massRanges[spectral]);
  const L = luminosityFromMassSolar(m); const R = radiusFromMassSolar(m);
  const Teff = 5772 * Math.pow(L / (R * R), 0.25);
  return { name: starName(seed, params), spectralType: spectral, massSolar: m, luminositySolar: L, radiusSolar: R, temperatureK: Math.round(Teff)};
}
function sampleOrbitAU(rng, i, params) {
  const { min, max, outwardIndexScale } = params.orbit.logAU; const t = rng();
  const base = Math.exp(Math.log(min) + (Math.log(max) - Math.log(min)) * t);
  return base * (1 + outwardIndexScale * i);
}
// ===================== World building helpers =====================
function sampleBulk(rng, archetype, params) {
  const Me = 5.972e24, Re_km = 6371;
  const rr = params.bulk.radiusER[archetype] || [0.5, 1.2];
  const dr = params.bulk.densityRel[archetype] || [0.7, 1.1];
  const radius_rel = randRange(rng, rr[0], rr[1]);
  const density_rel = randRange(rng, dr[0], dr[1]);
  const mass_rel = density_rel * Math.pow(radius_rel, 3);
  const mass = mass_rel * Me; const radius_km = radius_rel * Re_km; const gravity = gravityFromMassRadius(mass, radius_km);
  return { mass, radius_km, gravity };
}
function buildAtmosphere(archetype, radius_km, gravity, rng, params) {
  const tpl = params.atmosphere.templates[archetype];
  const band = (params.atmosphere.pressureBands[archetype] || [0.5, 1.5]);
  const pressureBar = tpl ? tpl.pressureBar * randRange(rng, band[0], band[1]) : randRange(rng, 0.001, 2.0);
  const totalTons = totalAtmosphereMassTons(pressureBar, radius_km, gravity);
  const baseMix = (tpl && tpl.mix) ? tpl.mix : {};
  const mixKeys = ["carbonDioxide","inertGas","oxygen","atmosphericWater","atmosphericMethane","hydrogen","sulfuricAcid"];
  const jittered = {}; let sum = 0;
  for (const k of mixKeys) { const base = baseMix[k] || 0; if (base <= 0) { jittered[k] = 0; continue; } const jitter = 1 + randRange(rng, -0.25, 0.25); const val = Math.max(0, base * jitter); jittered[k] = val; sum += val; }
  const defaults = globalThis.defaultPlanetParameters?.resources?.atmospheric || {};
  const makeGasEntry = (key, value) => {
    const base = defaults[key];
    const entry = base ? { ...base } : {};
    entry.initialValue = value;
    if (entry.unlocked === undefined) entry.unlocked = false;
    return entry;
  };
  const gas = {};
  if (sum <= 0) {
    gas.inertGas = makeGasEntry("inertGas", totalTons);
    for (const k of mixKeys) {
      if (k === "inertGas") continue;
      gas[k] = makeGasEntry(k, 0);
    }
    return gas;
  }
  let allocated = 0; for (const k of mixKeys) { const frac = (jittered[k] || 0) / sum; const v = frac * totalTons; gas[k] = makeGasEntry(k, v); allocated += v; }
  const residue = totalTons - allocated; if (residue > 0 && gas.inertGas) gas.inertGas.initialValue += residue;
  return gas;
}
function depositsFromLandHa(landHa, params) { const areaTotal = Math.round(landHa / params.deposits.areaPerDepositHa); const maxDeposits = Math.round(areaTotal * params.deposits.maxDepositsFraction); return { areaTotal, maxDeposits }; }
function buildVolatiles(archetype, Teq, landHa, rng, params) {
  const landScale = landHa / params.volatiles.referenceLandHa;
  const surface = {
    land: { initialValue: landHa, hasCap: true, unlocked: false },
    ice: { initialValue: 0, unlocked: false, unit: "ton" },
    liquidWater: { initialValue: 0, unlocked: false, unit: "ton" },
    dryIce: { initialValue: 0, unlocked: false, unit: "ton", hideWhenSmall: true },
    liquidMethane: { initialValue: 0, unlocked: false, unit: "ton", hideWhenSmall: true },
    hydrocarbonIce: { initialValue: 0, unlocked: false, unit: "ton", hideWhenSmall: true },
    scrapMetal: { initialValue: 0, unlocked: false, unit: "ton" },
    biomass: { initialValue: 0, hasCap: false, unlocked: false, unit: "ton" },
  };
  const H2O_total = (params.volatiles.H2O_total[archetype] ?? 5e14) * landScale;
  const CH4_total = (params.volatiles.CH4_total[archetype] ?? 0) * landScale;
  if (Teq < 273) { surface.ice.initialValue = H2O_total * 0.999; if (Teq < 195) surface.dryIce.initialValue = 1e10 * landScale; }
  else { surface.liquidWater.initialValue = H2O_total * 0.05; }
  if (CH4_total > 0) {
    if (Teq < 95) surface.hydrocarbonIce.initialValue = CH4_total;
    else if (Teq < 110) surface.liquidMethane.initialValue = CH4_total;
    else surface.hydrocarbonIce.initialValue = CH4_total * 0.2;
  }
  return surface;
}
function getZoneFractionsSafe(params) {
  try { if (typeof getZonePercentage === "function") return { tropical: getZonePercentage("tropical"), temperate: getZonePercentage("temperate"), polar: getZonePercentage("polar") }; }
  catch (_) {}
  return params.zonal.defaultZoneFractions;
}
function estimateCoverage(amount, zoneArea, scale = 0.0001) {
  const resourceRatio = (scale * amount) / zoneArea; const R0 = 0.002926577381; const LINEAR_SLOPE = 50; const LOG_A = LINEAR_SLOPE * R0; const LOG_B = 1;
  if (resourceRatio <= 0) return 0; if (resourceRatio <= R0) return LINEAR_SLOPE * resourceRatio; if (resourceRatio < 1) return LOG_A * Math.log(resourceRatio) + LOG_B; return 1;
}
function calculateZonalCoverageLocal(tf, zone, resourceType, params) {
  const frac = getZoneFractionsSafe(params)[zone] || 0; const zoneArea = tf.celestialParameters.surfaceArea * frac; if (zoneArea <= 0) return 0;
  const zw = tf.zonalWater?.[zone] || {}; const zh = tf.zonalHydrocarbons?.[zone] || {}; const zs = tf.zonalSurface?.[zone] || {}; const zc = tf.zonalCO2?.[zone] || {}; let amount = 0;
  switch (resourceType) { case "liquidWater": amount = zw.liquid || 0; break; case "ice": amount = zw.ice || 0; break; case "buriedIce": amount = zw.buriedIce || 0; break; case "biomass": amount = zs.biomass || 0; break; case "dryIce": amount = zc.ice || 0; break; case "liquidMethane": amount = zh.liquid || 0; break; case "hydrocarbonIce": amount = zh.ice || 0; break; }
  let scale = 0.0001; if (["dryIce","ice","hydrocarbonIce"].includes(resourceType)) scale *= 100; else if (resourceType === "biomass") scale *= 100000; return estimateCoverage(amount, zoneArea, scale);
}
function calculateAverageCoverageLocal(cache, resourceType, params) { const frac = getZoneFractionsSafe(params); const zones = ["tropical","temperate","polar"]; let total = 0; for (const z of zones) total += (cache[z]?.[resourceType] || 0) * (frac[z] || 0); return Math.max(0, Math.min(total, 1)); }
function calculateSurfaceFractionsLocal(water, ice, biomass, hydro = 0, hydroIce = 0, dryIce = 0) { const bio = Math.min(biomass, 1); const remaining = 1 - bio; const surfaces = { ocean: Math.max(0, water), ice: Math.max(0, ice), hydrocarbon: Math.max(0, hydro), hydrocarbonIce: Math.max(0, hydroIce), co2_ice: Math.max(0, dryIce) }; const totalOther = Object.values(surfaces).reduce((a, b) => a + b, 0); let scale = 1; if (totalOther > remaining && totalOther > 0) scale = remaining / totalOther; for (const k in surfaces) surfaces[k] *= scale; return { ...surfaces, biomass: bio }; }
function distribute(amount, weights, rng) { const keys = Object.keys(weights); const jittered = {}; let sum = 0; for (const k of keys) { const j = 1 + randRange(rng, -0.1, 0.1); const val = Math.max(0, weights[k] * j); jittered[k] = val; sum += val; } const out = {}; if (sum <= 0 || !isFinite(sum)) { keys.forEach((k) => (out[k] = 0)); } else { keys.forEach((k) => (out[k] = amount * (jittered[k] / sum))); } return out; }
function buildZonalDistributions(type, Teq, surface, landHa, rng, params) {
  const frac = getZoneFractionsSafe(params);
  const zonalWater = { tropical: { liquid: 0, ice: 0, buriedIce: 0 }, temperate: { liquid: 0, ice: 0, buriedIce: 0 }, polar: { liquid: 0, ice: 0, buriedIce: 0 } };
  const zonalHydrocarbons = { tropical: { liquid: 0, ice: 0 }, temperate: { liquid: 0, ice: 0 }, polar: { liquid: 0, ice: 0 } };
const zonalSurface = { tropical: {}, temperate: {}, polar: {} };
const zonalCO2 = { tropical: { liquid: 0, ice: 0 }, temperate: { liquid: 0, ice: 0 }, polar: { liquid: 0, ice: 0 } };
  const warmBias = { tropical: params.zonal.warmBiasK.tropical * (frac.tropical||0), temperate: params.zonal.warmBiasK.temperate * (frac.temperate||0), polar: params.zonal.warmBiasK.polar * (frac.polar||0) };
  const coldBias = { tropical: params.zonal.coldBiasK.tropical * (frac.tropical||0), temperate: params.zonal.coldBiasK.temperate * (frac.temperate||0), polar: params.zonal.coldBiasK.polar * (frac.polar||0) };
  const liquidWater = surface.liquidWater?.initialValue || 0; const ice = surface.ice?.initialValue || 0; const hasPolarIce = ice > 0 || Teq < 273;
  const liquidSplit = distribute(liquidWater, warmBias, rng); const iceSplit = distribute(ice, coldBias, rng);
  zonalWater.tropical.liquid = liquidSplit.tropical; zonalWater.temperate.liquid = liquidSplit.temperate; zonalWater.polar.liquid = liquidSplit.polar;
  zonalWater.tropical.ice = iceSplit.tropical; zonalWater.temperate.ice = iceSplit.temperate; zonalWater.polar.ice = iceSplit.polar;
  let buriedFactor = params.zonal.buriedFactorByType[type]; if (typeof buriedFactor !== "number") buriedFactor = 0.5;
  const buriedTotal = (surface.ice?.initialValue || 0) * buriedFactor; const buriedBias = { tropical: 1.0 * (frac.tropical||0), temperate: 1.0 * (frac.temperate||0), polar: 0.3 * (frac.polar||0) };
  const buriedSplit = distribute(buriedTotal, buriedBias, rng); zonalWater.tropical.buriedIce = buriedSplit.tropical; zonalWater.temperate.buriedIce = buriedSplit.temperate; zonalWater.polar.buriedIce = buriedSplit.polar;
  const liquidMethane = surface.liquidMethane?.initialValue || 0; const hydrocarbonIce = surface.hydrocarbonIce?.initialValue || 0;
  const liqBiasSrc = (type === "titan-like") ? params.zonal.titanLiquidBiasK : params.zonal.coldLiquidBiasK;
  const liquidCH4Bias = { tropical: liqBiasSrc.tropical * (frac.tropical||0), temperate: liqBiasSrc.temperate * (frac.temperate||0), polar: liqBiasSrc.polar * (frac.polar||0) };
  const liquidCH4Split = distribute(liquidMethane, liquidCH4Bias, rng);
  zonalHydrocarbons.tropical.liquid = liquidCH4Split.tropical; zonalHydrocarbons.temperate.liquid = liquidCH4Split.temperate; zonalHydrocarbons.polar.liquid = liquidCH4Split.polar;
  const hcIceSplit = distribute(hydrocarbonIce, coldBias, rng);
  zonalHydrocarbons.tropical.ice = hcIceSplit.tropical; zonalHydrocarbons.temperate.ice = hcIceSplit.temperate; zonalHydrocarbons.polar.ice = hcIceSplit.polar;
  const dryIceGlobal = surface.dryIce?.initialValue || 0; if (dryIceGlobal > 0 || hasPolarIce) { const d = params.zonal.dryIceBias; const diBias = { tropical: d.tropical, temperate: d.temperate, polar: d.polar }; const diSplit = distribute(dryIceGlobal, diBias, rng); zonalCO2.tropical.ice = diSplit.tropical; zonalCO2.temperate.ice = diSplit.temperate; zonalCO2.polar.ice = diSplit.polar; }
  return { zonalWater, zonalHydrocarbons, zonalSurface, zonalCO2 };
}

// ===================== Planet override =====================
function buildPlanetOverride({ seed, star, aAU, isMoon, forcedType }, params) {
  const rng = mulberry32(seed);
  let classification;
  if (forcedType) {
    const typeAlb = params.classification.typeAlbedo[forcedType] ?? 0.3;
    const Teq = eqTempK(star.luminositySolar, aAU, typeAlb);
    classification = { type: forcedType, Teq, albedo: typeAlb };
  }
  let type = classification.type;
  const bulk = sampleBulk(rng, type, params);
  const landHa = surfaceAreaHa(bulk.radius_km);
  const { areaTotal } = depositsFromLandHa(landHa, params);
  if (!params.atmosphere.templates[type]) {
    const venusMin = params.classification.thresholdsK.venusMin ?? Infinity;
    type = classification.Teq > venusMin ? "venus-like" : "mars-like";
  }
  const atmo = buildAtmosphere(type, bulk.radius_km, bulk.gravity, rng, params);
  const surface = buildVolatiles(type, classification.Teq, landHa, rng, params);
  const rotation = (type === "titan-like" || type === "icy-moon") ? randRange(rng, 150, 450) : randRange(rng, 10, 48);
  const albedo = classification.albedo;
  const zonal = buildZonalDistributions(type, classification.Teq, surface, landHa, rng, params);
  const surfaceArea = 4 * Math.PI * Math.pow(bulk.radius_km * 1000, 2);
  const tmpTerraforming = { ...zonal, celestialParameters: { surfaceArea } };
  const zonesList = ["tropical","temperate","polar"]; const zonalCoverageCache = {};
  for (const z of zonesList) {
    zonalCoverageCache[z] = {
      liquidWater: calculateZonalCoverageLocal(tmpTerraforming, z, "liquidWater", params),
      ice: calculateZonalCoverageLocal(tmpTerraforming, z, "ice", params),
      buriedIce: calculateZonalCoverageLocal(tmpTerraforming, z, "buriedIce", params),
      biomass: calculateZonalCoverageLocal(tmpTerraforming, z, "biomass", params),
      dryIce: calculateZonalCoverageLocal(tmpTerraforming, z, "dryIce", params),
      liquidMethane: calculateZonalCoverageLocal(tmpTerraforming, z, "liquidMethane", params),
      hydrocarbonIce: calculateZonalCoverageLocal(tmpTerraforming, z, "hydrocarbonIce", params),
    };
  }
  const avgWater = calculateAverageCoverageLocal(zonalCoverageCache, "liquidWater", params);
  const avgIce = calculateAverageCoverageLocal(zonalCoverageCache, "ice", params);
  const avgBio = calculateAverageCoverageLocal(zonalCoverageCache, "biomass", params);
  const avgHydro = calculateAverageCoverageLocal(zonalCoverageCache, "liquidMethane", params);
  const avgHydroIce = calculateAverageCoverageLocal(zonalCoverageCache, "hydrocarbonIce", params);
  const avgDryIce = calculateAverageCoverageLocal(zonalCoverageCache, "dryIce", params);
  const surfaceFractions = calculateSurfaceFractionsLocal(avgWater, avgIce, avgBio, avgHydro, avgHydroIce, avgDryIce);

  // Atmosphere composition & pressure for physics model
  let totalAtmoMass = 0; const compMass = {};
  for (const g in atmo) { const m = atmo[g]?.initialValue || 0; compMass[g] = m; totalAtmoMass += m; }
  const composition = {}; if (totalAtmoMass > 0) { if (compMass.carbonDioxide) composition.co2 = compMass.carbonDioxide / totalAtmoMass; if (compMass.atmosphericWater) composition.h2o = compMass.atmosphericWater / totalAtmoMass; if (compMass.atmosphericMethane) composition.ch4 = compMass.atmosphericMethane / totalAtmoMass; if (compMass.hydrogen) composition.h2 = compMass.hydrogen / totalAtmoMass; if (compMass.sulfuricAcid) composition.h2so4 = compMass.sulfuricAcid / totalAtmoMass; }
  const surfacePressureBar = calcAtmPressure ? calcAtmPressure(totalAtmoMass, bulk.gravity, bulk.radius_km) / 100000 : 0;
  const SOLAR_FLUX_1AU = 1361; const flux = (SOLAR_FLUX_1AU * (star.luminositySolar || 1)) / (aAU * aAU);
  const temps = dayNightTemperaturesModelFn ? dayNightTemperaturesModelFn({ groundAlbedo: classification.albedo, flux, rotationPeriodH: rotation, surfacePressureBar, composition, surfaceFractions, gSurface: bulk.gravity }) : { day: 0, night: 0, mean: 0, albedo };
  classification.Teq = temps.mean;

  // Natural magnetosphere roll (centralized)
  const magChance = (params.magnetosphere.chanceByType[type] ?? params.magnetosphere.defaultChance);
  const hasNaturalMagnetosphere = (mulberry32(seed ^ 0xA11CE)() < magChance);

 // Randomized, seed-stable ore + geothermal
  const oreRng = mulberry32(seed ^ 0x0A11);
  const geoRng = mulberry32(seed ^ 0x0A12);
  const oreCaps = computeOreCaps(areaTotal, type, oreRng, params);
  const geoCaps = computeGeothermalCaps(type, areaTotal, isMoon, geoRng, params);

  const underground = {
    ore: {
      name: "Ore deposits",
      initialValue: oreCaps.initial,
      maxDeposits: oreCaps.max,
      hasCap: true,
      areaTotal,
      unlocked: false
    },
    ...({
      geothermal: {
        name: "Geo. vent",
        initialValue: geoCaps.initial,
        maxDeposits: geoCaps.max,
        hasCap: true,
        areaTotal,
        unlocked: false
      }
    })
  };

  // Specials / collectibles
  const special = {};
  if (DEFAULT_PARAMS.specials.includeAlbedoUpgrades) special.albedoUpgrades = { name: "Albedo upgrades", hasCap: true, baseCap: landHa * 10000, initialValue: 0, unlocked: false };
  if (DEFAULT_PARAMS.specials.includeSpaceships)    special.spaceships      = { name: "Spaceships", hasCap: false, initialValue: 0, unlocked: false };
  if (DEFAULT_PARAMS.specials.includeAlienArtifact) special.alienArtifact   = { name: "Alien artifact", hasCap: false, initialValue: 0, unlocked: false };

  // Optional parent body for moons
  let parentBody = undefined; if (isMoon) { const gg = (function makeGasGiant(r) { const Mj = 1.898e27; return { mass: randRange(r, 0.3, 3.0) * Mj, radius_km: randRange(r, 30000, 80000), orbitRadius_km: Math.floor(randRange(r, 600000, 2500000)) }; })(mulberry32(seed ^ 0xFACE)); parentBody = { name: "Gas Giant", mass: gg.mass, radius: gg.radius_km, orbitRadius: gg.orbitRadius_km }; }

  // Initial colony caps scale
  const baseCapScale = clamp(landHa / DEFAULT_PARAMS.volatiles.referenceLandHa, 0.3, 3);
  // Attach star to the overrides so deepMerge(defaultPlanetParameters, overrides)
  // replaces the default Sun with the RWG-generated star for this system.
  const sLum = star.luminositySolar || 1;
  const sScale = Math.sqrt(sLum);
  const starOverride = {
    name: star.name,
    spectralType: star.spectralType,
    luminositySolar: sLum,
    massSolar: star.massSolar,
    radiusSolar: star.radiusSolar,
    temperatureK: star.temperatureK,
    habitableZone: star.habitableZone || { inner: 0.95 * sScale, outer: 1.37 * sScale }
  };

  const baseColor = pickBaseColorForType(classification?.type || type);
  const overrides = {
    name: planetName(seed, params),
    resources: { colony: deepMerge(defaultPlanetParameters.resources.colony), surface, underground, atmospheric: atmo, special },
    ...zonal,
    zonalCoverageCache,
    finalTemps: { mean: temps.mean, day: temps.day, night: temps.night },
    fundingRate: Math.round(randRange(mulberry32(seed ^ 0xB00B), 5, 15)),
    buildingParameters: { maintenanceFraction: 0.001 },
    populationParameters: { workerRatio: 0.5 },
    gravityPenaltyEnabled: true,
    celestialParameters: { distanceFromSun: aAU, gravity: bulk.gravity, radius: bulk.radius_km, mass: bulk.mass, albedo, rotationPeriod: rotation, starLuminosity: sLum, parentBody, surfaceArea, temperature: { day: temps.day, night: temps.night, mean: temps.mean }, actualAlbedo: temps.albedo, cloudFraction: temps.cfCloud, hazeFraction: temps.cfHaze, hasNaturalMagnetosphere },
    star: starOverride,
    classification: { archetype: type, TeqK: Math.round(classification.Teq) },
    visualization: { baseColor },
    rwgMeta: { generatorSeedInt: seed }
  };
  return overrides;
}

function computeOreCaps(areaTotal, type, rng, params) {
  const p = params.deposits.ore || {};
  const density = (p.densityByType?.[type] ?? p.densityByType?.default ?? 1);
  const jitterRange = p.maxJitterRange || [0.85, 1.15];
  const jitterMax = randRange(rng, jitterRange[0], jitterRange[1]);

  const baseMax = Math.round(areaTotal * params.deposits.maxDepositsFraction);
  let max = Math.max(p.minMax ?? 5, Math.round(baseMax * density * jitterMax));

  // NEW: uniform integer initial in [3, 10], clamped by max (and >=1 for tiny worlds)
  const rollInt = (lo, hi) => Math.floor(randRange(rng, lo, hi + 1));
  const lo = (max >= 3) ? 3 : 1;
  const hi = Math.min(10, max);
  const initial = (hi >= lo) ? rollInt(lo, hi) : Math.max(1, Math.min(max, 3));

  if (initial > max) initial = max;
  return { initial, max };
}

function computeGeothermalCaps(type, areaTotal, isMoon, rng, params) {
  const g = params.deposits.geothermal;

  // Intrinsic activity + occasional tidal boost for moons
  const base = g.baseActivityByType?.[type] ?? g.baseActivityByType?.default ?? 0;
  const jitter = 1 + randRange(rng, -0.10, 0.10);
  const tidalActive = isMoon && (rng() < (g.moonTidalChance ?? 0.45));
  const tidal = tidalActive ? (g.tidalBonusIfMoon ?? 0.35) : 0;
  const activity = clamp((base + tidal) * jitter, 0, 1);

  // Most worlds: no geothermal at all
  if (activity < (g.activityThreshold ?? 0.35)) {
    return { present: false, initial: 0, max: 0 };
  }

  // Independent randomness: vents per area (not tied to ore)
  const perAreaMin = Math.max(0, g.perAreaMin ?? 0.00005);
  const perAreaMax = Math.max(perAreaMin, g.perAreaMax ?? 0.00080);
  const ventsPerArea = randRange(rng, perAreaMin, perAreaMax) * activity;

  // Varied max; small but nonzero worlds won’t all land on the same number
  const rawMax = areaTotal * ventsPerArea;
  const max = Math.max(3, Math.round(rawMax));

  // Seed-random initial between ~10–40% of max (at least 1)
  const initFrac = randRange(rng, 0.01, 0.04);
  const initial = Math.max(1, Math.min(max, Math.round(max * initFrac)));

  return { present: true, initial, max };
}


// ===================== Manager =====================
class RwgManager extends EffectableEntity {
  constructor(paramsOverride) {
    super({ description: "Random World Generator Manager" });
    this.params = resolveParams(DEFAULT_PARAMS, paramsOverride);
    this.lockedOrbits = new Set(["hot"]);
    this.lockedTypes = new Set(["venus-like"]);
  }
  // Param API
  setParams(overrides) { this.params = resolveParams(this.params, overrides); }
  getParams() { return JSON.parse(JSON.stringify(this.params)); }
  withParams(overrides) { const merged = resolveParams(this.params, overrides || {}); return new RwgManager(merged); }

  // Locks
  isOrbitLocked(o) { return this.lockedOrbits.has(o); }
  lockOrbit(o) { this.lockedOrbits.add(o); }
  unlockOrbit(o) { this.lockedOrbits.delete(o); }
  isTypeLocked(t) { return this.lockedTypes.has(t); }
  lockType(t) { this.lockedTypes.add(t); }
  unlockType(t) { this.lockedTypes.delete(t); }
  getAvailableOrbits() { return ["hz-inner", "hz-mid", "hz-outer", "hot", "cold", "very-cold"].filter((o) => !this.lockedOrbits.has(o)); }
  getAvailableTypes(isMoon) {
    const base = isMoon
      ? ["icy-moon", "titan-like"]
      : ["mars-like", "cold-desert", "titan-like", "venus-like",
        "carbon-planet", "desiccated-desert", "super-earth"];
    return base.filter((t) => !this.lockedTypes.has(t));
  }

  applyEffect(effect) {
    if (effect.type === 'unlockOrbit') {
      this.unlockOrbit(effect.targetId);
    } else if (effect.type === 'lockOrbit') {
      this.lockOrbit(effect.targetId);
    } else if (effect.type === 'enable' && effect.type2 === 'orbit') {
      // Backward compatibility for older save effects
      this.unlockOrbit(effect.targetId);
    }
  }

  generateRandomPlanet(seed, opts = {}) {
    const P = resolveParams(this.params, opts.params);
    const { seedInt: S, baseSeed, ann: seedAnn } = parseSeedSpec(seed);

    // Star
    const star = opts.star ?? generateStar(S ^ 0x1234, P);

    // Orbit preset & aAU — single orbit RNG stream
    const rngOrbit = mulberry32(S ^ 0xF00D);
    let aAU = opts.aAU;
    let usedPreset = opts.orbitPreset;
    if ((!usedPreset || usedPreset === "auto") && seedAnn?.orbitPreset) usedPreset = seedAnn.orbitPreset;

    if (aAU === undefined) {
      // (1) Choose the preset using rngOrbit
      if (!usedPreset || usedPreset === "auto") {
        let candidates = Array.isArray(opts.availableOrbits) ? opts.availableOrbits.slice() : this.getAvailableOrbits();
        if (Array.isArray(opts.lockedOrbits)) candidates = candidates.filter(o => !opts.lockedOrbits.includes(o));
        candidates = candidates.filter(Boolean);
        if (candidates.length > 0) usedPreset = candidates[Math.floor(rngOrbit() * candidates.length)];
      }

      // (2) Draw r from the same rngOrbit and place orbit by flux band
      if (usedPreset && usedPreset !== "auto") {
        const r = rngOrbit();
        const lum = star.luminositySolar || 1;
        const SOLAR = 1361;
        const band = (name) => P.orbit.presets[name];

        let lo, hi;
        if      (usedPreset === "hz-inner") [lo, hi] = band("hzInnerFluxWm2");
        else if (usedPreset === "hz-mid")   [lo, hi] = band("hzMidFluxWm2");
        else if (usedPreset === "hz-outer") [lo, hi] = band("hzOuterFluxWm2");
        else if (usedPreset === "hot")      [lo, hi] = band("hotFluxWm2");
        else if (usedPreset === "cold")     [lo, hi] = band("coldFluxWm2");
        else if (usedPreset === "very-cold") [lo, hi] = band("veryColdFluxWm2");

        if (lo !== undefined) {
          const flux = lo + r * (hi - lo);
          aAU = Math.sqrt((lum * SOLAR) / flux);
        }
      }
    }
    // Target (planet vs moon) — derived
    let isMoon = (typeof opts.isMoon === "boolean") ? opts.isMoon : undefined;
    const tgt = opts.target || seedAnn?.target;
    if (typeof isMoon !== "boolean") { if (tgt === "moon") isMoon = true; else if (tgt === "planet") isMoon = false; else isMoon = (aAU > P.orbit.moonChance.thresholdAU && mulberry32(S ^ 0xBADA55)() < P.orbit.moonChance.chance); }

    // Type — derived
    let forcedType = opts.archetype || opts.type; if ((!forcedType || forcedType === "auto") && seedAnn?.type) { forcedType = seedAnn.type; }
    if (!forcedType || forcedType === "auto") {
      const rngType = mulberry32(S ^ 0xC0FFEE);
      let candidates = Array.isArray(opts.availableTypes) ? opts.availableTypes.slice() : this.getAvailableTypes(isMoon);
      if (Array.isArray(opts.lockedTypes)) candidates = candidates.filter((c) => !opts.lockedTypes.includes(c));
      if (candidates.length === 0) candidates = this.getAvailableTypes(isMoon);
      forcedType = candidates[Math.floor(rngType() * candidates.length)];
    }

    // Generate the rest using S directly
    const override = buildPlanetOverride({ seed: S ^ 0xBEEF, star, aAU, isMoon, forcedType }, P);

    // Canonical seed string (positional), always returned
    const canonicalSeed = buildSeedSpec(S, { target: isMoon ? "moon" : "planet", type: forcedType, orbitPreset: usedPreset });

    return { star, orbitAU: aAU, orbitPreset: usedPreset, isMoon, archetype: forcedType, seedInt: S, seedString: canonicalSeed, override, merged: deepMerge(defaultPlanetParameters, override) };
  }

  generateSystem(seed, planetCount, opts = {}) {
    const P = resolveParams(this.params, opts.params || {});
    const { seedInt: S } = parseSeedSpec(seed);
    const rng = mulberry32(S); const star = generateStar(S, P); const n = planetCount ?? Math.floor(randRange(rng, 3, 9)); const planets = [];
    for (let i = 0; i < n; i++) { const aAU = sampleOrbitAU(rng, i, P); const isMoon = aAU > P.orbit.moonChance.thresholdAU && rng() < P.orbit.moonChance.chance; const typePick = mulberry32(S ^ (0xC0FFEE ^ (i + 1)))(); const typeList = this.getAvailableTypes(isMoon); const forcedType = typeList[Math.floor(typePick * typeList.length)] || "mars-like"; const ov = buildPlanetOverride({ seed: S ^ ((i + 1) * 0x9e37), star, aAU, isMoon, forcedType }, P); planets.push({ name: ov.name, classification: ov.classification, orbitAU: aAU, merged: deepMerge(defaultPlanetParameters, ov) }); }
    return { star, planets };
  }
}

// Instance + wrappers
const rwgManager = new RwgManager();
function generateRandomPlanet(seed, opts) { return rwgManager.generateRandomPlanet(seed, opts); }
function generateSystem(seed, planetCount, opts) { return rwgManager.generateSystem(seed, planetCount, opts); }

// Expose globals (browser)
if (typeof globalThis !== "undefined") {
  globalThis.rwgManager = rwgManager;
  globalThis.generateRandomPlanet = generateRandomPlanet;
  globalThis.generateSystem = generateSystem;
  globalThis.DEFAULT_PARAMS = DEFAULT_PARAMS;
  globalThis.RWG_WORLD_TYPES = RWG_WORLD_TYPES;
  globalThis.RWG_TYPE_BASE_COLORS = RWG_TYPE_BASE_COLORS;
}

// CommonJS exports
try {
  module.exports = {
    RwgManager,
    rwgManager,
    generateRandomPlanet,
    generateSystem,
    DEFAULT_PARAMS,
    RWG_WORLD_TYPES,
    RWG_TYPE_BASE_COLORS,
  };
} catch (_) {}
