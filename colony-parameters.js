const colonyParameters = {
    t1_colony: {
      name: 'Research Outpost',
      category: 'Colony',
      description: 'A small, self-sufficient habitat that serves as a starting point for early settlers. This outpost provides basic amenities and supports a small crew of researchers.',
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
      name: 'Permanent Outpost',
      category: 'Colony',
      description: 'As the colony expands, this larger outpost offers improved facilities and can house a growing number of colonists.',
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
    ,
    t3_colony: {
      name: 'Small Settlement',
      category: 'Colony',
      description: 'A well-developed outpost that represents a significant milestone in colonial growth. It provides a comfortable living environment and supports a thriving community of colonists.',
      cost: { colony: { metal: 1000, water : 1000, glass : 1000 } },
      consumption: {colony : {energy : 250, food : 100, electronics: 1}},
      production: {colony : {research : 100}},
      storage: { colony: { colonists: 1000} },
      baseComfort : 0.4,
      dayNightActivity: false, // Not affected by day/night
      canBeToggled: true, // No manual toggle needed
      requiresMaintenance: true,
      maintenanceFactor: 1, // Default maintenance factor
      unlocked: false
    }
    ,
    t4_colony: {
      name: 'Dome town',
      category: 'Colony',
      description: 'A fully insulated self-sufficient capable of supporting a large population.',
      cost: { colony: { metal: 5000, water : 5000, glass : 5000 } },
      consumption: {colony : {energy : 2500, food : 1000, electronics: 10}},
      production: {colony : {research : 1000}},
      storage: { colony: { colonists: 10000} },
      baseComfort : 0.6,
      dayNightActivity: false, // Not affected by day/night
      canBeToggled: true, // No manual toggle needed
      requiresMaintenance: true,
      maintenanceFactor: 1, // Default maintenance factor
      unlocked: false
    }
}