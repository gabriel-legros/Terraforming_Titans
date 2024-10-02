const planetParameters = {
  mars: {
    name: 'Mars',
    resources: {
      colony: {
        colonists: { name: 'Colonists', initialValue: 0, hasCap: true },
        metal: { name: 'Metal', initialValue: 100, hasCap: true },
        water: { name: 'Water', initialValue: 0 },
        food: { name: 'Food', initialValue: 0 },
        energy: { name: 'Energy', initialValue: 0, hasCap: true },
        research: { name: 'Research Points', initialValue: 0 }
      },
      surface: {
        ice: { name: 'Ice', initialValue: 100000 }
      },
      underground: {
        ore: { name: 'Free ore deposits', initialValue: 1, reserved: 1, maxDeposits: 100, areaTotal: 144000 },
        geothermal: { name: 'Free geothermal vent', initialValue: 0, maxDeposits: 10, areaTotal: 144000 }
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
        battery: 1,
        solarPanel: 1,
        oreMine: 1,
        storageDepot: 1
      }
    },
    buildingParameters: {
      maintenanceFraction: 0.001 // 0.1% of the building's cost as maintenance
    }
  },
  // Additional planets can be added here in the future
};

// Example usage for Mars
const marsParameters = planetParameters.mars;