const planetParameters = {
  mars: {
    name: 'Mars',
    resources: {
      colony: {
        funding: { name: 'Funding', initialValue: 1000 },
        colonists: { name: 'Colonists', initialValue: 0, hasCap: true, baseCap: 0 }, // No cap initially
        workers: { name: 'Workers', initialValue: 0, hasCap: true, baseCap: 0 }, // No cap initially
        energy: { name: 'Energy', initialValue: 0, hasCap: true, baseCap: 1000 }, // Base cap from one Battery
        metal: { name: 'Metal', initialValue: 100, hasCap: true, baseCap: 5000 }, // Base cap from one Storage Depot
        silicon: { name: 'Silicon', initialValue: 0, hasCap: true, baseCap: 5000 }, // Base cap from one Storage Depot
        glass: { name: 'Glass', initialValue: 0, hasCap: true, baseCap: 5000 }, // Base cap from one Storage Depot
        water: { name: 'Water', initialValue: 0, hasCap: true, baseCap: 5000 }, // Base cap from one Storage Depot
        food: { name: 'Food', initialValue: 0, hasCap: true, baseCap: 5000 }, // Base cap from one Storage Depot
        research: { name: 'Research', initialValue: 1000, hasCap: false },
        components: { name: 'Components', initialValue: 100, hasCap: true, baseCap: 500 }, // Base cap from one Storage Depot
        electronics: { name: 'Electronics', initialValue: 100, hasCap: true, baseCap: 200 }, // Base cap from one Storage Depot
      },
      surface: {
        ice: { name: 'Ice', initialValue: 100000 }
      },
      underground: {
        ore: { name: 'Free ore deposits', initialValue: 5, maxDeposits: 100, hasCap: true, areaTotal: 144000 },
        geothermal: { name: 'Free geothermal vent', initialValue: 0, maxDeposits: 10, hasCap: true, areaTotal: 144000 }
      },
      atmospheric: {
        carbonDioxide: { name: 'Carbon Dioxide', initialValue: 950000 },
        inertGas: { name: 'Inert Gas', initialValue: 35000 },
        oxygen: { name: 'Oxygen', initialValue: 1500 },
        atmosphericWater: { name: 'Atmospheric Water', initialValue: 210 },
        atmosphericPressure: { name: 'Atmospheric Pressure', initialValue: 0 }
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