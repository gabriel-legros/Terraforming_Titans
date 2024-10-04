const colonyParameters = {
    t1_colony: {
      name: 'Scientist outpost',
      description: 'Supports a small crew for early colonization.  Produces research.',
      cost: { colony: { metal: 50, water : 50 } },
      consumption: {colony : {energy : 10}},
      production: {colony : {research : 1}},
      storage: { colony: { colonists: 10} },
      dayNightActivity: false, // Not affected by day/night
      canBeToggled: true, // No manual toggle needed
      requiresMaintenance: true,
      maintenanceFactor: 1, // Default maintenance factor
      unlocked: true
    }
}