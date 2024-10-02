const projectParameters = {
  satellite: {
    name: "Ore satellite",
    cost: {
      colony: {
        metal: 50,
        energy: 50
      }
    },
    duration: 60000,  // Duration of the project in milliseconds (e.g., 1 minute)
    description: "Launch a satellite to enhance mineral extraction from Martian soil.  Satellites scan for new ore veins.  More satellites improve scanning speed.  Veins become harder to find the more they are found.",
    repeatable: true,  // Flag indicating if the project is repeatable
    maxRepeatCount: Infinity,  // Infinite repeats allowed
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
    description: "Launch a sensitive satellite to scan for geothermal energy.  Satellite scan for suitable geothermal vents.",
    repeatable: true,  // Flag indicating if the project is repeatable
    maxRepeatCount: Infinity,  // Infinite repeats allowed
    attributes: {
      scanner: {
        canSearchForDeposits: true,  // Flag indicating the satellite can search for geothermal deposits
        searchValue: 0.01,  // Search value indicating effectiveness in finding geothermal deposits
        depositType: "geothermal"  // Specify which type of deposit the scanner searches for
      }
    }
  },
  import_colonists_1: {
    name: "Import colonists",
    cost: {
      colony: {
        metal: 50,
        energy: 50
      }
    },
    duration: 300000,  // Duration of the project in milliseconds
    description: "Use chemical rockets to import a small group of 10 scientists from Earth",
    repeatable: true,  // Flag indicating if the project is repeatable
    maxRepeatCount: Infinity,  // Maximum of 5 repeats allowed
    attributes: {
      resourceGain: {
        colony: {
          colonists: 10
        }
      }
    }
  }
};
