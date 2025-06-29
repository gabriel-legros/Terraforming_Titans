const colonyParameters = {
    t1_colony: {
      name: 'Research Outpost',
      category: 'Colony',
      description: 'A small, self-sufficient habitat that serves as a starting point for early settlers. This outpost provides basic amenities and supports a small crew of researchers.',
      cost: { colony: { metal: 50, water : 50, glass : 100 } },
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
      cost: { colony: { metal: 250, water : 500, glass : 250 } },
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
      cost: { colony: { metal: 1000, water : 5000, glass : 1000 } },
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
      cost: { colony: { metal: 5000, water : 50000, glass : 5000 } },
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
      cost: { colony: { metal: 25000, water : 500000, glass : 25000 } },
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
      cost: { colony: { metal: 100000, water : 5000000, glass : 100000 } },
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
    }
}