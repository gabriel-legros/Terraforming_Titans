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
    unlocked: true,
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
        energy: 50
      }
    },
    duration: 60000,  // Duration of the project in milliseconds (e.g., 1 minute)
    description: "Deploy a satellite to enhance the discovery of valuable ore deposits. The satellite scans the surface for untapped ore veins, accelerating resource extraction. Each additional satellite increases scanning efficiency, but locating new veins becomes progressively more challenging as deposits are exhausted.",
    repeatable: true,  // Flag indicating if the project is repeatable
    maxRepeatCount: 10,
    unlocked: true,
    attributes: {
      scanner: {
        canSearchForDeposits: true,  // Flag indicating the satellite can search for ore deposits
        searchValue: 0.01,  // Search value indicating effectiveness in finding ore deposits
        depositType: "ore"  // Specify which type of deposit the scanner searches for
      }
    }
  },
  geo_satellite: {
    name: "Geothermal satellite",
    cost: {
      colony: {
        metal: 50,
        energy: 50
      }
    },
    duration: 60000,  // Duration of the project in milliseconds (e.g., 1 minute)
    description: "Deploy a highly sensitive satellite to scan for geothermal energy. The satellite identifies suitable geothermal vents for energy extraction.",
    repeatable: true,  // Flag indicating if the project is repeatable
    maxRepeatCount: 10,
    unlocked: false,
    attributes: {
      scanner: {
        canSearchForDeposits: true,  // Flag indicating the satellite can search for geothermal deposits
        searchValue: 0.01,  // Search value indicating effectiveness in finding geothermal deposits
        depositType: "geothermal"  // Specify which type of deposit the scanner searches for
      }
    }
  }
};


