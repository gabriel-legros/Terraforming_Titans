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
      workers: { name: 'Workers', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false },
      energy: { name: 'Energy', initialValue: 0, hasCap: true, baseCap: 50000000, unlocked:false , unit: 'Watt-day' },
      metal: { name: 'Metal', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton'},
      silicon: { name: 'Silicon', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'ton' },
      glass: { name: 'Glass', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'ton' },
      water: { name: 'Water', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {atmospheric : 'atmosphericWater'}, unit: 'ton'}, // Default (Mars)
      food: { name: 'Food', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'ton' },
      components: { name: 'Components', initialValue: 0, hasCap: true, baseCap: 500, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton' },
      electronics: { name: 'Electronics', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton', conversionValue : 0.2},
      superconductors: { name: 'Superconductors', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'} , unit: 'ton' },
      androids: {name: 'Android', initialValue: 0, hasCap: true, baseCap: 1000, unlocked: false, maintenanceConversion : {surface : 'scrapMetal'}},
      research: { name: 'Research', initialValue: 0, hasCap: false, unlocked:false },
      advancedResearch: { name: 'Adv. Research', initialValue: 0, hasCap: false, unlocked:false },
    },
    surface: {
      land: {name : 'Land', initialValue : 14400000000, hasCap: true, unlocked: false, land:true}, // Default (Mars)
      ice: { name: 'Ice', initialValue: 8200007980898617, unlocked:false , unit: 'ton' }, // Default (Mars)
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
      atmosphericMethane: { name: 'Methane', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true }
    },
    special: {
      albedoUpgrades: {name : 'Albedo upgrades', hasCap: true, baseCap: 144800000000000,initialValue: 0, unlocked: false}, // Default (Mars)
      spaceships: {name : 'Spaceships', hasCap: false, initialValue: 0, unlocked: false}
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
    albedo: 0.25, // Default (Mars)
    rotationPeriod: 24.6, // hours, Default (Mars)
  }
};

// --- Planet Specific Overrides ---
// Define only the properties that differ from the defaults for each planet.

const marsOverrides = {
  name: 'Mars',
"resources": {
    "surface": {
      "ice": {
        "initialValue": 8200007980898620
      },
      "liquidWater": {
        "initialValue": 0
      },
      "dryIce": {
        "initialValue": 20000036381099.133
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
        "initialValue": 23998810562847.49
      },
      "atmosphericWater": {
        "initialValue": 19100402.12301435
      },
      "atmosphericMethane": {
        "initialValue": 0
      }
    }
  },
  "zonalWater": {
    "tropical": {
      "liquid": 0,
      "ice": 37778199.556139365,
      "buriedIce": 1100000000000000
    },
    "temperate": {
      "liquid": 0,
      "ice": 56730796.17582948,
      "buriedIce": 1900000000000000
    },
    "polar": {
      "liquid": 0,
      "ice": 4500007886389624.5,
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
      "dryIce": 0
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
      geothermal: { initialValue: 1, maxDeposits: 3, areaTotal: 83000 },
    },
    atmospheric: {
      inertGas: { initialValue: 9e15 }, // Override name and value
      oxygen: { initialValue: 1e9 },
      "carbonDioxide": {
        "initialValue": 95729.50158850153
      },
      "atmosphericWater": {
        "initialValue": 9.597449302588715e-14
      },
      "atmosphericMethane": {
        "initialValue": 260430020861844.1,
        "unlocked": true
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
      "dryIce": 0
    },
    "temperate": {
      "dryIce": 0
    },
    "polar": {
      "dryIce": 0
    }
  },
  "zonalHydrocarbons": {
    "tropical": {
      "liquid": 1720311771320.0037,
      "ice": 0
    },
    "temperate": {
      "liquid": 2236159434617.72,
      "ice": 0
    },
    "polar": {
      "liquid": 0,
      "ice": 6113206932240.577
    }
  },


  celestialParameters : { // Override all celestial parameters
    distanceFromSun: 9.58,
    gravity: 1.35,
    radius: 2574.7,
    albedo: 0.15,
  rotationPeriod: 382.7,
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
      ice: { initialValue: 159999999942703360000, unlocked: true },

      liquidWater:   { initialValue: 0 },
      dryIce:        { initialValue: 0 },
      liquidMethane: { initialValue: 0 },
      hydrocarbonIce:{ initialValue: 0 }
    },

    /* ---------- UNDERGROUND ---------- */
    underground: {
      /* 1 deposit / 10⁶ ha rule ⇒ 7 300 maximum */
      ore:        { initialValue: 3, maxDeposits: 7300, areaTotal: 73000 },
      geothermal: { initialValue: 1, maxDeposits:   3, areaTotal: 73000 } // geologically quiet
    },

    /* ---------- ATMOSPHERE (ultra‑thin CO₂/O₂ exosphere) ---------- */
    atmospheric: {
      carbonDioxide:    { initialValue: 2414.6137246225217 },   // CO₂ exosphere detected by Galileo :contentReference[oaicite:1]{index=1}
      inertGas:         { initialValue: 1e5 },   // mostly Ar; trace amounts
      oxygen:           { initialValue: 5e3 },   // sputtered O₂  :contentReference[oaicite:2]{index=2}
      atmosphericWater: { initialValue: 22934.27284032676 },
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
      "ice": 227987.50423423847,
      "buriedIce": 4e+21
    },
    "temperate": {
      "liquid": 0,
      "ice": 1899338.2410272758,
      "buriedIce": 5e+21
    },
    "polar": {
      "liquid": 0,
      "ice": 39999644653114.9,
      "buriedIce": 1e+21
    }
  },
  "zonalSurface": {
    "tropical": {
      "dryIce": 13595.230503597835
    },
    "temperate": {
      "dryIce": 23737.390468573874
    },
    "polar": {
      "dryIce": 10252.765303402204
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
    albedo: 0.17,              // Bond albedo estimate :contentReference[oaicite:5]{index=5}
    rotationPeriod: 400.8      // hours (16 .7 days tidally‑locked) :contentReference[oaicite:6]{index=6}
  }
};

// --- Parameter Retrieval Logic ---

const planetSpecificOverrides = {
  mars: marsOverrides,
  titan: titanOverrides,
  callisto: callistoOverrides
  // Add future planets here by defining their override objects
};

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
    callisto: getPlanetParameters('callisto')
};

// If the codebase evolves to use the getPlanetParameters function directly,
// the export could be changed to: export { getPlanetParameters, defaultPlanetParameters };
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getPlanetParameters, planetParameters, defaultPlanetParameters };
}
