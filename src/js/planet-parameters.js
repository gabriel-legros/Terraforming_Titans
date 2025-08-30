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
      workers: { name: 'Workers', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false, hideRate: true },
      energy: { name: 'Energy', initialValue: 0, hasCap: true, baseCap: 50000000, unlocked:false , unit: 'Watt-day' },
      metal: { name: 'Metal', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton'},
      silicon: { name: 'Silicon', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'ton' },
      glass: { name: 'Glass', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'ton' },
      water: { name: 'Water', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {atmospheric : 'atmosphericWater'}, unit: 'ton'}, // Default (Mars)
      food: { name: 'Food', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'pack' },
      components: { name: 'Components', initialValue: 0, hasCap: true, baseCap: 500, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton' },
      electronics: { name: 'Electronics', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton', conversionValue : 0.2},
      superconductors: { name: 'Superconductors', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'} , unit: 'ton' },
      superalloys: { name: 'Superalloys', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, maintenanceMultiplier: 0 , unit: 'ton' },
      androids: {name: 'Android', initialValue: 0, hasCap: true, baseCap: 1000, unlocked: false, maintenanceConversion : {surface : 'scrapMetal'}},
      research: { name: 'Research', initialValue: 0, hasCap: false, unlocked:false },
      advancedResearch: { name: 'Adv. Research', initialValue: 0, hasCap: false, unlocked:false },
    },
    surface: {
      land: {name : 'Land', initialValue : 14_400_000_000, hasCap: true, unlocked: false, land:true}, // Default (Mars)
      ice: { name: 'Ice', initialValue: 8200007980898617, unlocked:false , unit: 'ton', hideWhenSmall: true }, // Default (Mars)
      liquidWater: { name: 'Water', initialValue: 0, unlocked:false , unit: 'ton' },
      dryIce : {name : 'Dry Ice', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true }, // Default (Mars)
      scrapMetal : {name : 'Scrap Metal', initialValue : 0, unlocked: false, unit: 'ton' },
      biomass: {name : 'Biomass', hasCap : false, initialValue: 0, unlocked: false, unit: 'ton' },
      liquidMethane: { name: 'Liquid Methane', initialValue: 0, unlocked: false , unit: 'ton', hideWhenSmall: true },
      hydrocarbonIce: { name: 'Methane Ice', initialValue: 0, unlocked: false , unit: 'ton', hideWhenSmall: true },
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
      calciteAerosol: { name: 'Calcite Aerosol', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true }
    },
    special: {
      albedoUpgrades: {name : 'Black Dust', hasCap: true, baseCap: 144800000000000,initialValue: 0, unlocked: false, hideWhenSmall: true}, // Default (Mars)
      whiteDust: { name: 'White Dust', hasCap: true, baseCap: 144800000000000, initialValue: 0, unlocked: false, hideWhenSmall: true },
      spaceships: {name : 'Spaceships', hasCap: false, initialValue: 0, unlocked: false},
      alienArtifact: { name: 'Alien artifact', hasCap: false, initialValue: 0, unlocked: false }
    }
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
    albedo: 0.25, // Default (Mars)
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
        "initialValue": 22319318076118.363
      },
      "atmosphericWater": {
        "initialValue": 722426.8679575237
      },
      "atmosphericMethane": {
        "initialValue": 0
      }
    }
  },
 "zonalWater": {
    "tropical": {
      "liquid": 0,
      "ice": 367216.7323466248,
      "buriedIce": 1100000000000000
    },
    "temperate": {
      "liquid": 0,
      "ice": 582758.0109170746,
      "buriedIce": 1900000000000000
    },
    "polar": {
      "liquid": 0,
      "ice": 4500007998326138.5,
      "buriedIce": 700000000000000
    }
  },
  "zonalSurface": {
    "tropical": {
      "dryIce": 0
    },
    "temperate": {
      "dryIce": 0
    },
    "polar": {
      "dryIce": 1679492486598.075
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
  fundingRate: 10
};

const titanOverrides = {
  name: 'Titan',
  resources: {
    surface: {
      land: { initialValue : 8300000000 },
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
        "initialValue": 99347.1280399024
      },
      "atmosphericWater": {
        "initialValue": 1.6588366882881576e-14
      },
      "atmosphericMethane": {
        "initialValue": 431758340571554.44
      }
    },
    special: {
      albedoUpgrades: { baseCap: 83000000000000 }, // Override base capacity
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
      "dryIce": 254.94383370506972
    },
    "temperate": {
      "dryIce": 336.2514848320769
    },
    "polar": {
      "dryIce": 61.67664497456431
    }
  },
  "zonalHydrocarbons": {
    "tropical": {
      "liquid": 714716234640.4485,
      "ice": 0
    },
    "temperate": {
      "liquid": 941649072655.1897,
      "ice": 0
    },
    "polar": {
      "liquid": 0,
      "ice": 10105013736396.453
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
      albedoUpgrades: { baseCap: 73000000000000 }
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
  "zonalSurface": {
    "tropical": {
      "dryIce": 9081.029927055873
    },
    "temperate": {
      "dryIce": 15854.44191563618
    },
    "polar": {
      "dryIce": 6866.857802233041
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
      albedoUpgrades: { baseCap: 87200000000000 }
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
  "zonalSurface": {
    "tropical": {
      "dryIce": 11290.626326998059
    },
    "temperate": {
      "dryIce": 19713.531275243768
    },
    "polar": {
      "dryIce": 8514.76025965708
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


// --- Parameter Retrieval Logic ---

const planetSpecificOverrides = {
  mars: marsOverrides,
  titan: titanOverrides,
  callisto: callistoOverrides,
  ganymede: ganymedeOverrides
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
    ganymede: getPlanetParameters('ganymede')
};

// If the codebase evolves to use the getPlanetParameters function directly,
// the export could be changed to: export { getPlanetParameters, defaultPlanetParameters };
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getPlanetParameters, planetParameters, defaultPlanetParameters, planetOverrides };
}
