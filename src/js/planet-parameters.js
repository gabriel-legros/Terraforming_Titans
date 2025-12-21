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
  specialAttributes: {
    hasSand: true,
  },
  resources: {
    colony: {
      funding: { name: 'Funding', initialValue: 0, unlocked: false },
      colonists: { name: 'Colonists', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false },
      workers: { name: 'Workers', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false, hideRate: true, marginBottom: 10 },
      energy: { name: 'Energy', initialValue: 0, hasCap: true, baseCap: 50000000, unlocked:false , unit: 'Watt-day' },
      metal: { name: 'Metal', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton'},
      silicon: { name: 'Silicon', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'ton' },
      glass: { name: 'Glass', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'ton', maintenanceConversion : {surface : 'junk'}, marginBottom: 10 },
      water: { name: 'Water', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {atmospheric : 'atmosphericWater'}, unit: 'ton'}, // Default (Mars)
      food: { name: 'Food', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'packs', marginBottom: 10 },
      components: { name: 'Components', initialValue: 0, hasCap: true, baseCap: 500, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton' },
      electronics: { name: 'Electronics', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton', conversionValue : 0.2},
      superconductors: { name: 'Superconductors', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'} , unit: 'ton' },
      superalloys: { name: 'Superalloys', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, maintenanceMultiplier: 0 , unit: 'ton' },
      androids: {name: 'Android', initialValue: 0, hasCap: true, baseCap: 1000, unlocked: false, maintenanceConversion : {surface : 'junk'}},
      research: { name: 'Research', initialValue: 0, hasCap: false, unlocked:false, marginTop: 10 },
      advancedResearch: { name: 'Adv. Research', initialValue: 0, hasCap: false, unlocked:false },
    },
    surface: {
      land: {name : 'Land', initialValue : 14_400_000_000, hasCap: true, unlocked: false, land:true}, // Default (Mars)
      ice: { name: 'Ice', initialValue: 8200007980898617, unlocked:false , unit: 'ton', hideWhenSmall: true }, // Default (Mars)
      liquidWater: { name: 'Water', initialValue: 0, unlocked:false , unit: 'ton' },
      dryIce : {name : 'Dry Ice', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true }, // Default (Mars)
      liquidCO2: { name: 'Liquid CO2', initialValue: 0, unlocked: true , unit: 'ton', hideWhenSmall: true },
      liquidMethane: { name: 'Liquid Methane', initialValue: 0, unlocked: true , unit: 'ton', hideWhenSmall: true },
      hydrocarbonIce: { name: 'Methane Ice', initialValue: 0, unlocked: true , unit: 'ton', hideWhenSmall: true },
      biomass: {name : 'Biomass', hasCap : false, initialValue: 0, unlocked: false, unit: 'ton' },
      hazardousBiomass: { name: 'Hazardous Biomass', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true},
      scrapMetal : {name : 'Scrap Metal', initialValue : 0, unlocked: false, unit: 'ton', marginTop:10 },
      garbage: { name: 'Garbage', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      trash: { name: 'Trash', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      junk: { name: 'Junk', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      radioactiveWaste: { name: 'Radioactive Waste', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
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
      // Dust caps derive from land area during resource creation
      albedoUpgrades: {name : 'Black Dust', hasCap: true, initialValue: 0, unlocked: false, hideWhenSmall: true}, // Default (Mars)
      whiteDust: { name: 'White Dust', hasCap: true, initialValue: 0, unlocked: false, hideWhenSmall: true },
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
    rotationPeriod: 24.6, // hours, day-night cycle duration, Default (Mars)
    spinPeriod: 24.6, // hours, physical rotation for gravity calculations, Default (Mars)
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
      "ice": {
        "initialValue": 8200007958223221
      },
      "liquidWater": {
        "initialValue": 0
      },
      "dryIce": {
        "initialValue": 1411197828523.9368
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
      "carbonDioxide": {
        "initialValue": 22587612734210.836
      },
      "atmosphericWater": {
        "initialValue": 182028.84697954895
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 32500000000
      },
      "inertGas": {
        "initialValue": 1075000000000
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
      "liquid": 0,
      "ice": 94760.79953747026,
      "buriedIce": 1100000000000000
    },
    "temperate": {
      "liquid": 0,
      "ice": 161761.88455436888,
      "buriedIce": 1900000000000000
    },
    "polar": {
      "liquid": 0,
      "ice": 4500007957966698,
      "buriedIce": 700000000000000
    }
  },
  "zonalSurface": {
    "tropical": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "biomass": 0,
      "hazardousBiomass": 0
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
      "ice": 1411197828523.9368
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 231.22872526577473,
      "day": 249.55906403014703,
      "night": 212.89838650140243
    },
    "temperate": {
      "value": 214.78642515746978,
      "day": 230.02952202983306,
      "night": 199.5433282851065
    },
    "polar": {
      "value": 137.53738315916613,
      "day": 143.5522342593193,
      "night": 131.52253205901295
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
    },
    underground: {
      ore: { initialValue: 3, maxDeposits: 8300, areaTotal: 83000 },
      geothermal: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 25999.096752393263
      },
      "atmosphericWater": {
        "initialValue": 6.632791701302079e-8
      },
      "atmosphericMethane": {
        "initialValue": 530626620463804.7
      },
      "oxygen": {
        "initialValue": 1000000000
      },
      "inertGas": {
        "initialValue": 9000000000000000
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
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "biomass": 0,
      "hazardousBiomass": 0
    }
  },
  "zonalHydrocarbons": {
    "tropical": {
      "liquid": 42276496437268.71,
      "ice": 0
    },
    "temperate": {
      "liquid": 57166425593526.555,
      "ice": 0
    },
    "polar": {
      "liquid": 0,
      "ice": 13450177120297.768
    }
  },
  "zonalCO2": {
    "tropical": {
      "liquid": 0,
      "ice": 144.46854888799018
    },
    "temperate": {
      "liquid": 0,
      "ice": 289.23048009273015
    },
    "polar": {
      "liquid": 0,
      "ice": 73567.20422121447
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 97.49469678987639,
      "day": 97.83923078057713,
      "night": 97.15016279917565
    },
    "temperate": {
      "value": 94.02563421419119,
      "day": 94.31214362026016,
      "night": 93.73912480812221
    },
    "polar": {
      "value": 86.73614973068824,
      "day": 86.8317129075981,
      "night": 86.64058655377838
    }
  },
  celestialParameters : { // Override all celestial parameters
    distanceFromSun: 9.58,
    gravity: 1.35,
    radius: 2574.7,
    mass: 1.345e23, // kg
    albedo: 0.15,
    rotationPeriod: 382.7,
    spinPeriod: 382.7,
    starLuminosity: 1,
    parentBody: {
      name: 'Saturn',
      radius: 60268,        // km
      mass: 5.683e26,       // kg
      orbitRadius: 1_221_870, // km
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
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 38975.084195126
      },
      "atmosphericWater": {
        "initialValue": 161.30652767133944
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 5000
      },
      "inertGas": {
        "initialValue": 100000
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
      "liquid": 0,
      "ice": 195712.32470430483,
      "buriedIce": 4000000000000000000
    },
    "temperate": {
      "liquid": 0,
      "ice": 2471770.2854785556,
      "buriedIce": 5000000000000000000
    },
    "polar": {
      "liquid": 0,
      "ice": 39999644135733.36,
      "buriedIce": 1000000000000000000
    }
  },
  "zonalSurface": {
    "tropical": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "biomass": 0,
      "hazardousBiomass": 0
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
      "ice": 0.0000010844611386499015
    },
    "temperate": {
      "liquid": 0,
      "ice": 0.0006507601027874387
    },
    "polar": {
      "liquid": 0,
      "ice": 11024.915153227
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 122.90375412845735,
      "day": 133.6276398425136,
      "night": 112.1798684144011
    },
    "temperate": {
      "value": 114.16322646634974,
      "day": 123.08096831900012,
      "night": 105.24548461369936
    },
    "polar": {
      "value": 80.02341838407527,
      "day": 85.37613100181616,
      "night": 74.67070576633438
    }
  },

  /* ---------- CELESTIAL ---------- */
  celestialParameters: {
    distanceFromSun: 5.2,      // Jupiter's semi‑major axis (AU)
    gravity: 1.236,            // m s‑² :contentReference[oaicite:3]{index=3}
    radius: 2410.3,            // km :contentReference[oaicite:4]{index=4}
    mass: 1.076e23,            // kg
    albedo: 0.17,              // Bond albedo estimate :contentReference[oaicite:5]{index=5}
    rotationPeriod: 400.8,     // hours (16 .7 days tidally‑locked) :contentReference[oaicite:6]{index=6}
    spinPeriod: 400.8,
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
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 44365.09639626417
      },
      "atmosphericWater": {
        "initialValue": 1308117.6166008068
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 10000
      },
      "inertGas": {
        "initialValue": 100000
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
      "liquid": 0,
      "ice": 10788885218.153574,
      "buriedIce": 5000000000000000000
    },
    "temperate": {
      "liquid": 0,
      "ice": 231061583429084.53,
      "buriedIce": 7000000000000000000
    },
    "polar": {
      "liquid": 0,
      "ice": 66922307386502.195,
      "buriedIce": 2000000000000000000
    }
  },
  "zonalSurface": {
    "tropical": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "biomass": 0,
      "hazardousBiomass": 0
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
      "ice": 7.19277235458896e-220
    },
    "temperate": {
      "liquid": 0,
      "ice": 1.4384283977013396e-162
    },
    "polar": {
      "liquid": 0,
      "ice": 14734.90360376347
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 121.3938643170457,
      "day": 129.80596441448122,
      "night": 112.98176421961017
    },
    "temperate": {
      "value": 102.60026627256036,
      "day": 110.12877872333048,
      "night": 95.07175382179024
    },
    "polar": {
      "value": 78.59520332599821,
      "day": 82.74484759948332,
      "night": 74.4455590525131
    }
  },

  /* ---------- CELESTIAL PARAMETERS ---------- */
  celestialParameters: {
    distanceFromSun: 5.2,      // AU (shares Jupiter's orbit)
    gravity: 1.428,            // m s-²
    radius: 2634.1,            // km
    mass: 1.482e23,            // kg
    albedo: 0.21,              // Bond albedo estimate
    rotationPeriod: 171.7,     // hours (7.155 days, tidally locked)
    spinPeriod: 171.7,
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
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 0
      },
      "atmosphericWater": {
        "initialValue": 0
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 0
      },
      "inertGas": {
        "initialValue": 3200000000000000
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
      "liquid": 0,
      "ice": 0,
      "buriedIce": 0
    },
    "temperate": {
      "liquid": 0,
      "ice": 0,
      "buriedIce": 0
    },
    "polar": {
      "liquid": 0,
      "ice": 0,
      "buriedIce": 0
    }
  },
  "zonalSurface": {
    "tropical": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "biomass": 0,
      "hazardousBiomass": 0
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
      "ice": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 337.55065605291753,
      "day": 346.3786178031589,
      "night": 328.7226943026762
    },
    "temperate": {
      "value": 313.71283043819795,
      "day": 321.05396460274466,
      "night": 306.37169627365125
    },
    "polar": {
      "value": 245.4803862019606,
      "day": 249.42715230215794,
      "night": 241.5336201017633
    }
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
    spinPeriod: 18,
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
      "atmosphericWater": {
        "initialValue": 10000000000000
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 32500000000
      },
      "inertGas": {
        "initialValue": 17000000000000000
      },
      "hydrogen": {
        "initialValue": 0
      },
      "sulfuricAcid": {
        "initialValue": 45496476928636.34
      }
    }
  },
  "zonalWater": {
    "tropical": {
      "liquid": 0,
      "ice": 0,
      "buriedIce": 0
    },
    "temperate": {
      "liquid": 0,
      "ice": 0,
      "buriedIce": 0
    },
    "polar": {
      "liquid": 0,
      "ice": 0,
      "buriedIce": 0
    }
  },
  "zonalSurface": {
    "tropical": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "biomass": 0,
      "hazardousBiomass": 0
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
      "ice": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 737.0330133034225,
      "day": 738.2713559421151,
      "night": 735.79467066473
    },
    "temperate": {
      "value": 737.0229065806459,
      "day": 738.0526844285248,
      "night": 735.993128732767
    },
    "polar": {
      "value": 737.020470870787,
      "day": 737.5741036214824,
      "night": 736.4668381200916
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
    spinPeriod: 5832,
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
    spinPeriod: 18.728781030979007,
    starLuminosity: 0.0048246,
    parentBody: {
      name: 'Nyx-1',
      radius: 71492,       // km
      mass: 4.255130726862839e+27,      // kg
      orbitRadius: 1_330_049.90930277854, // km
      refDistance_Rp: 9.4,                 // Europa
      parentBeltAtRef_mSvPerDay: 5400,     // airless daily dose at Europa
      beltFalloffExp: 10
    }
  },
  visualization: {
    baseColor: '#1d2a44',
  },
 "resources": {
    "surface":
    {
              land: { initialValue: 13_382_000_000 },
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 25035251297749.41
      },
      "atmosphericWater": {
        "initialValue": 198495980.79745197
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 400000000000000
      },
      "inertGas": {
        "initialValue": 3000000000000000
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
      "liquid": 8678753438.309835,
      "ice": 0,
      "buriedIce": 0
    },
    "temperate": {
      "liquid": 2.3088635338613274e-69,
      "ice": 10595173.026087541,
      "buriedIce": 0
    },
    "polar": {
      "liquid": 1.97236826e-316,
      "ice": 371726064857053.6,
      "buriedIce": 0
    }
  },
  "zonalSurface": {
    "tropical": {
      "biomass": 0,
      "hazardousBiomass": 5336060040.357645
    },
    "temperate": {
      "biomass": 0,
      "hazardousBiomass": 6936037875.064085
    },
    "polar": {
      "biomass": 0,
      "hazardousBiomass": 1109902084.57827
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
      "ice": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 283.90369791204176,
      "day": 287.17445052968026,
      "night": 280.63294529440327
    },
    "temperate": {
      "value": 263.9502954552708,
      "day": 266.6702243838743,
      "night": 261.2303665266673
    },
    "polar": {
      "value": 179.9439082786943,
      "day": 180.95419460462747,
      "night": 178.93362195276111
    }
  },
  hazards: {
    hazardousBiomass: {
      baseGrowth: { value: 0.4, maxDensity: 1 },
      invasivenessResistance: { value: 20, severity: 0.005 },
      oxygenPressure: { min: 0, max: 10, unit: 'kPa', severity: 0.01 },
      co2Pressure: { min: 10, max: 50, unit: 'kPa', severity: 0.01 },
      atmosphericPressure: { min: 150, max: 200, unit: 'kPa', severity: 0.002 },
      landPreference: { value: 'Land', severity: 0.1 },
      temperaturePreference: {
        min: 223.15,
        max: 303.15,
        unit: 'K',
        severityBelow: 0.004,
        severityHigh: 0.005
      },
      radiationPreference: { min: 0, max: 0.01, unit: 'mSv/day', severity: 0.1 },
      penalties: {
        buildCost: 0.75,
        maintenanceCost: 0.75,
        populationGrowth: 1
      }
    }
  }
};

const solisPrimeOverrides = {
  name: 'Solis Prime',
  travelWarning: {
    message: 'This planet is very easy, but it is possible to grow too fast.  If this happens, pausing autobuild is usually enough to recover. \n The story will give you some initial resources, but if some mega projects are on auto start you may end up using them instantly.',
  },
  specialAttributes: {
    hasSand: false,
  },
  celestialParameters: {
    distanceFromSun: 0,
    gravity: 4.9,
    radius: 6300,
    mass: 4.6e24,
    albedo: 0.14,
    rotationPeriod: 24, // Rogue worlds use 24h day-night cycle
    spinPeriod: 0, // Rogue worlds have no physical spin
    starLuminosity: 0,
    rogue: true
  },
  visualization: {
    baseColor: '#d4af37',
  },
 "resources": {
    underground: {
      ore: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
      geothermal: { initialValue: 0, maxDeposits: 0, areaTotal: 0 },
    },
    "surface": {
      land: { initialValue : 49_876_000_000 },
      "ice": {
        "initialValue": 2905755111246688.5
      },
      "liquidWater": {
        "initialValue": 0
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
      "carbonDioxide": {
        "initialValue": 0
      },
      "atmosphericWater": {
        "initialValue": 0
      },
      "atmosphericMethane": {
        "initialValue": 0
      },
      "oxygen": {
        "initialValue": 0
      },
      "inertGas": {
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
      "liquid": 0,
      "ice": 290937936633937.6,
      "buriedIce": 0
    },
    "temperate": {
      "liquid": 0,
      "ice": 1702476415693995.5,
      "buriedIce": 0
    },
    "polar": {
      "liquid": 0,
      "ice": 912340758918755.4,
      "buriedIce": 0
    }
  },
  "zonalSurface": {
    "tropical": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "biomass": 0,
      "hazardousBiomass": 0
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
      "ice": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 2.8965877751696056,
      "day": 2.897056679503238,
      "night": 2.896118870835973
    },
    "temperate": {
      "value": 2.765780521300558,
      "day": 2.766225770784607,
      "night": 2.765335271816509
    },
    "polar": {
      "value": 2.645365259614177,
      "day": 2.645787344036533,
      "night": 2.6449431751918207
    }
  }
};

const gabbagOverrides = {
  name: 'Gabbag',
  specialAttributes: {
    terraformingRequirementId: 'gabbagian',
  },
  star: {
    name: 'Gabbagsol',
    spectralType: 'A',
    luminositySolar: 10.19109899798825,
    massSolar: 1.9411681130761282,
    temperatureK: 7910,
  },
  celestialParameters: {
    distanceFromSun: 4.133402092640641,
    gravity: 4.88215797065464,
    hasNaturalMagnetosphere : true,
    radius: 3643.2869367918697,
    mass: 9.70941037467594e+23,
    albedo: 0.14,
    rotationPeriod: 26.19893743796274, 
    spinPeriod: 26.19893743796274,
    starLuminosity: 10.19109899798825,
    sector: 'R5-06'
  },
  visualization: {
    baseColor: '#556b7d',
  },
  "resources": {
    underground: {
      ore: { initialValue: 10, maxDeposits: 16680, areaTotal: 166800 },
      geothermal: { initialValue: 3, maxDeposits: 167, areaTotal: 166800 },
    },
    "surface": {
              land: { initialValue: 16_680_021_928 }},
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 3696135227990891
      },
      "atmosphericWater": {
        "initialValue": 1848954215547882.5
      },
      "atmosphericMethane": {
        "initialValue": 400000000000000
      },
      "oxygen": {
        "initialValue": 79141235823.26874
      },
      "inertGas": {
        "initialValue": 250000000000000000
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
      "liquid": 10345763020752492,
      "ice": 0,
      "buriedIce": 0
    },
    "temperate": {
      "liquid": 13447760775709956,
      "ice": 0,
      "buriedIce": 0
    },
    "polar": {
      "liquid": 2153209090277669,
      "ice": 0,
      "buriedIce": 0
    }
  },
  "zonalSurface": {
    "tropical": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "temperate": {
      "biomass": 0,
      "hazardousBiomass": 0
    },
    "polar": {
      "biomass": 0,
      "hazardousBiomass": 0
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
      "ice": 0
    }
  },
  "zonalTemperatures": {
    "tropical": {
      "value": 356.4851281719689,
      "day": 356.60697309400206,
      "night": 356.3632832499357
    },
    "temperate": {
      "value": 356.4802374648396,
      "day": 356.58156108364017,
      "night": 356.37891384603904
    },
    "polar": {
      "value": 356.47905896351324,
      "day": 356.53352752528065,
      "night": 356.42459040174583
    }
  },
  hazards: {
    garbage: {
      surfaceResources: {
        garbage: { amountMultiplier: 10000 },
        trash: { amountMultiplier: 1000 },
        junk: { amountMultiplier: 1000 },
        scrapMetal: { amountMultiplier: 1000 },
        radioactiveWaste: { amountMultiplier: 1 }
      },
      penalties: {
        garbage: { sandHarvesterMultiplier: 0.25, nanoColonyGrowthMultiplier: 0.25 },
        trash: { happiness: -0.05 },
        junk: { happiness: -0.05 },
        scrapMetal: { oreScanningSpeedMultiplier: 0.25 },
        radioactiveWaste: { lifeGrowthMultiplier: 0.1, androidAttrition: 0.001 }
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
  umbra: umbraOverrides,
  solisprime: solisPrimeOverrides,
  gabbag: gabbagOverrides
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
  const mergedParameters = deepMerge(defaultPlanetParameters, overrides);

  if (mergedParameters.celestialParameters && mergedParameters.celestialParameters.rogue) {
    delete mergedParameters.star;
  }

  return mergedParameters;
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
    solisprime: getPlanetParameters('solisprime'),
    gabbag: getPlanetParameters('gabbag'),
};

// If the codebase evolves to use the getPlanetParameters function directly,
// the export could be changed to: export { getPlanetParameters, defaultPlanetParameters };
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getPlanetParameters, planetParameters, defaultPlanetParameters, planetOverrides };
}


















