const planetParameters = {
  mars: {
    name: 'Mars',
    resources: {
      colony: {
        funding: { name: 'Funding', initialValue: 1000, unlocked: false },
        colonists: { name: 'Colonists', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false }, // No cap initially
        workers: { name: 'Workers', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false }, // No cap initially
        energy: { name: 'Energy', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false }, // Base cap from one Battery
        metal: { name: 'Metal', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}}, // Base cap from one Storage Depot
        silicon: { name: 'Silicon', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false }, // Base cap from one Storage Depot
        glass: { name: 'Glass', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false }, // Base cap from one Storage Depot
        water: { name: 'Water', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {atmospheric : 'atmosphericWater'}}, // Base cap from one Storage Depot
        food: { name: 'Food', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false }, // Base cap from one Storage Depot
        components: { name: 'Components', initialValue: 0, hasCap: true, baseCap: 500, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}  }, // Base cap from one Storage Depot
        electronics: { name: 'Electronics', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, conversionValue : 0.2}, // Base cap from one Storage Depot
        superconductors: { name: 'Superconductors', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'} }, // Base cap from one Storage Depot
        androids: {name: 'Android', initialValue: 0, hasCap: true, baseCap: 1000, unlocked: false, maintenanceConversion : {surface : 'scrapMetal'}},
        research: { name: 'Research', initialValue: 0, hasCap: false, unlocked:false },
      },
      surface: {
        land: {name : 'Land', initialValue : 14400000000, hasCap: true, unlocked: false, land:true},
        ice: { name: 'Ice', initialValue: 10000000003841538, unlocked:false },
        liquidWater: { name: 'Water', initialValue: 0, unlocked:false },
        dryIce : {name : 'Dry Ice', initialValue: 30010420953259, unlocked: false},
        scrapMetal : {name : 'Scrap Metal', initialValue : 0, unlocked: false},
        biomass: {name : 'Biomass', hasCap : false, initialValue: 0, unlocked: false}
      },
      underground: {
        ore: { name: 'Ore deposits', initialValue: 5, maxDeposits: 14400, hasCap: true, areaTotal: 144000, unlocked:false },
        geothermal: { name: 'Geothermal vent', initialValue: 3, maxDeposits: 144, hasCap: true, areaTotal: 144000, unlocked: false }
      },
      atmospheric: {
        carbonDioxide: { name: 'Carbon Dioxide', initialValue: 24157579046739, unlocked:false },
        inertGas: { name: 'Inert Gas', initialValue: 8.03e11, unlocked:false },
        oxygen: { name: 'Oxygen', initialValue: 2.39e10, unlocked:false },
        atmosphericWater: { name: 'Water Vap.', initialValue: 67646657792, unlocked:false },
        greenhouseGas: {name: 'Safe GHG', initialValue : 0, unlocked: false}
      },
      special: {
        albedoUpgrades: {name : 'Albedo upgrades', hasCap: true, baseCap: 144800000000000,initialValue: 0, unlocked: false},
        spaceships: {name : 'Spaceships', hasCap: false, initialValue: 0, unlocked: false}
      }
    },
    buildingParameters: {
      maintenanceFraction: 0.001 // 0.1% of the building's cost as maintenance
    },
    populationParameters: {
      workerRatio: 0.5 // 60% of colonists are considered workers
    },
    fundingRate: 10, // Rate at which funding increases over time
    celestialParameters : {
    distanceFromSun: 1.52, // Average distance from the Sun in AU
    gravity: 3.711, // Surface gravity in m/s^2
    radius: 3389.5, // Mean radius in kilometers
    albedo: 0.25, // Starting albedo value
    }
  },
  // Additional planets can be added here in the future
};

// Example usage for Mars
const marsParameters = planetParameters.mars;