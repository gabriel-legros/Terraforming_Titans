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
      hazardousBiomass: { name: 'Hazardous Biomass', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
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
      hydrogen: { name: 'Hydrogen', initialValue: 0, unlocked: true, unit: 'ton', hideWhenSmall: true },
      sulfuricAcid: { name: 'Sulfuric Acid', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      calciteAerosol: { name: 'Calcite Aerosol', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true }
    },
    special: {
      albedoUpgrades: {name : 'Black Dust', hasCap: true, baseCap: 144800000000000,initialValue: 0, unlocked: false, hideWhenSmall: true}, // Default (Mars)
      whiteDust: { name: 'White Dust', hasCap: true, baseCap: 144800000000000, initialValue: 0, unlocked: false, hideWhenSmall: true },
      spaceships: {name : 'Spaceships', hasCap: false, initialValue: 0, unlocked: false},
      alienArtifact: { name: 'Alien artifact', hasCap: false, initialValue: 0, unlocked: false },
      crusaders: { name: 'Crusaders', hasCap: false, initialValue: 0, unlocked: false },
      antimatter: { name: 'Antimatter', hasCap: true, baseCap: 0, initialValue: 0, unlocked: false }
    }
  },
  zonalCO2: {
    tropical: { liquid: 0, ice: 0 },
    temperate: { liquid: 0, ice: 0 },
    polar: { liquid: 0, ice: 0 }
  },
  zonalSurface: {
    tropical: { biomass: 0, hazardousBiomass: 0 },
    temperate: { biomass: 0, hazardousBiomass: 0 },
    polar: { biomass: 0, hazardousBiomass: 0 }
  },
  zonalTemperatures: {
    tropical: { value: 223.15, day: 238.15, night: 208.15 },
    temperate: { value: 213.15, day: 226.15, night: 200.15 },
    polar: { value: 193.15, day: 198.15, night: 188.15 }
  },
  buildingParameters: {
    maintenanceFraction: 0.001
  },
  populationParameters: {
    workerRatio: 0.5
  },
  gravityPenaltyEnabled: false,
  fundingRate: 0, // Default
  // Default host star information (for Solar System worlds)
  star: {
    name: 'Sun',
    spectralType: 'G2V',
    luminositySolar: 1,
    massSolar: 1,
    temperatureK: 5778,
    habitableZone: { inner: 0.95, outer: 1.4 }
  },
  hazards: {},
  celestialParameters : {
    distanceFromSun: 1.52, // Default (Mars)
    gravity: 3.711, // Default (Mars)
    radius: 3389.5, // Default (Mars)
    mass: 6.417e23, // kg
    albedo: 0.21, // Default (Mars)
    rotationPeriod: 24.6, // hours, Default (Mars)
    starLuminosity: 1, // Multiplier relative to Sol
    sector: 'R5-07',
  },
  visualization: {
    baseColor: '#8a2a2a',
  }
};

// --- Planet Specific Overrides ---
// Define only the properties that differ from the defaults for each planet.

const marsOverrides = {
  name: 'Mars',
  "resources": {
    "surface": {
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 22586751011604.14
      },
      "atmosphericWater": {
        "initialValue": 181626.02920164465
      }
    },
  },
  "zonalWater": {
    "tropical": {
      "liquid": 0,
      "ice": 94552.17155813596,
      "buriedIce": 1100000000000000
    },
    "temperate": {
      "liquid": 0,
      "ice": 161404.9657716578,
      "buriedIce": 1900000000000000
    },
    "polar": {
      "liquid": 0,
      "ice": 4500007957967200,
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
      "ice": 1412059551109.7017
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 231.2286503392303,
      "day": 249.55911944105176,
      "night": 212.89818123740886
    },
    "temperate": {
      "value": 214.7863554832772,
      "day": 230.0295607413293,
      "night": 199.54315022522508
    },
    "polar": {
      "value": 137.52938473264217,
      "day": 143.54430122284998,
      "night": 131.51446824243436
    }
  },
  fundingRate: 10,
  visualization: {
    baseColor: '#8a2a2a',
  }
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
        "initialValue": 25550.287796755383
      },
      "atmosphericWater": {
        "initialValue": 2.022364940602119e-12
      },
      "atmosphericMethane": {
        "initialValue": 430148695769603.3
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
      "liquid": 1044167465202.7002,
      "ice": 0
    },
    "temperate": {
      "liquid": 1366203373559.9941,
      "ice": 0
    },
    "polar": {
      "liquid": 0,
      "ice": 10960653007419.424
    }
  },
  "zonalCO2": {
    "tropical": {
      "liquid": 0,
      "ice": 205.47679346160334
    },
    "temperate": {
      "liquid": 0,
      "ice": 319.91799357123915
    },
    "polar": {
      "liquid": 0,
      "ice": 73924.31741986355
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "initial": 94,
      "value": 96.80908862695146,
      "day": 97.15084838927193,
      "night": 96.467328864631
    },
    "temperate": {
      "initial": 91,
      "value": 91.32188533895379,
      "day": 91.60608506063775,
      "night": 91.03768561726983
    },
    "polar": {
      "initial": 88,
      "value": 75.36018728154527,
      "day": 75.46348725779306,
      "night": 75.25688730529747
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
  },
  visualization: {
    baseColor: '#8a6a38',
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
  "zonalTemperatures": {
    "tropical": {
      "initial": 130,
      "value": 130,
      "day": 136,
      "night": 124
    },
    "temperate": {
      "initial": 120,
      "value": 120,
      "day": 125,
      "night": 115
    },
    "polar": {
      "initial": 110,
      "value": 110,
      "day": 113,
      "night": 107
    }
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
  },
  visualization: {
    baseColor: '#828a93',
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
  "zonalTemperatures": {
    "tropical": {
      "initial": 135,
      "value": 135,
      "day": 144,
      "night": 126
    },
    "temperate": {
      "initial": 125,
      "value": 125,
      "day": 132,
      "night": 118
    },
    "polar": {
      "initial": 115,
      "value": 115,
      "day": 119,
      "night": 111
    }
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
  },
  visualization: {
    baseColor: '#786355',
  }
};


/* ---------- DRY WORLD (vega2) ---------- */
// A completely dry, Venus-sized world with a pure inert atmosphere (>0.5 atm)
const vega2Overrides = {
  name: 'Vega-2',
  travelWarning: {
    message: 'This world has no water.  Solis can help.'
  },

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
  zonalTemperatures: {
    tropical: { initial: 735, value: 735, day: 745, night: 725 },
    temperate: { initial: 720, value: 720, day: 730, night: 710 },
    polar: { initial: 700, value: 700, day: 707, night: 693 }
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
  },
  visualization: {
    baseColor: '#a87d4f',
  }
};

/* ---------- VENUS OVERRIDES ---------- */
const venusOverrides = {
  name: 'Venus',
  travelWarning: {
    message: 'This planet is much harder than usual.  Preparing is not necessary, but will make it significantly it easier.',
    hint: {
      title: 'Hint',
      body: '- Skill points can help a lot.  \n - With few skill points, the Solis upgrade for early colony sliders can make the early game more doable.  A high worker ratio can help with resource shortage (especially components) \n - The Warp Gate Command can improve your components and electronics production. \n - The 125k Advanced Research can make an aspect of the game a lot easier.'
    }
  },

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
  "zonalTemperatures": {
    "tropical": {
      "initial": 737,
      "value": 737.2438569505996,
      "day": 738.4830854135885,
      "night": 736.0046284876107
    },
    "temperate": {
      "initial": 737,
      "value": 737.2337473365843,
      "day": 738.2642618159972,
      "night": 736.2032328571714
    },
    "polar": {
      "initial": 737,
      "value": 737.23131092994,
      "day": 737.7853397110447,
      "night": 736.6772821488354
    }
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
  },
  visualization: {
    // Use surface rock color (basaltic gray-brown), not atmospheric tint
    baseColor: '#7a6f5f',
  }
};

const umbraOverrides = {
  name: 'Umbra',
  star: {
    name: 'Nyx',
    spectralType: 'K4V',
    luminositySolar: 0.0048246,
    massSolar: 0.2178,
    temperatureK: 2799,
    habitableZone: { inner: 0.06598656748303425, outer: 0.0951595762650073 }
  },
  celestialParameters: {
    distanceFromSun: 0.06830154005049452,
    gravity: 3.895302304848209,
    radius: 3263.280726516782,
    mass: 6.215045552249502e+23,
    albedo: 0.25,
    rotationPeriod: 18.728781030979007,
    starLuminosity: 0.0048246,
    parentBody: {
      name: 'Nyx-1',
      radius: 71492,       // km
      mass: 4.255130726862839e+27,      // kg
      orbitRadius: 33349.90930277854, // km
    }
  },
  visualization: {
    baseColor: '#1d2a44',
  },
"resources": {
    "surface": {
       land: { initialValue: 13_382_000_000 },
      "ice": {
        "initialValue": 371024812010584.3
      },
      "liquidWater": {
        "initialValue": 704889858873.709
      },
      "dryIce": {
        "initialValue": 0
      },
      "liquidCO2": {
        "initialValue": 0
      },
      "liquidMethane": {
        "initialValue": 0
      },
      "hydrocarbonIce": {
        "initialValue": 0
      }
    },
    "atmospheric": {
      "oxygen": {
        "initialValue": 4e14
      },
      "inertGas": { "initialValue": 3e15 }, // Override name and value
      "carbonDioxide": {
        "initialValue": 25035251297749.41
      },
      "atmosphericWater": {
        "initialValue": 5250832941.441801
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "hydrogen": {
        "initialValue": 0
      },
      "sulfuricAcid": {
        "initialValue": 0
      }
    }
  },
  "zonalWater": {
    "tropical": {
      "liquid": 566054780114.1189,
      "ice": 0,
      "buriedIce": 0
    },
    "temperate": {
      "liquid": 138835078759.59012,
      "ice": 34275847678.10241,
      "buriedIce": 0
    },
    "polar": {
      "liquid": 1.97236826e-316,
      "ice": 370990536162906.2,
      "buriedIce": 0
    }
  },
  zonalSurface: {
    tropical: { biomass: 0, hazardousBiomass: 5_000_000_000 },
    temperate: { biomass: 0, hazardousBiomass: 5_000_000_000 },
    polar: { biomass: 0, hazardousBiomass: 1_00_000_000 }
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
      "ice": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "initial": 285.5070416705251,
      "value": 285.5070416586453,
      "day": 308.720880976926,
      "night": 262.29320234036453
    },
    "temperate": {
      "initial": 265.19657546832224,
      "value": 265.1965754597524,
      "day": 285.4274695790454,
      "night": 244.9656813404594
    },
    "polar": {
      "initial": 178.38772519432067,
      "value": 178.3877251843534,
      "day": 186.768411927358,
      "night": 170.0070384413488
    }
  },
  hazards: {
    hazardousBiomass: {
      baseGrowth: { value: 0.4, maxDensity: 1 },
      invasivenessResistance: { value: 20, severity: 0.005 },
      oxygenPressure: { min: 0, max: 10, unit: 'kPa', severity: 0.01 },
      co2Pressure: { min: 10, max: 50, unit: 'kPa', severity: 0.01 },
      atmosphericPressure: { min: 150, max: 200, unit: 'kPa', severity: 0.001 },
      landPreference: { value: 'Land', severity: 0.005 },
      temperaturePreference: { min: 273.15, max: 303.15, unit: 'K', severity: 0.01 },
      radiationPreference: { min: 0, max: 0.01, unit: 'Sv/h', severity: 100 },
      penalties: {
        buildCost: 1,
        maintenanceCost: 1,
        populationGrowth: 1
      }
    }
  }
};

// --- Parameter Retrieval Logic ---

const planetSpecificOverrides = {
  mars: marsOverrides,
  titan: titanOverrides,
  callisto: callistoOverrides,
  ganymede: ganymedeOverrides,
  vega2: vega2Overrides,
  venus: venusOverrides,
  umbra: umbraOverrides
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
    umbra: getPlanetParameters('umbra'),
};

// If the codebase evolves to use the getPlanetParameters function directly,
// the export could be changed to: export { getPlanetParameters, defaultPlanetParameters };
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getPlanetParameters, planetParameters, defaultPlanetParameters, planetOverrides };
}


















