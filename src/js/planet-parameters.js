// Helper function for deep merging objects
// Ensures that nested objects are merged correctly, not just replaced.
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

function deepMerge(target, source) {
  let output = { ...target }; // Start with a copy of the target
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      const targetValue = target[key];
      const sourceValue = source[key];

      if (isObject(targetValue) && isObject(sourceValue)) {
        // If both target and source have an object for this key, recurse
        output[key] = deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        // Otherwise, if source has a defined value (could be null, 0, false), overwrite the target value
        output[key] = sourceValue;
      }
      // If sourceValue is undefined, the targetValue from the initial spread is kept
    });
  }
  // If source is not an object, or target is not an object,
  // the initial spread of target potentially updated with source's top-level keys is returned.
  return output;
}


// --- Default Planet Parameters (Based largely on Mars) ---
const defaultPlanetParameters = {
  name: 'Default Planet', // Will be overridden by specific planets
  resources: {
    colony: {
      funding: { name: 'Funding', initialValue: 0, unlocked: false },
      colonists: { name: 'Colonists', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false },
      workers: { name: 'Workers', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false, hideRate: true, marginBottom: 10 },
      energy: { name: 'Energy', initialValue: 0, hasCap: true, baseCap: 50000000, unlocked:false , unit: 'Watt-day' },
      metal: { name: 'Metal', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton'},
      silicon: { name: 'Silicon', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'ton' },
      glass: { name: 'Glass', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'ton', marginBottom: 10 },
      water: { name: 'Water', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {atmospheric : 'atmosphericWater'}, unit: 'ton'}, // Default (Mars)
      food: { name: 'Food', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'pack', marginBottom: 10 },
      components: { name: 'Components', initialValue: 0, hasCap: true, baseCap: 500, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton' },
      electronics: { name: 'Electronics', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton', conversionValue : 0.2},
      superconductors: { name: 'Superconductors', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'} , unit: 'ton' },
      superalloys: { name: 'Superalloys', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, maintenanceMultiplier: 0 , unit: 'ton' },
      androids: {name: 'Android', initialValue: 0, hasCap: true, baseCap: 1000, unlocked: false, maintenanceConversion : {surface : 'scrapMetal'}},
      research: { name: 'Research', initialValue: 0, hasCap: false, unlocked:false, marginTop: 10 },
      advancedResearch: { name: 'Adv. Research', initialValue: 0, hasCap: false, unlocked:false },
    },
    surface: {
      land: {name : 'Land', initialValue : 14_400_000_000, hasCap: true, unlocked: false, land:true}, // Default (Mars)
      ice: { name: 'Ice', initialValue: 8200007980898617, unlocked:false , unit: 'ton', hideWhenSmall: true }, // Default (Mars)
      liquidWater: { name: 'Water', initialValue: 0, unlocked:false , unit: 'ton' },
      dryIce : {name : 'Dry Ice', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true }, // Default (Mars)
      liquidCO2: { name: 'Liquid CO2', initialValue: 0, unlocked: true , unit: 'ton', hideWhenSmall: true },
      scrapMetal : {name : 'Scrap Metal', initialValue : 0, unlocked: false, unit: 'ton' },
      biomass: {name : 'Biomass', hasCap : false, initialValue: 0, unlocked: false, unit: 'ton' },
      liquidMethane: { name: 'Liquid Methane', initialValue: 0, unlocked: true , unit: 'ton', hideWhenSmall: true },
      hydrocarbonIce: { name: 'Methane Ice', initialValue: 0, unlocked: true , unit: 'ton', hideWhenSmall: true },
    },
    underground: {
      ore: { name: 'Ore deposits', initialValue: 5, maxDeposits: 14400, hasCap: true, areaTotal: 144000, unlocked:false }, // Default (Mars)
      geothermal: { name: 'Geo. vent', initialValue: 3, maxDeposits: 144, hasCap: true, areaTotal: 144000, unlocked: false } // Default (Mars)
    },
    atmospheric: {
      carbonDioxide: { name: 'Carbon Dioxide', initialValue: 23998810562847.49, unlocked:false , unit: 'ton' }, // Default (Mars)
      inertGas: { name: 'Inert Gas', initialValue: 1.075e12, unlocked:false , unit: 'ton' }, // Default (Mars) - Adjusted based on review
      oxygen: { name: 'Oxygen', initialValue: 3.25e10, unlocked:false , unit: 'ton' }, // Default (Mars) - Adjusted based on review
      atmosphericWater: { name: 'Water Vap.', initialValue:  19100402.066922974, unlocked:false , unit: 'ton' }, // Default (Mars) - Adjusted based on review
      greenhouseGas: {name: 'Safe GHG', initialValue : 0, unlocked: false, unit: 'ton', hideWhenSmall: true }, // Default (Mars)
      atmosphericMethane: { name: 'Methane', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      sulfuricAcid: { name: 'Sulfuric Acid', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      calciteAerosol: { name: 'Calcite Aerosol', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true }
    },
    special: {
      albedoUpgrades: {name : 'Black Dust', hasCap: true, baseCap: 144800000000000,initialValue: 0, unlocked: false, hideWhenSmall: true}, // Default (Mars)
      whiteDust: { name: 'White Dust', hasCap: true, baseCap: 144800000000000, initialValue: 0, unlocked: false, hideWhenSmall: true },
      spaceships: {name : 'Spaceships', hasCap: false, initialValue: 0, unlocked: false},
      alienArtifact: { name: 'Alien artifact', hasCap: false, initialValue: 0, unlocked: false }
    }
  },
  zonalCO2: {
    tropical: { liquid: 0, ice: 0 },
    temperate: { liquid: 0, ice: 0 },
    polar: { liquid: 0, ice: 0 }
  },
  buildingParameters: {
    maintenanceFraction: 0.001
  },
  populationParameters: {
    workerRatio: 0.5
  },
  fundingRate: 0, // Default
  celestialParameters : {
    distanceFromSun: 1.52, // Default (Mars)
    gravity: 3.711, // Default (Mars)
    radius: 3389.5, // Default (Mars)
    mass: 6.417e23, // kg
    albedo: 0.21, // Default (Mars)
    rotationPeriod: 24.6, // hours, Default (Mars)
    starLuminosity: 1, // Multiplier relative to Sol
  }
};

// --- Planet Specific Overrides ---
// Define only the properties that differ from the defaults for each planet.

const marsOverrides = {
  name: 'Mars',
"resources": {
    "surface": {
      "ice": {
        "initialValue": 8200007985298688
      },
      "liquidWater": {
        "initialValue": 0
      },
      "dryIce": {
        "initialValue": 1476511541532.2644
      },
      "liquidMethane": {
        "initialValue": 0
      },
      "hydrocarbonIce": {
        "initialValue": 0
      }
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 22562632518689.97
      },
      "atmosphericWater": {
        "initialValue": 166774.96558488137
      },
    },
  },
 "zonalWater": {
    "tropical": {
      "liquid": 0,
      "ice": 87077.1259485495,
      "buriedIce": 1100000000000000
    },
    "temperate": {
      "liquid": 0,
      "ice": 150584.6530696022,
      "buriedIce": 1900000000000000
    },
    "polar": {
      "liquid": 0,
      "ice": 4500007999593580,
      "buriedIce": 700000000000000
    }
  },
  "zonalSurface": {
    "tropical": {
      "biomass": 0
    },
    "temperate": {
      "biomass": 0
    },
    "polar": {
      "biomass": 0
    }
  },
  "zonalHydrocarbons": {
    "tropical": {
      "liquid": 0,
      "ice": 0
    },
    "temperate": {
      "liquid": 0,
      "ice": 0
    },
    "polar": {
      "liquid": 0,
      "ice": 0
    }
  },
  "zonalCO2": {
    "tropical": {
      "liquid": 0,
      "ice": 0
    },
    "temperate": {
      "liquid": 0,
      "ice": 0
    },
    "polar": {
      "liquid": 0,
      "ice": 1436178044031.2847
    }
  },
  fundingRate: 10
};

const titanOverrides = {
  name: 'Titan',
  resources: {
    surface: {
      land: { initialValue : 8_300_000_000 },
      "liquidMethane": {
        "unlocked": true
      },
      "hydrocarbonIce": {
        "unlocked": true
      }
    },
    underground: {
      ore: { initialValue: 3, maxDeposits: 8300, areaTotal: 83000 },
      geothermal: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
    },
    atmospheric: {
      inertGas: { initialValue: 9e15 }, // Override name and value
      oxygen: { initialValue: 1e9 },
      "carbonDioxide": {
        "initialValue": 96102.5286469488
      },
      "atmosphericWater": {
        "initialValue": 2.967141554253866e-8
      },
      "atmosphericMethane": {
        "initialValue": 432808181235630.1
      },
    },
    special: {
      albedoUpgrades: { baseCap: 83000000000000 }, // Override base capacity
      whiteDust: { baseCap: 83000000000000 }
    }
  },
 "zonalWater": {
    "tropical": {
      "liquid": 0,
      "ice": 3791.2409230205194,
      "buriedIce": 150000000000000
    },
    "temperate": {
      "liquid": 0,
      "ice": 4628.179160457752,
      "buriedIce": 1350000000000000
    },
    "polar": {
      "liquid": 0,
      "ice": 9450000000001650,
      "buriedIce": 4050000000000000
    }
  },
  "zonalSurface": {
    "tropical": {
      "biomass": 0
    },
    "temperate": {
      "biomass": 0
    },
    "polar": {
      "biomass": 0
    }
  },
  "zonalHydrocarbons": {
    "tropical": {
      "liquid": 877849153888.3359,
      "ice": 0
    },
    "temperate": {
      "liquid": 1147035443948.0461,
      "ice": 0
    },
    "polar": {
      "liquid": 0,
      "ice": 8686653782239.314
    }
  },
  "zonalCO2": {
    "tropical": {
      "liquid": 0,
      "ice": 229.8198502474763
    },
    "temperate": {
      "liquid": 0,
      "ice": 325.9675279328853
    },
    "polar": {
      "liquid": 0,
      "ice": 3341.6839783054147
    }
  },
  celestialParameters : { // Override all celestial parameters
    distanceFromSun: 9.58,
    gravity: 1.35,
    radius: 2574.7,
    mass: 1.345e23, // kg
    albedo: 0.15,
    rotationPeriod: 382.7,
    starLuminosity: 1,
    parentBody: {
      name: 'Saturn',
      radius: 60268,        // km
      mass: 5.683e26,       // kg
      orbitRadius: 1221870, // km
      refDistance_Rp: 10,                 // convenient pivot in R_S
      parentBeltAtRef_mSvPerDay: 3.5,      // chosen so Titan @20.3 RS is ~0.05 airless
      beltFalloffExp: 6
    }
  }
};

const callistoOverrides = {
  name: 'Callisto',

  resources: {
    /* ---------- SURFACE ---------- */
    surface: {
      /* total land area ≈ 7.30 Gha (= 7.30 × 10⁹ ha)   4πr² with r = 2410 km :contentReference[oaicite:0]{index=0} */
      land: { initialValue: 7300000000 },

      /* ~4 × 10¹⁶ t of easily‑accessible water‑ice (≪ 4 × 10¹⁹ t true inventory) */
      ice: { initialValue: 0, unlocked: true },
      liquidWater:   { initialValue: 0 },
      dryIce:        { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce:{ initialValue: 0 }
    },

    /* ---------- UNDERGROUND ---------- */
    underground: {
      /* 1 deposit / 10⁶ ha rule ⇒ 7 300 maximum */
      ore:        { initialValue: 3, maxDeposits: 7300, areaTotal: 73000 },
      geothermal: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
    },

    /* ---------- ATMOSPHERE (ultra‑thin CO₂/O₂ exosphere) ---------- */
    atmospheric: {
      carbonDioxide:    { initialValue: 18197.670355272443 },   // CO₂ exosphere detected by Galileo :contentReference[oaicite:1]{index=1}
      inertGas:         { initialValue: 1e5 },   // mostly Ar; trace amounts
      oxygen:           { initialValue: 5e3 },   // sputtered O₂  :contentReference[oaicite:2]{index=2}
      atmosphericWater: { initialValue: 139.11057047257964 },
      atmosphericMethane:{ initialValue: 0 }
    },

    /* ---------- SPECIAL ---------- */
    special: {
      /* baseCap = land (ha) × 10 000 — same scaling used for Mars/Titan */
      albedoUpgrades: { baseCap: 73000000000000 },
      whiteDust: { baseCap: 73000000000000 }
    }
  },

  /* ---------- PER‑LATITUDE WATER PARTITION ---------- */
 "zonalWater": {
    "tropical": {
      "liquid": 0,
      "ice": 156341.6517211872,
      "buriedIce": 4000000000000000000
    },
    "temperate": {
      "liquid": 0,
      "ice": 1719858.449614392,
      "buriedIce": 5000000000000000000
    },
    "polar": {
      "liquid": 0,
      "ice": 39999644927037.81,
      "buriedIce": 1000000000000000000
    }
  },
  "zonalCO2": {
    "tropical": { "liquid": 0, "ice": 9081.029927055873 },
    "temperate": { "liquid": 0, "ice": 15854.44191563618 },
    "polar": { "liquid": 0, "ice": 6866.857802233041 }
  },
  "zonalSurface": { "tropical": {}, "temperate": {}, "polar": {} },
  "zonalHydrocarbons": {
    "tropical": {
      "liquid": 0,
      "ice": 0
    },
    "temperate": {
      "liquid": 0,
      "ice": 0
    },
    "polar": {
      "liquid": 0,
      "ice": 0
    }
  },

  /* ---------- CELESTIAL ---------- */
  celestialParameters: {
    distanceFromSun: 5.2,      // Jupiter’s semi‑major axis (AU)
    gravity: 1.236,            // m s‑² :contentReference[oaicite:3]{index=3}
    radius: 2410.3,            // km :contentReference[oaicite:4]{index=4}
    mass: 1.076e23,            // kg
    albedo: 0.17,              // Bond albedo estimate :contentReference[oaicite:5]{index=5}
    rotationPeriod: 400.8,     // hours (16 .7 days tidally‑locked) :contentReference[oaicite:6]{index=6}
    starLuminosity: 1,
    parentBody: {
      name: 'Jupiter',
      radius: 71492,       // km
      mass: 1.898e27,      // kg
      orbitRadius: 1882700, // km
      refDistance_Rp: 9.4,                 // Europa
      parentBeltAtRef_mSvPerDay: 5400,     // airless daily dose at Europa
      beltFalloffExp: 10                  // middle of 9.5–10.5 range
    }
  }
};


/* ---------- GANYMEDE OVERRIDES ---------- */
const ganymedeOverrides = {
  name: 'Ganymede',

  /* ---------- RESOURCES ---------- */
  resources: {

    /* SURFACE */
    surface: {
      /* total land area  ≈ 8.72 Gha  (= 8.72 × 10⁹ ha) */
      land: { initialValue: 8720000000 },

      /* accessible surface water-ice (upper regolith only) */
      ice: { initialValue: 199999999928379200, unlocked: true },

      liquidWater:   { initialValue: 0 },
      dryIce:        { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce:{ initialValue: 0 }
    },

    /* UNDERGROUND */
    underground: {
      /* 1 deposit / 10⁶ ha rule ⇒ 8 720 maximum */
      ore:        { initialValue: 3, maxDeposits: 8720, areaTotal: 87200 },
      geothermal: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
    },

    /* ATMOSPHERE — ultra-thin CO₂ / O₂ exosphere */
    atmospheric: {
      inertGas:          { initialValue: 1e5 },        // trace Ar, Na, etc.
      oxygen:            { initialValue: 1.0e4 },      // molecular O₂ from radiolysis
      "carbonDioxide": {
        "initialValue": 19581.08213812905
      },
      "atmosphericWater": {
        "initialValue": 1449492.6262308592
      },
      "atmosphericMethane": {
        "initialValue": 0
      }
    },

    /* SPECIAL */
    special: {
      /* baseCap = land (ha) × 10 000 — same scaling as other bodies */
      albedoUpgrades: { baseCap: 87200000000000 },
      whiteDust: { baseCap: 87200000000000 }
    }
  },

  /* ---------- PER-LATITUDE WATER PARTITION ---------- */
  "zonalWater": {
    "tropical": {
      "liquid": 0,
      "ice": 12055915491.1659,
      "buriedIce": 5000000000000000000
    },
    "temperate": {
      "liquid": 0,
      "ice": 231131980763568.94,
      "buriedIce": 7000000000000000000
    },
    "polar": {
      "liquid": 0,
      "ice": 66851350469975.29,
      "buriedIce": 2000000000000000000
    }
  },
  "zonalCO2": {
    "tropical": { "liquid": 0, "ice": 11290.626326998059 },
    "temperate": { "liquid": 0, "ice": 19713.531275243768 },
    "polar": { "liquid": 0, "ice": 8514.76025965708 }
  },
  "zonalSurface": { "tropical": {}, "temperate": {}, "polar": {} },
  "zonalHydrocarbons": {
    "tropical": {
      "liquid": 0,
      "ice": 0
    },
    "temperate": {
      "liquid": 0,
      "ice": 0
    },
    "polar": {
      "liquid": 0,
      "ice": 0
    }
  },

  /* ---------- CELESTIAL PARAMETERS ---------- */
  celestialParameters: {
    distanceFromSun: 5.2,      // AU (shares Jupiter’s orbit)
    gravity: 1.428,            // m s-²
    radius: 2634.1,            // km
    mass: 1.482e23,            // kg
    albedo: 0.21,              // Bond albedo estimate
    rotationPeriod: 171.7,     // hours (7.155 days, tidally locked)
    starLuminosity: 1,
    parentBody: {
      name: 'Jupiter',
      radius: 71492,      // km
      mass: 1.898e27,     // kg
      orbitRadius: 1070400, // km
      refDistance_Rp: 9.4,                 // Europa
      parentBeltAtRef_mSvPerDay: 5400,     // airless daily dose at Europa
      beltFalloffExp: 10
    }
  }
};


/* ---------- DRY WORLD (vega2) ---------- */
// A completely dry, Venus-sized world with a pure inert atmosphere (>0.5 atm)
const vega2Overrides = {
  name: 'Vega-2',
  travelWarning: 'Crystal storms may endanger colonists.',

  resources: {
    surface: {
      // Land (ha) = 4πR^2 (km²) × 100; R = 5051.8 km → ~32.070 Gha
      land: { initialValue: 32_000_000_000 },
      ice: { initialValue: 0, unlocked: true },
      liquidWater: { initialValue: 0, unlocked: true },
      dryIce: { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce: { initialValue: 0 }
    },
    underground: {
      // Scale deposits with land area (1 deposit / 1e6 ha)
      ore: { initialValue: 5, maxDeposits: 32070, areaTotal: 320700 },
      geothermal: { initialValue: 5, maxDeposits: 3891, areaTotal: 320700 }
    },
    atmospheric: {
      // Pure inert atmosphere. Choose mass for ~0.6 atm at Venus size/gravity.
      // P = 0.6 atm => ~3.15e15 tons for R=6051.8 km, g=8.87 m/s^2
      inertGas: { initialValue: 3.2e15 },
      oxygen: { initialValue: 0 },
      carbonDioxide: { initialValue: 0 },
      atmosphericWater: { initialValue: 0 },
      atmosphericMethane: { initialValue: 0 },
      greenhouseGas: { initialValue: 0 }
    },
    special: {
      // Base capacity scales with land (ha) * 10,000
      albedoUpgrades: { baseCap: 320_000_000_000_000 },
      whiteDust: { baseCap: 320_000_000_000_000 }
    }
  },

  // Ensure all zonal stores are explicitly dry/empty
  zonalWater: {
    tropical: { liquid: 0, ice: 0, buriedIce: 0 },
    temperate: { liquid: 0, ice: 0, buriedIce: 0 },
    polar: { liquid: 0, ice: 0, buriedIce: 0 }
  },
  zonalCO2: {
    tropical: { liquid: 0, ice: 0 },
    temperate: { liquid: 0, ice: 0 },
    polar: { liquid: 0, ice: 0 }
  },
  zonalSurface: { tropical: {}, temperate: {}, polar: {} },
  zonalHydrocarbons: {
    tropical: { liquid: 0, ice: 0 },
    temperate: { liquid: 0, ice: 0 },
    polar: { liquid: 0, ice: 0 }
  },

  star: {
    name: 'Vega',
    spectralType: 'A0V',
    luminositySolar: 40,
    massSolar: 2.135,
    temperatureK: 9602,
    habitableZone: { inner: 6, outer: 9 }
  },

  celestialParameters: {
    // Venus-like size and orbit. No clouds/greenhouse by composition above.
    distanceFromSun: 4, // AU
    gravity: 7.3,          // m/s^2
    radius: 5051.8,         // km
    mass: 1.867e24,         // kg
    albedo: 0.3,           // bright surface; no clouds unless added later
    rotationPeriod: 18,    
    starLuminosity: 40
  }
};

/* ---------- VENUS OVERRIDES ---------- */
const venusOverrides = {
  name: 'Venus',

  resources: {
    surface: {
      // Land rounded to nearest billion hectares
      land: { initialValue: 46_000_000_000 },
      ice: { initialValue: 0, unlocked: true },
      liquidWater: { initialValue: 0, unlocked: true },
      dryIce: { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce: { initialValue: 0 }
    },
    underground: {
      // Scale with land (1 deposit per 1e6 ha)
      ore: { initialValue: 5, maxDeposits: 46000, areaTotal: 460000 },
      geothermal: { initialValue: 3, maxDeposits: 460, areaTotal: 460000 }
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 460580468610238600
      },
      "inertGas" :{
        "initialValue": 1.7e16
      },
      "atmosphericWater": {
        "initialValue": 10000000000000
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "sulfuricAcid": {
        "initialValue": 45496476928636.34
      }
    },
    special: {
      // Caps scale with land * 10,000 and match between black and white dust
      albedoUpgrades: { baseCap: 460_000_000_000_000 },
      whiteDust: { baseCap: 460_000_000_000_000 }
    }
  },

  zonalWater: {
    tropical: { liquid: 0, ice: 0, buriedIce: 0 },
    temperate: { liquid: 0, ice: 0, buriedIce: 0 },
    polar: { liquid: 0, ice: 0, buriedIce: 0 }
  },
  zonalCO2: {
    tropical: { liquid: 0, ice: 0 },
    temperate: { liquid: 0, ice: 0 },
    polar: { liquid: 0, ice: 0 }
  },
  zonalSurface: { tropical: {}, temperate: {}, polar: {} },
  zonalHydrocarbons: {
    tropical: { liquid: 0, ice: 0 },
    temperate: { liquid: 0, ice: 0 },
    polar: { liquid: 0, ice: 0 }
  },

  celestialParameters: {
    distanceFromSun: 0.723,
    gravity: 8.87,
    radius: 6051.8,
    mass: 4.867e24,
    albedo: 0.15,
    rotationPeriod: 5832, // hours (~243 Earth days)
    starLuminosity: 1
  }
};

// --- Parameter Retrieval Logic ---

const planetSpecificOverrides = {
  mars: marsOverrides,
  titan: titanOverrides,
  callisto: callistoOverrides,
  ganymede: ganymedeOverrides,
  vega2: vega2Overrides,
  venus: venusOverrides
  // Add future planets here by defining their override objects
};
// Expose overrides for modules needing raw planet data
const planetOverrides = planetSpecificOverrides;

/**
 * Gets the fully merged parameters for a specific planet by combining
 * the default parameters with the planet-specific overrides.
 * @param {string} planetName - The name of the planet (e.g., 'mars', 'titan'). Case-insensitive.
 * @returns {object} The complete parameter object for the planet.
 */
function getPlanetParameters(planetName) {
  const lowerCasePlanetName = planetName.toLowerCase();
  const overrides = planetSpecificOverrides[lowerCasePlanetName];

  if (!overrides) {
    console.error(`No parameters defined for planet: ${planetName}. Returning default parameters.`);
    // Return a deep copy of defaults to prevent accidental modification
    return JSON.parse(JSON.stringify(defaultPlanetParameters));
  }

  // Perform a deep merge of defaults and the specific planet's overrides
  return deepMerge(defaultPlanetParameters, overrides);
}

// --- Export Structure ---
// Recreate the original export structure `planetParameters.mars` and `planetParameters.titan`
// by pre-calculating the merged parameters for the known planets.
// This ensures compatibility with existing code that expects this structure.

const planetParameters = {
    mars: getPlanetParameters('mars'),
    titan: getPlanetParameters('titan'),
    callisto: getPlanetParameters('callisto'),
    ganymede: getPlanetParameters('ganymede'),
    vega2: getPlanetParameters('vega2'),
    venus: getPlanetParameters('venus'),
};

// If the codebase evolves to use the getPlanetParameters function directly,
// the export could be changed to: export { getPlanetParameters, defaultPlanetParameters };
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getPlanetParameters, planetParameters, defaultPlanetParameters, planetOverrides };
}
