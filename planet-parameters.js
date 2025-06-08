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
      funding: { name: 'Funding', initialValue: 1000, unlocked: false },
      colonists: { name: 'Colonists', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false },
      workers: { name: 'Workers', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false },
      energy: { name: 'Energy', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false },
      metal: { name: 'Metal', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}},
      silicon: { name: 'Silicon', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false },
      glass: { name: 'Glass', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false },
      water: { name: 'Water', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {atmospheric : 'atmosphericWater'}}, // Default (Mars)
      food: { name: 'Food', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false },
      components: { name: 'Components', initialValue: 0, hasCap: true, baseCap: 500, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}  },
      electronics: { name: 'Electronics', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, conversionValue : 0.2},
      superconductors: { name: 'Superconductors', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'} },
      androids: {name: 'Android', initialValue: 0, hasCap: true, baseCap: 1000, unlocked: false, maintenanceConversion : {surface : 'scrapMetal'}},
      research: { name: 'Research', initialValue: 0, hasCap: false, unlocked:false },
    },
    surface: {
      land: {name : 'Land', initialValue : 14400000000, hasCap: true, unlocked: false, land:true}, // Default (Mars)
      ice: { name: 'Ice', initialValue: 0, unlocked:false }, // Default (Mars)
      liquidWater: { name: 'Water', initialValue: 0, unlocked:false },
      dryIce : {name : 'Dry Ice', initialValue: 30010169900060.594, unlocked: false}, // Default (Mars)
      scrapMetal : {name : 'Scrap Metal', initialValue : 0, unlocked: false},
      biomass: {name : 'Biomass', hasCap : false, initialValue: 0, unlocked: false}
    },
    underground: {
      ore: { name: 'Ore deposits', initialValue: 5, maxDeposits: 14400, hasCap: true, areaTotal: 144000, unlocked:false }, // Default (Mars)
      geothermal: { name: 'Geothermal vent', initialValue: 3, maxDeposits: 144, hasCap: true, areaTotal: 144000, unlocked: false } // Default (Mars)
    },
    atmospheric: {
      carbonDioxide: { name: 'Carbon Dioxide', initialValue: 23157704873578.164, unlocked:false }, // Default (Mars)
      inertGas: { name: 'Inert Gas', initialValue: 1.075e12, unlocked:false }, // Default (Mars) - Adjusted based on review
      oxygen: { name: 'Oxygen', initialValue: 3.25e10, unlocked:false }, // Default (Mars) - Adjusted based on review
      atmosphericWater: { name: 'Water Vap.', initialValue: 10192599116.52503, unlocked:false }, // Default (Mars) - Adjusted based on review
      greenhouseGas: {name: 'Safe GHG', initialValue : 0, unlocked: false} // Default (Mars)
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
  fundingRate: 10, // Default (Mars)
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
        "initialValue": 10000000003490308
      },
      "liquidWater": {
        "initialValue": 0
      },
      "dryIce": {
        "initialValue": 30010155358834.945
      }
    },
    "atmospheric": {
      "carbonDioxide": {
        "initialValue": 23157719414803.75
      },
      "atmosphericWater": {
        "initialValue": 9996314386.369434
      }
    }
  },
  "zonalWater": {
    "tropical": {
      "liquid": 0,
      "ice": 29654963008.267323,
      "buriedIce": 100000000000000
    },
    "temperate": {
      "liquid": 0,
      "ice": 47845297047.22314,
      "buriedIce": 900000000000000
    },
    "polar": {
      "liquid": 0,
      "ice": 6299922503230253,
      "buriedIce": 2700000000000000
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
      "dryIce": 30010155358834.945
    }
  }};

const titanOverrides = {
  name: 'Titan',
  resources: {
    surface: {
      land: { initialValue : 8300000000 },
      ice: {initialValue: 15000000000000000 },
      dryIce : { initialValue: 0 }, // Explicitly set Dry Ice to 0 for Titan
      liquidMethane: { name: 'Liquid Methane', initialValue: 4.5e12, unlocked: true },
      hydrocarbonIce: { name: 'Hydrocarbon Ice', initialValue: 0, unlocked: true },
    },
    underground: {
      ore: { initialValue: 3, maxDeposits: 8300, areaTotal: 83000 },
      geothermal: { initialValue: 2, maxDeposits: 83, areaTotal: 83000 },
    },
    atmospheric: {
      carbonDioxide: { initialValue: 1e5 },
      inertGas: { initialValue: 9e15 }, // Override name and value
      oxygen: { initialValue: 1e9 },
      atmosphericWater: { initialValue: 1e4 },
      atmosphericMethane: { name: 'Methane (CH4)', initialValue: 1.3e14, unlocked: true }
    },
    special: {
      albedoUpgrades: { baseCap: 83000000000000 }, // Override base capacity
    }
  },
  zonalHydrocarbons: {
    tropical: {
        liquid: 2.0e12,
        ice: 0
    },
    temperate: {
        liquid: 2.5e12,
        ice: 0
    },
    polar: {
        liquid: 0,
        ice: 0
    }
  },
  fundingRate: 0, // Override funding rate
  celestialParameters : { // Override all celestial parameters
    distanceFromSun: 9.58,
    gravity: 1.35,
    radius: 2574.7,
    albedo: 0.22,
    rotationPeriod: 382.7,
  }
};

// --- Parameter Retrieval Logic ---

const planetSpecificOverrides = {
  mars: marsOverrides,
  titan: titanOverrides
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
    titan: getPlanetParameters('titan')
};

// If the codebase evolves to use the getPlanetParameters function directly,
// the export could be changed to: export { getPlanetParameters, defaultPlanetParameters };
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getPlanetParameters, planetParameters, defaultPlanetParameters };
}
