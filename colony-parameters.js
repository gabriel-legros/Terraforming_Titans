const colonyParameters = {
    t1_colony: {
      name: 'Scientist outpost',
      category : 'Colony',
      description: 'Supports a small crew for early colonization.  Produces research.',
      cost: { colony: { metal: 50, water : 50, glass : 100 } },
      consumption: {colony : {energy : 10, food : 1}},
      production: {colony : {research : 1}},
      storage: { colony: { colonists: 10} },
      baseComfort : 0,
      dayNightActivity: false, // Not affected by day/night
      canBeToggled: true, // No manual toggle needed
      requiresMaintenance: true,
      maintenanceFactor: 1, // Default maintenance factor
      unlocked: false
    },
    t2_colony: {
      name: 'Small outpost',
      category : 'Colony',
      description: 'Larger and more efficient outpost which can support many more people.',
      cost: { colony: { metal: 250, water : 250, glass : 250 } },
      consumption: {colony : {energy : 50, food : 10}},
      production: {colony : {research : 10}},
      storage: { colony: { colonists: 100} },
      baseComfort : 0.2,
      dayNightActivity: false, // Not affected by day/night
      canBeToggled: true, // No manual toggle needed
      requiresMaintenance: true,
      maintenanceFactor: 1, // Default maintenance factor
      unlocked: false
    }
}