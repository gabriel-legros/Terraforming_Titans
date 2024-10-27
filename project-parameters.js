const projectParameters = {
  cargo_rocket: {
    name: "Cargo Rocket",
    cost: {
    },
    duration: 90000,  // Duration of the project in milliseconds (e.g., 3 minutes)
    description: "Launch a cargo rocket to bring in essential supplies including metal and water to boost the colony's infrastructure.",
    repeatable: true,  // Flag indicating if the project is repeatable
    maxRepeatCount: Infinity,  // Infinite repeats allowed
    unlocked: true,
    attributes: {
      resourceChoiceGainCost: {
        colony: {
          metal : 5,
          glass: 5,
          water : 1,
          food : 1,
          components: 10,
          electronics: 10
        }
      }
    }
  },
  import_colonists_1: {
    name: "Import colonists",
    cost: {
    },
    duration: 180000,  // Duration of the project in milliseconds
    description: "Use chemical rockets to import colonists from Earth",
    repeatable: true,  // Flag indicating if the project is repeatable
    maxRepeatCount: Infinity,  // Maximum of 5 repeats allowed
    unlocked: false,
    attributes: {
      resourceGain: {
        colony: {
          colonists: 10
        }
      }
    }
  },
  satellite: {
    name: "Ore satellite",
    cost: {
      colony: {
        metal: 50,
        electronics: 10,
        energy: 50
      }
    },
    duration: 60000,  // Duration of the project in milliseconds (e.g., 1 minute)
    description: "Deploy a satellite to enhance the discovery of valuable ore deposits. The satellite scans the surface for untapped ore veins, accelerating resource extraction. Each additional satellite increases scanning efficiency, but locating new veins becomes progressively more challenging as deposits are exhausted.",
    repeatable: true,  // Flag indicating if the project is repeatable
    maxRepeatCount: 1000,
    unlocked: false,
    attributes: {
      scanner: {
        canSearchForDeposits: true,  // Flag indicating the satellite can search for ore deposits
        searchValue: 0.00001,  // Search value indicating effectiveness in finding ore deposits
        depositType: "ore"  // Specify which type of deposit the scanner searches for
      }
    }
  },
  geo_satellite: {
    name: "Geothermal satellite",
    cost: {
      colony: {
        metal: 50,
        electronics: 10,
        energy: 50
      }
    },
    duration: 60000,  // Duration of the project in milliseconds (e.g., 1 minute)
    description: "Deploy a highly sensitive satellite to scan for geothermal energy. The satellite identifies suitable geothermal vents for energy extraction.",
    repeatable: true,  // Flag indicating if the project is repeatable
    maxRepeatCount: 100,
    unlocked: false,
    attributes: {
      scanner: {
        canSearchForDeposits: true,  // Flag indicating the satellite can search for geothermal deposits
        searchValue: 0.001,  // Search value indicating effectiveness in finding geothermal deposits
        depositType: "geothermal"  // Specify which type of deposit the scanner searches for
      }
    }
  },
  spaceMirrorFacility: {
    name: "Space mirror facility",
    cost: {
      colony: {
        metal: 10000,
        electronics: 1000,
        components: 1000
      }
    },
    duration: 180000,
    description: "Built at a Lagrangian point, this facility will allow the construction of space mirrors from the buildings terraforming tab.",
    repeatable: false,
    unlocked: false,
    attributes: {
      spaceMirrorFacility: true,
      completionEffect: [
        {
          target: 'building',
          targetId: 'spaceMirror',
          type: 'enable'
        }
      ]
    }
  },
  deeperMining: {
    name: "Deeper mining",
    cost: {
      colony: {
        electronics : 1000,
        components: 1000
      }
    },
    duration: 120000,
    description: "Deepens all ore mines to improve production.  Each completion improves metal production by an additive 20%.  This project becomes more expensive each time it is completed.",
    repeatable: true,
    maxRepeatCount: 1000,
    unlocked : false,
    attributes : {
      costScaling : true,
      effectScaling : true,
      completionEffect: [
        {
          target: 'building',
          targetId: 'oreMine',
          effectId: 'deeper_mining',
          type: 'productionMultiplier',
          value: 1.2
        }      
      ]
    }
  },
  oreSpaceMining: {
    name: "Metal Asteroid Mining",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to mine asteroids for metal. The first 100 assignments reduce the duration, every assignment afterward provides a multiplier.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceMining : true,
      costPerShip : {colony : {metal : 100000, energy : 5000000}},
      resourceGainPerShip : {colony: {metal : 1000000}}
    }
  },
  spaceElevator: {
    name: "Space Elevator",
    cost: {
      colony: {
        metal : 50000000,
        electronics : 1000000,
        components: 1000000
      }
    },
    duration: 360000,
    description: "This cable eliminates all metal costs from multiple space activities.",
    repeatable: false,
    unlocked : false,
    attributes : {
      completionEffect: [
        {
          target : 'building',
          targetId : 'spaceMirror',
          type : 'resourceCostMultiplier',
          resourceCategory : 'colony',
          resourceId : 'metal',
          value : 0
        },
        {
          target : 'project',
          targetId : 'oreSpaceMining',
          type : 'resourceCostMultiplier',
          resourceCategory : 'colony',
          resourceId : 'metal',
          value : 0
        },
        {
          target : 'project',
          targetId : 'carbonSpaceMining',
          type : 'resourceCostMultiplier',
          resourceCategory : 'colony',
          resourceId : 'metal',
          value : 0
        },
        {
          target : 'project',
          targetId : 'nitrogenSpaceMining',
          type : 'resourceCostMultiplier',
          resourceCategory : 'colony',
          resourceId : 'metal',
          value : 0
        }   
      ]
    }
  },  
    carbonSpaceMining: {
    name: "Carbon Asteroid Mining",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to recover carbon from C-type asteroids, brought back as CO2. The first 100 assignments reduce the duration, every assignment afterward provides a multiplier.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceMining : true,
      costPerShip : {colony : {metal : 100000, energy : 5000000}},
      resourceGainPerShip : {atmospheric: {carbonDioxide : 1000000}}
    }
  },
  nitrogenSpaceMining: {
    name: "Nitrogen harvesting",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to recover nitrogen from the outer solar system. The first 100 assignments reduce the duration, every assignment afterward provides a multiplier.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceMining : true,
      costPerShip : {colony : {metal : 100000, energy : 5000000}},
      resourceGainPerShip : {atmospheric: {inertGas : 1000000}}
    }
  },
};


