const planetParameters = {
  mars: {
    name: 'Mars',
    resources: {
      colony: {
        funding: { name: 'Funding', initialValue: 1000, unlocked: false },
        colonists: { name: 'Colonists', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false }, // No cap initially
        workers: { name: 'Workers', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false }, // No cap initially
        energy: { name: 'Energy', initialValue: 0, hasCap: true, baseCap: 1000, unlocked:false }, // Base cap from one Battery
        metal: { name: 'Metal', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false }, // Base cap from one Storage Depot
        silicon: { name: 'Silicon', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false }, // Base cap from one Storage Depot
        glass: { name: 'Glass', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false }, // Base cap from one Storage Depot
        water: { name: 'Water', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false }, // Base cap from one Storage Depot
        food: { name: 'Food', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false }, // Base cap from one Storage Depot
        components: { name: 'Components', initialValue: 0, hasCap: true, baseCap: 500, unlocked:false }, // Base cap from one Storage Depot
        electronics: { name: 'Electronics', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false }, // Base cap from one Storage Depot
        research: { name: 'Research', initialValue: 0, hasCap: false, unlocked:false },
      },
      surface: {
        ice: { name: 'Ice', initialValue: 100000, unlocked:false }
      },
      underground: {
        ore: { name: 'Free ore deposits', initialValue: 5, maxDeposits: 100, hasCap: true, areaTotal: 144000, unlocked:false },
        geothermal: { name: 'Free geothermal vent', initialValue: 0, maxDeposits: 10, hasCap: true, areaTotal: 144000, unlocked: false }
      },
      atmospheric: {
        carbonDioxide: { name: 'Carbon Dioxide', initialValue: 950000, unlocked:false },
        inertGas: { name: 'Inert Gas', initialValue: 35000, unlocked:false },
        oxygen: { name: 'Oxygen', initialValue: 1500, unlocked:false },
        atmosphericWater: { name: 'Atmospheric Water', initialValue: 210, unlocked:false },
        atmosphericPressure: { name: 'Atmospheric Pressure', initialValue: 0, unlocked:false }
      }
    },
    initialGameState: {
      buildings: {
      }
    },
    buildingParameters: {
      maintenanceFraction: 0.001 // 0.1% of the building's cost as maintenance
    },
    populationParameters: {
      workerRatio: 0.5 // 60% of colonists are considered workers
    },
    fundingRate: 5, // Rate at which funding increases over time
  },
  // Additional planets can be added here in the future
};

// Example usage for Mars
const marsParameters = planetParameters.mars;