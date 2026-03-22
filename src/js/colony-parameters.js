const colonyParameters = {
    aerostat_colony: {
      name: '',
      category: 'Colony',
      description: '',
      cost: { colony: { metal: 85, components: 10, electronics: 5, water: 50, glass: 20 } },
      consumption: { colony: { energy: 50000, food: 1 } },
      production: { colony: { research: 1 } },
      storage: { colony: { colonists: 10, androids: 0 } },
      baseComfort: 0,
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: true,
      maintenanceFactor: 1,
      unlocked: false,
      requiresLand: 0
    },
    t1_colony: {
      name: '',
      category: 'Colony',
      description: '',
      cost: { colony: { metal: 100, water : 50, glass : 100 } },
      consumption: {colony : {energy : 50000, food : 1}},
      production: {colony : {research : 1}},
      storage: { colony: { colonists: 10} },
      baseComfort : 0,
      dayNightActivity: false, // Not affected by day/night
      canBeToggled: true, // No manual toggle needed
      requiresMaintenance: true,
      maintenanceFactor: 1, // Default maintenance factor
      unlocked: false,
      requiresLand : 1
    },
    t2_colony: {
      name: '',
      category: 'Colony',
      description: '',
      cost: { colony: { metal: 900, water : 500, glass : 900 } },
      consumption: {colony : {energy : 250000, food : 10}},
      production: {colony : {research : 10}},
      storage: { colony: { colonists: 100} },
      baseComfort : 0.2,
      dayNightActivity: false, // Not affected by day/night
      canBeToggled: true, // No manual toggle needed
      requiresMaintenance: true,
      maintenanceFactor: 1, // Default maintenance factor
      unlocked: false,
      requiresLand : 10
    }
    ,
    t3_colony: {
      name: '',
      category: 'Colony',
      description: '',
      cost: { colony: { metal: 8000, water : 5000, glass : 8000 } },
      consumption: {colony : {energy : 2500000, food : 100, electronics: 1}},
      production: {colony : {research : 100}},
      storage: { colony: { colonists: 1000} },
      baseComfort : 0.4,
      dayNightActivity: false, // Not affected by day/night
      canBeToggled: true, // No manual toggle needed
      requiresMaintenance: true,
      maintenanceFactor: 1, // Default maintenance factor
      unlocked: false,
      requiresLand : 100
    }
    ,
    t4_colony: {
      name: '',
      category: 'Colony',
      description: '',
      cost: { colony: { metal: 70000, water : 50000, glass : 70000 } },
      consumption: {colony : {energy : 25000000, food : 1000, electronics: 10, androids: 0.1}},
      production: {colony : {research : 1000}},
      storage: { colony: { colonists: 10000} },
      baseComfort : 0.6,
      dayNightActivity: false, // Not affected by day/night
      canBeToggled: true, // No manual toggle needed
      requiresMaintenance: true,
      maintenanceFactor: 1, // Default maintenance factor
      unlocked: false,
      requiresLand : 1000
    },
    t5_colony: {
      name: '',
      category: 'Colony',
      description: '',
      cost: { colony: { metal: 600000, water : 500000, glass : 600000 } },
      consumption: {colony : {energy : 250000000, food : 10000, electronics: 100, androids: 1}},
      production: {colony : {research : 10000}},
      storage: { colony: { colonists: 100000} },
      baseComfort : 0.8,
      dayNightActivity: false, // Not affected by day/night
      canBeToggled: true, // No manual toggle needed
      requiresMaintenance: true,
      maintenanceFactor: 1, // Default maintenance factor
      unlocked: false,
      requiresLand : 10000
    },
    t6_colony: {
      name: '',
      category: 'Colony',
      description: '',
      cost: { colony: { metal: 5000000, water : 5000000, glass : 5000000 } },
      consumption: {colony : {energy : 2500000000, food : 100000, electronics: 1000, androids: 10}},
      production: {colony : {research : 100000}},
      storage: { colony: { colonists: 1000000} },
      baseComfort : 1,
      dayNightActivity: false, // Not affected by day/night
      canBeToggled: true, // No manual toggle needed
      requiresMaintenance: true,
      maintenanceFactor: 1, // Default maintenance factor
      unlocked: false,
      requiresLand : 100000,
      autoBuildMaxOption: true
    },
    t7_colony: {
      name: '',
      category: 'Colony',
      description: '',
      cost: { colony: { metal: 50000000, water: 50000000, glass: 50000000, superalloys: 1000000 } },
      consumption: { colony: { energy: 25000000000, food: 1000000, electronics: 10000, androids: 100 } },
      production: { colony: { research: 1000000 } },
      storage: { colony: { colonists: 10000000, androids: 100000000 } },
      baseComfort: 1,
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: true,
      maintenanceFactor: 1,
      unlocked: false,
      requiresLand: 100000,
      autoBuildMaxOption: true
    }
};
