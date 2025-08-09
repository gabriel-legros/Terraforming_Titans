// ===== Random System + World Generator ===================================

// Node compatibility shims: ensure deepMerge and defaultPlanetParameters exist
if (typeof module !== 'undefined' && module.exports) {
  try {
    const pp = require('./planet-parameters.js');
    if (typeof defaultPlanetParameters === 'undefined') {
      globalThis.defaultPlanetParameters = pp.defaultPlanetParameters;
    }
  } catch (_) {}
}
if (typeof deepMerge === 'undefined') {
  function isObject(item) { return (item && typeof item === 'object' && !Array.isArray(item)); }
  function deepMerge(target, source) {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        const t = target[key];
        const s = source[key];
        if (isObject(t) && isObject(s)) output[key] = deepMerge(t, s);
        else if (s !== undefined) output[key] = s;
      });
    }
    return output;
  }
}

// --- Tiny seeded RNG (mulberry32) + string hash
function hashStringToInt(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h >>> 0);
  }
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function() {
      t += 0x6D2B79F5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  const randRange = (rng, a, b) => a + (b - a) * rng();
  const pickWeighted = (rng, items) => {
    const sum = items.reduce((s, it) => s + it.w, 0);
    let r = rng() * sum;
    for (const it of items) { r -= it.w; if (r <= 0) return it.v; }
    return items[items.length - 1].v;
  };
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const toTons = kg => kg / 1000;
  
  // --- Physics-ish helpers (rough but consistent)
  function habitableZoneAU(luminositySolar) {
    // Kasting-ish constants, simplified
    const root = Math.sqrt(luminositySolar);
    return { inner: 0.95 * root, outer: 1.37 * root };
  }
  function luminosityFromMassSolar(m) {
    // Main-sequence: L ~ M^3.5 (cap extremes a bit)
    return Math.max(0.0005, Math.min(100000, Math.pow(m, 3.5)));
  }
  function radiusFromMassSolar(m) {
    // Rough: R ~ M^0.8 for MS stars
    return Math.pow(m, 0.8);
  }
  function eqTempK(luminositySolar, distanceAU, albedo=0.3) {
    // Normalize to Earth ≈ 278 K at L=1, d=1, A=0.3
    const base = 278 * Math.pow(luminositySolar, 0.25) / Math.sqrt(distanceAU);
    // Albedo correction (~fourth-root scaling)
    return base * Math.pow((1 - albedo) / (1 - 0.3), 0.25);
  }
  function gravityFromMassRadius(M_kg, R_km) {
    const G = 6.67430e-11;
    const R_m = R_km * 1000;
    return (G * M_kg) / (R_m * R_m); // m/s^2
  }
  function surfaceAreaHa(radius_km) {
    const area_km2 = 4 * Math.PI * radius_km * radius_km;
    return Math.round(area_km2 * 100); // 1 km² = 100 ha
  }
  function totalAtmosphereMassTons(pressureBar, radius_km, gravity_ms2) {
    // M_atm ≈ 4πR² * P / g ; P in Pa, R in m; returns tons
    const P = pressureBar * 1e5; // bar -> Pa
    const R_m = radius_km * 1000;
    const M_kg = 4 * Math.PI * R_m * R_m * P / gravity_ms2;
    return toTons(M_kg);
  }
  
  // --- Star generator
  function generateStar(seed) {
    const rng = mulberry32(seed);
    // Spectral distribution (very skewed toward K/M)
    const spectral = pickWeighted(rng, [
      { v: 'M', w: 76 }, { v: 'K', w: 12 }, { v: 'G', w: 7.6 },
      { v: 'F', w: 3.0 }, { v: 'A', w: 1.2 }, { v: 'B', w: 0.2 }, { v: 'O', w: 0.02 }
    ]);
    const massRanges = {
      O: [16, 60], B: [2.1, 16], A: [1.4, 2.1], F: [1.1, 1.4],
      G: [0.9, 1.1], K: [0.6, 0.9], M: [0.08, 0.6]
    };
    const m = randRange(rng, ...massRanges[spectral]);
    const L = luminosityFromMassSolar(m);
    const R = radiusFromMassSolar(m);
    // very rough temperature (not used elsewhere, but nice to have)
    const Teff = 5772 * Math.pow(L / (R*R), 0.25);
  
    const hz = habitableZoneAU(L);
    return {
      name: starName(seed),
      spectralType: spectral,
      massSolar: m,
      luminositySolar: L,
      radiusSolar: R,
      temperatureK: Math.round(Teff),
      habitableZone: hz
    };
  }
  function starName(seed) {
    const syll = ["al","be","ce","do","er","fi","ga","ha","io","ju","ka","lu","me","no","or","pi","qu","ra","su","ta","ul","ve","wo","xi","ya","zo"];
    const rng = mulberry32(seed ^ 0x9e3779b9);
    const pick = () => syll[Math.floor(rng()*syll.length)];
    const core = (pick()+pick()+pick());
    const num = Math.floor(rng()*999)+1;
    return core.charAt(0).toUpperCase()+core.slice(1)+"-"+num;
  }
  
  // --- Orbit sampler (AU), log-spread
  function sampleOrbitAU(rng, i) {
    // 0.2–30 AU, mild spacing by index
    const min = 0.2, max = 30;
    const t = rng(); // 0..1
    const logMin = Math.log(min), logMax = Math.log(max);
    const base = Math.exp(logMin + (logMax - logMin) * t);
    // Nudge outward with index to avoid heavy overlaps
    return base * (1 + 0.25 * i);
  }
  
  // --- Gas giant maker (for moons)
  function makeGasGiant(rng) {
    const Mj = 1.898e27;
    const mass = randRange(rng, 0.3, 3.0) * Mj;
    const radius_km = randRange(rng, 30000, 80000);
    return { name: "GasGiant", mass, radius_km, orbitRadius_km: Math.floor(randRange(rng, 600000, 2_500_000)) };
  }
  
  // --- Planet bulk pick for rocky/icy bodies (mass-radius-density consistency)
  function sampleBulk(rng, archetype) {
    const Me = 5.972e24, Re_km = 6371;
    // Radius ranges (Earth radii) by archetype
    const radiusRanges = {
      "venus-like":       [0.85, 1.05],
      "temperate-terran": [0.90, 1.20],
      "mars-like":        [0.30, 0.60],
      "hot-rocky":        [0.50, 1.40],
      "icy-moon":         [0.25, 0.70],
      "titan-like":       [0.25, 0.60],
      "cold-desert":      [0.40, 0.90]
    }[archetype];

    // Density ranges relative to Earth (rocky ~0.8–1.1, icy ~0.3–0.6)
    const densityRanges = {
      "venus-like":       [0.95, 1.10],
      "temperate-terran": [0.90, 1.05],
      "mars-like":        [0.70, 0.95],
      "hot-rocky":        [0.85, 1.05],
      "icy-moon":         [0.30, 0.55],
      "titan-like":       [0.35, 0.60],
      "cold-desert":      [0.80, 1.00]
    }[archetype];

    // Sample radius first to set surface area/land; then mass from density * R^3
    const radius_rel = randRange(rng, radiusRanges[0], radiusRanges[1]);
    const density_rel = randRange(rng, densityRanges[0], densityRanges[1]);
    const mass_rel = density_rel * Math.pow(radius_rel, 3);

    const mass = mass_rel * Me;
    const radius_km = radius_rel * Re_km;
    const gravity = gravityFromMassRadius(mass, radius_km);
    return { mass, radius_km, gravity };
  }
  
  // --- Archetype classifier from star/orbit/equil temp and "moon-ness"
  function classifyWorld({rng, star, aAU, isMoon}) {
    // quick first-pass albedo guess to compute T_eq
    const albedoGuess = aAU > star.habitableZone.outer ? 0.55 : 0.3;
    const Teq = eqTempK(star.luminositySolar, aAU, albedoGuess);
  
    // Decide archetype
    if (isMoon) {
      if (Teq >= 80 && Teq <= 110 && rng() < 0.7) return { type: "titan-like", Teq, albedo: 0.15 };
      return { type: "icy-moon", Teq, albedo: 0.17 };
    }
    if (Teq > 330) return { type: "venus-like", Teq, albedo: 0.75 };
    if (Teq > 290) return { type: "rocky", Teq, albedo: 0.35 };
    if (Teq >= 255 && Teq <= 290 && rng() < 0.2) return { type: "temperate-terran", Teq, albedo: 0.3 }; // rare
    if (Teq >= 200 && Teq < 255) return { type: "mars-like", Teq, albedo: 0.25 };
    if (Teq < 200) return { type: "cold-desert", Teq, albedo: 0.5 };
    return { type: "mars-like", Teq, albedo: 0.25 };
  }
  
  // --- Atmosphere templates (target surface pressure + gas fractions)
  const atmoTemplates = {
    "venus-like":       { pressureBar: 90,  mix: { carbonDioxide: 0.965, inertGas: 0.03, oxygen: 0.0003, atmosphericWater: 0.0047 } },
    "temperate-terran": { pressureBar: 1.0, mix: { carbonDioxide: 0.0006, inertGas: 0.78, oxygen: 0.209, atmosphericWater: 0.0104 } },
    "mars-like":        { pressureBar: 0.006, mix: { carbonDioxide: 0.95, inertGas: 0.03, oxygen: 0.0016, atmosphericWater: 0.0004 } },
    "rocky":            { pressureBar: 0.6,  mix: { carbonDioxide: 0.9, inertGas: 0.09, oxygen: 0.005, atmosphericWater: 0.005 } },
    "cold-desert":      { pressureBar: 0.02, mix: { carbonDioxide: 0.85, inertGas: 0.14, oxygen: 0.0005, atmosphericWater: 0.0095 } },
    "icy-moon":         { pressureBar: 0.00001, mix: { carbonDioxide: 0.7, inertGas: 0.299, oxygen: 0.001, atmosphericWater: 0.0001 } },
    "titan-like":       { pressureBar: 1.4,  mix: { carbonDioxide: 0.00006, inertGas: 0.98, oxygen: 1e-6, atmosphericWater: 1e-9, atmosphericMethane: 0.02 } }
  };
  
  function buildAtmosphere(archetype, radius_km, gravity, rng) {
    const tpl = atmoTemplates[archetype];
    // Randomize pressure around template by type-specific bands
    const bands = {
      'venus-like': [0.8, 1.2],
      'rocky': [0.3, 2.0],
      'mars-like': [0.3, 3.0],
      'cold-desert': [0.2, 2.0],
      'icy-moon': [0.1, 10.0],
      'titan-like': [0.7, 1.3],
      'temperate-terran': [0.8, 1.2]
    };
    const band = bands[archetype] || [0.5, 1.5];
    const pressureBar = tpl ? tpl.pressureBar * randRange(rng, band[0], band[1]) : randRange(rng, 0.001, 2.0);

    const totalTons = totalAtmosphereMassTons(pressureBar, radius_km, gravity);

    // Jitter gas mix slightly and renormalize
    const baseMix = (tpl && tpl.mix) ? tpl.mix : {};
    const mixKeys = ["carbonDioxide","inertGas","oxygen","atmosphericWater","atmosphericMethane"];
    const jittered = {};
    let sum = 0;
    for (const k of mixKeys) {
      const base = baseMix[k] || 0;
      if (base <= 0) { jittered[k] = 0; continue; }
      const jitter = 1 + randRange(rng, -0.25, 0.25);
      const val = Math.max(0, base * jitter);
      jittered[k] = val;
      sum += val;
    }
    // Renormalize to 1. If all zeros, allocate all to inert gas
    const gas = {};
    if (sum <= 0) {
      gas.inertGas = { initialValue: totalTons, unlocked: false };
      for (const k of mixKeys) if (k !== 'inertGas') gas[k] = { initialValue: 0, unlocked: false };
      return gas;
    }
    let allocated = 0;
    for (const k of mixKeys) {
      const frac = (jittered[k] || 0) / sum;
      const v = frac * totalTons;
      gas[k] = { initialValue: v, unlocked: false };
      allocated += v;
    }
    // rounding guard: distribute residue to inert gas
    const residue = totalTons - allocated;
    if (residue > 0 && gas.inertGas) gas.inertGas.initialValue += residue;

    return gas;
  }
  
  // --- Resource scaler helpers
  function depositsFromLandHa(landHa) {
    const areaTotal = Math.round(landHa / 100000);      // matches your convention
    const maxDeposits = Math.round(areaTotal * 0.10);   // 1 per 1e6 ha
    return { areaTotal, maxDeposits };
  }
  
  // --- Water/hydrocarbon partitioner
  function buildVolatiles(archetype, Teq, landHa, rng) {
    // crude stocks (tons) scaled by body size; tuned to feel right vs Mars/Titan
    const landScale = landHa / 14_400_000_000; // relative to Mars
    const surface = {
      land: { initialValue: landHa, hasCap: true, unlocked: false },
      ice: { initialValue: 0, unlocked: false, unit: 'ton' },
      liquidWater: { initialValue: 0, unlocked: false, unit: 'ton' },
      dryIce: { initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      liquidMethane: { initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      hydrocarbonIce: { initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      scrapMetal: { initialValue: 0, unlocked: false, unit: 'ton' },
      biomass: { initialValue: 0, hasCap: false, unlocked: false, unit: 'ton' }
    };
  
    // Baselines (order of magnitude)
    const H2O_total = {
      "venus-like":       1e12,
      "temperate-terran": 3e16,
      "mars-like":        8e15,
      "rocky":            5e14,
      "cold-desert":      2e16,
      "icy-moon":         4e19,
      "titan-like":       1e19
    }[archetype] * landScale;
  
    const CH4_total = {
      "titan-like":       3e14,
      "icy-moon":         2e10,
      "cold-desert":      1e9,
      "mars-like":        0,
      "venus-like":       0,
      "rocky":            0,
      "temperate-terran": 0
    }[archetype] * landScale;
  
    // Partition water by temperature
    if (archetype === "temperate-terran") {
      const fracLiquid = clamp((Teq - 255) / 80, 0.3, 0.9);
      surface.liquidWater.initialValue = H2O_total * fracLiquid;
      surface.ice.initialValue = H2O_total * (1 - fracLiquid);
    } else if (Teq < 273) {
      // cold worlds: mostly ice, some dry ice if CO2 freezes (Teq < ~195 K)
      surface.ice.initialValue = H2O_total * 0.999;
      if (Teq < 195) surface.dryIce.initialValue = 1e10 * landScale;
    } else {
      // hot: no surface ice, maybe some water
      surface.liquidWater.initialValue = H2O_total * 0.05;
    }
  
    // Hydrocarbons
    if (CH4_total > 0) {
      if (Teq < 95) {
        surface.hydrocarbonIce.initialValue = CH4_total;
      } else if (Teq < 110) {
        surface.liquidMethane.initialValue = CH4_total;
      } else {
        // unstable methane at higher temps
        surface.hydrocarbonIce.initialValue = CH4_total * 0.2;
      }
    }
  
    return surface;
  }

  // --- Zonal initial guesses (tropical/temperate/polar)
  function getZoneFractionsSafe() {
    try {
      if (typeof getZonePercentage === 'function') {
        return {
          tropical: getZonePercentage('tropical'),
          temperate: getZonePercentage('temperate'),
          polar: getZonePercentage('polar')
        };
      }
    } catch (_) {}
    // Fallback rough areas if zones.js isn't available
    return { tropical: 0.4, temperate: 0.4, polar: 0.2 };
  }

  function distribute(amount, weights, rng) {
    const keys = Object.keys(weights);
    // jitter weights ±10% to create variability
    const jittered = {};
    let sum = 0;
    for (const k of keys) {
      const j = 1 + randRange(rng, -0.1, 0.1);
      const val = Math.max(0, weights[k] * j);
      jittered[k] = val;
      sum += val;
    }
    const out = {};
    if (sum <= 0 || !isFinite(sum)) {
      keys.forEach(k => out[k] = 0);
    } else {
      keys.forEach(k => out[k] = amount * (jittered[k] / sum));
    }
    return out;
  }

  function buildZonalDistributions(type, Teq, surface, landHa, rng) {
    const frac = getZoneFractionsSafe();
    const zonalWater = { tropical: { liquid: 0, ice: 0, buriedIce: 0 }, temperate: { liquid: 0, ice: 0, buriedIce: 0 }, polar: { liquid: 0, ice: 0, buriedIce: 0 } };
    const zonalHydrocarbons = { tropical: { liquid: 0, ice: 0 }, temperate: { liquid: 0, ice: 0 }, polar: { liquid: 0, ice: 0 } };
    const zonalSurface = { tropical: { dryIce: 0 }, temperate: { dryIce: 0 }, polar: { dryIce: 0 } };

    // Liquid water prefers warmer zones; ice prefers polar
    const liquidWater = surface.liquidWater?.initialValue || 0;
    const ice = surface.ice?.initialValue || 0;
    const hasPolarIce = ice > 0 || Teq < 273;
    const warmBias = { tropical: 1.0 * frac.tropical, temperate: 0.6 * frac.temperate, polar: 0.1 * frac.polar };
    const coldBias = { tropical: 0.05 * frac.tropical, temperate: 0.2 * frac.temperate, polar: 0.75 * frac.polar };
    const liquidSplit = distribute(liquidWater, warmBias, rng);
    const iceSplit = distribute(ice, coldBias, rng);
    zonalWater.tropical.liquid = liquidSplit.tropical;
    zonalWater.temperate.liquid = liquidSplit.temperate;
    zonalWater.polar.liquid = liquidSplit.polar;
    zonalWater.tropical.ice = iceSplit.tropical;
    zonalWater.temperate.ice = iceSplit.temperate;
    zonalWater.polar.ice = iceSplit.polar;

    // Buried ice heuristic: scale with climate
    let buriedFactor = 0.5;
    if (type === 'icy-moon') buriedFactor = 5.0;
    else if (type === 'titan-like') buriedFactor = 3.0;
    else if (type === 'cold-desert') buriedFactor = 2.0;
    else if (type === 'mars-like') buriedFactor = 1.5;
    else if (type === 'temperate-terran') buriedFactor = 0.2;
    else if (type === 'venus-like' || type === 'rocky') buriedFactor = 0.1;
    const buriedTotal = (surface.ice?.initialValue || 0) * buriedFactor;
    // Favor lower latitudes for buried ice but still allow polar storage
    const buriedBias = { tropical: 1.0 * frac.tropical, temperate: 1.0 * frac.temperate, polar: 0.3 * frac.polar };
    const buriedSplit = distribute(buriedTotal, buriedBias, rng);
    zonalWater.tropical.buriedIce = buriedSplit.tropical;
    zonalWater.temperate.buriedIce = buriedSplit.temperate;
    zonalWater.polar.buriedIce = buriedSplit.polar;

    // Hydrocarbons: Titan-like puts liquids at poles, icy-moon puts ices at poles
    const liquidMethane = surface.liquidMethane?.initialValue || 0;
    const hydrocarbonIce = surface.hydrocarbonIce?.initialValue || 0;
    const titanLiquidBias = { tropical: 0.05 * frac.tropical, temperate: 0.25 * frac.temperate, polar: 0.70 * frac.polar };
    const coldLiquidBias = { tropical: 0.10 * frac.tropical, temperate: 0.40 * frac.temperate, polar: 0.50 * frac.polar };
    const liquidCH4Bias = (type === 'titan-like') ? titanLiquidBias : coldLiquidBias;
    const liquidCH4Split = distribute(liquidMethane, liquidCH4Bias, rng);
    zonalHydrocarbons.tropical.liquid = liquidCH4Split.tropical;
    zonalHydrocarbons.temperate.liquid = liquidCH4Split.temperate;
    zonalHydrocarbons.polar.liquid = liquidCH4Split.polar;
    const hcIceBias = coldBias;
    const hcIceSplit = distribute(hydrocarbonIce, hcIceBias, rng);
    zonalHydrocarbons.tropical.ice = hcIceSplit.tropical;
    zonalHydrocarbons.temperate.ice = hcIceSplit.temperate;
    zonalHydrocarbons.polar.ice = hcIceSplit.polar;

    // Dry ice mostly polar if present
    const dryIceGlobal = surface.dryIce?.initialValue || 0;
    if (dryIceGlobal > 0 || hasPolarIce) {
      const diBias = { tropical: 0.0, temperate: 0.05, polar: 0.95 };
      const diSplit = distribute(dryIceGlobal, diBias, rng);
      zonalSurface.tropical.dryIce = diSplit.tropical;
      zonalSurface.temperate.dryIce = diSplit.temperate;
      zonalSurface.polar.dryIce = diSplit.polar;
    }

    return { zonalWater, zonalHydrocarbons, zonalSurface };
  }
  
  // --- Build a planet override (the bit you merge with defaults)
  function buildPlanetOverride({seed, star, aAU, isMoon, forcedType}) {
    const rng = mulberry32(seed);
    let classification;
    if (forcedType) {
      const typeAlb = {
        'venus-like': 0.75,
        'temperate-terran': 0.30,
        'mars-like': 0.25,
        'rocky': 0.35,
        'cold-desert': 0.50,
        'icy-moon': 0.17,
        'titan-like': 0.15
      }[forcedType] ?? 0.30;
      const Teq = eqTempK(star.luminositySolar, aAU, typeAlb);
      classification = { type: forcedType, Teq, albedo: typeAlb };
    } else {
      classification = classifyWorld({rng, star, aAU, isMoon});
    }
    let type = classification.type;
  
    // bulk properties
    const bulk = sampleBulk(rng, type);
    const landHa = surfaceAreaHa(bulk.radius_km);
    const { areaTotal, maxDeposits } = depositsFromLandHa(landHa);
  
    // atmosphere (ensure template exists for this type)
    if (!atmoTemplates[type]) {
      type = (classification.Teq > 290 && classification.Teq <= 330) ? 'rocky' : 'mars-like';
    }
    const atmo = buildAtmosphere(type, bulk.radius_km, bulk.gravity, rng);
  
    // volatiles (surface water, ice, methane…)
    const surface = buildVolatiles(type, classification.Teq, landHa, rng);
  
    // underground
    const underground = {
      ore: { name: 'Ore deposits', initialValue: Math.max(2, Math.floor(maxDeposits * 0.0002)), maxDeposits, hasCap: true, areaTotal, unlocked: false },
      geothermal: { name: 'Geo. vent', initialValue:
        (type === 'temperate-terran' || type === 'rocky') ? 5 :
        (type === 'mars-like') ? 3 :
        (type === 'titan-like' || type === 'icy-moon' || type === 'cold-desert') ? 1 : 2,
        maxDeposits: Math.max(3, Math.floor(areaTotal * 0.002)), hasCap: true, areaTotal, unlocked: false }
    };
  
    // specials
    const special = {
      albedoUpgrades: { name: 'Albedo upgrades', hasCap: true, baseCap: landHa * 10000, initialValue: 0, unlocked: false },
      spaceships: { name: 'Spaceships', hasCap: false, initialValue: 0, unlocked: false },
      alienArtifact: { name: 'Alien artifact', hasCap: false, initialValue: 0, unlocked: false },
      seed: { name: 'Generator Seed', hasCap: false, initialValue: seed, unlocked: false }
    };
  
    // celestial
    const rotation = (type === 'titan-like' || type === 'icy-moon') ? randRange(rng, 150, 450) : randRange(rng, 10, 48);
    const distanceFromSun = aAU;
    const albedo = classification.albedo;
  
    // optional parent body for moons
    let parentBody = undefined;
    if (isMoon) {
      const gg = makeGasGiant(rng);
      parentBody = {
        name: 'Gas Giant',
        mass: gg.mass,
        orbitRadius: gg.orbitRadius_km
      };
    }
  
    // initial colony caps: scale with size a bit
    const baseCapScale = clamp(landHa / 14_400_000_000, 0.3, 3);
    const colonyCaps = {
      energy: { baseCap: Math.round(50_000_000 * baseCapScale) },
      metal: { baseCap: Math.round(5000 * baseCapScale) },
      silicon: { baseCap: Math.round(5000 * baseCapScale) },
      glass: { baseCap: Math.round(5000 * baseCapScale) },
      water: { baseCap: Math.round(5000 * baseCapScale) },
      food: { baseCap: Math.round(5000 * baseCapScale) },
      components: { baseCap: Math.round(500 * baseCapScale) },
      electronics: { baseCap: Math.round(200 * baseCapScale) },
      superconductors: { baseCap: Math.round(200 * baseCapScale) },
      androids: { baseCap: Math.round(1000 * baseCapScale) }
    };
  
    const overrides = {
      name: planetName(seed),
      resources: {
        colony: deepMerge(defaultPlanetParameters.resources.colony, colonyCaps),
        surface,
        underground,
        atmospheric: atmo,
        special
      },
      // Initial zonal guesses to seed terraforming models
      ...buildZonalDistributions(type, classification.Teq, surface, landHa, rng),
      fundingRate: Math.round(randRange(rng, 5, 15)), // tweak to taste
      buildingParameters: { maintenanceFraction: 0.001 },
      populationParameters: { workerRatio: 0.5 },
      celestialParameters: {
        distanceFromSun,
        gravity: bulk.gravity,
        radius: bulk.radius_km,
        mass: bulk.mass,
        albedo,
        rotationPeriod: rotation,
        parentBody
      },
      // lightweight tag to your requested classification
      classification: { archetype: type, TeqK: Math.round(classification.Teq) }
    };
  
    return overrides;
  }
  function planetName(seed) {
    const rng = mulberry32(seed ^ 0xA5A5A5);
    const syll = ["ta","ri","no","ka","mi","sa","lo","ve","du","an","ke","yo","ze","ur","phi","ran","sol","ter","mar","cal","thy","gan","tan","cys"];
    const s = () => syll[Math.floor(rng()*syll.length)];
    const core = s()+s()+s();
    return core.charAt(0).toUpperCase() + core.slice(1);
  }
  
  // --- Public API -----------------------------------------------------------
  function generateRandomPlanet(seed, opts={}) {
    const s = (typeof seed === 'string') ? hashStringToInt(seed) : (seed >>> 0);
    const rng = mulberry32(s);
    const star = opts.star ?? generateStar(s ^ 0x1234);
    const index = opts.index ?? 0;
    const aAU = opts.aAU ?? sampleOrbitAU(rng, index);
    const isMoon = opts.isMoon ?? (aAU > 3 && rng() < 0.35);
    const forcedType = opts.archetype || opts.type;
    const override = buildPlanetOverride({ seed: s ^ 0xBEEF, star, aAU, isMoon, forcedType });
    return {
      star,
      orbitAU: aAU,
      override,
      merged: deepMerge(defaultPlanetParameters, override) // ready to play
    };
  }
  
  function generateSystem(seed, planetCount) {
    const s = (typeof seed === 'string') ? hashStringToInt(seed) : (seed >>> 0);
    const rng = mulberry32(s);
    const star = generateStar(s);
    const n = planetCount ?? Math.floor(randRange(rng, 3, 9)); // 3..8
    const planets = [];
    for (let i = 0; i < n; i++) {
      const aAU = sampleOrbitAU(rng, i);
      const isMoon = (aAU > 3 && rng() < 0.35);
      const ov = buildPlanetOverride({ seed: (s ^ (i+1)*0x9E37), star, aAU, isMoon });
      planets.push({
        name: ov.name,
        classification: ov.classification,
        orbitAU: aAU,
        merged: deepMerge(defaultPlanetParameters, ov)
      });
    }
    return { star, planets };
  }
  
  // Optional export(s)
  if (typeof module !== "undefined" && module.exports) {
    module.exports.generateRandomPlanet = generateRandomPlanet;
    module.exports.generateSystem = generateSystem;
  }
  