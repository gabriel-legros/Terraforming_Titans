const colonyParameters = {
    t1_colony: {
      name: 'Research Outpost',
      category: 'Colony',
      description: 'A small, self-sufficient habitat that serves as a starting point for early settlers. This outpost provides basic amenities and supports a small crew of researchers.',
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
      name: 'Permanent Outpost',
      category: 'Colony',
      description: 'As the colony expands, this larger outpost offers improved facilities and can house a growing number of colonists.',
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
      name: 'Small Settlement',
      category: 'Colony',
      description: 'A well-developed outpost that represents a significant milestone in colonial growth. It provides a comfortable living environment and supports a thriving community of colonists.',
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
      name: 'Dome Town',
      category: 'Colony',
      description: 'A self-sufficient, fully insulated habitat designed to support a large population, providing essential amenities and sustainable infrastructure for a thriving community.',
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
      name: 'Dome City',
      category: 'Colony',
      description: 'Dome City is a large, climate-controlled habitat supporting a thriving population with advanced amenities, sustainable agriculture, and cutting-edge infrastructure—an oasis of comfort and innovation on the frontier.',
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
      name: 'Metropolis',
      category: 'Colony',
      description: 'A massive arcology structure designed to be a fully autonomous city, supporting a large population with advanced research and production facilities.',
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
      requiresLand : 100000
    },
    t7_colony: {
      name: 'Ecumenopolis District',
      category: 'Colony',
      description: 'A planet-spanning city offering unparalleled comfort and capacity.',
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
      requiresLand: 100000
    }
}