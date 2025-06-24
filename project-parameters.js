const projectParameters = {
  cargo_rocket: {
    name: "Cargo Rocket",
    category :"resources",
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
          electronics: 10,
          androids: 1000,
        },
        special: {
          spaceships:10000
        }
      }
    }
  },
  import_colonists_1: {
    name: "Import colonists",
    category :"resources",
    cost: {
    },
    duration: 180000,  // Duration of the project in milliseconds
    description: "Use chemical rockets to import colonists",
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
  exportResources: {
    name : "Metal Exportation",
    category : "resources",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to export resources to the market.  Generates funding.  The first 100 assignments reduce the duration, every assignment afterward provides a multiplier.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceExport : true,
      costPerShip : {colony : {metal : 100000, energy : 10000000000}},
      disposable : {colony : ['metal']},
      defaultDisposal : {category : 'colony', resource : 'metal'},
      disposalAmount : 1000000,
      fundingGainAmount : 0.1
    }
  },
  satellite: {
    name: "Ore satellite",
    category :"infrastructure",
    cost: {
      colony: {
        metal: 50,
        electronics: 10,
        energy: 500000
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
    category :"infrastructure",
    cost: {
      colony: {
        metal: 50,
        electronics: 10,
        energy: 500000
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
    category :"infrastructure",
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
    category : "infrastructure",
    cost: {
      colony: {
        electronics : 1000,
        components: 1000
      }
    },
    duration: 120000,
    description: "Deepens all ore mines to improve production, adding one layer.  Each completion improves metal production by an additive 100%.  This project becomes more expensive each time it is completed.",
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
          value: 1
        }      
      ]
    }
  },
  oreSpaceMining: {
    name: "Metal Asteroid Mining",
    category :"resources",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to mine asteroids for metal. The first 100 assignments reduce the duration, every assignment afterward provides a multiplier.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceMining : true,
      costPerShip : {colony : {metal : 100000, energy : 100000000000}},
      resourceGainPerShip : {colony: {metal : 1000000}}
    }
  },
    carbonSpaceMining: {
    name: "Carbon Asteroid Mining",
    category :"resources",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to recover carbon from C-type asteroids, brought back as CO2. The first 100 assignments reduce the duration, every assignment afterward provides a multiplier.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceMining : true,
      costPerShip : {colony : {metal : 100000, energy : 100000000000}},
      resourceGainPerShip : {atmospheric: {carbonDioxide : 1000000}}
    }
  },
  waterSpaceMining: {
    name: "Ice and Water importation",
    category :"resources",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to recover water and ice from all over the place, delivered as ice to the surface. The first 100 assignments reduce the duration, every assignment afterward provides a multiplier.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceMining : true,
      costPerShip : {colony : {metal : 100000, energy : 100000000000}},
      resourceGainPerShip : {surface: {ice : 1000000}}
    }
  },
  nitrogenSpaceMining: {
    name: "Nitrogen harvesting",
    category :"resources",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to recover nitrogen from the outer solar system. The first 100 assignments reduce the duration, every assignment afterward provides a multiplier.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceMining : true,
      costPerShip : {colony : {metal : 100000, energy : 100000000000}},
      resourceGainPerShip : {atmospheric: {inertGas : 1000000}}
    }
  },
  spaceElevator: {
    name: "Space Elevator",
    category :"infrastructure",
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
        },
        {
          target : 'project',
          targetId : 'waterSpaceMining',
          type : 'resourceCostMultiplier',
          resourceCategory : 'colony',
          resourceId : 'metal',
          value : 0
        },
        {
          target : 'project',
          targetId : 'disposeResources',
          type : 'resourceCostMultiplier',
          resourceCategory : 'colony',
          resourceId : 'metal',
          value : 0
        },
        {
          target : 'project',
          targetId : 'exportResources',
          type : 'resourceCostMultiplier',
          resourceCategory : 'colony',
          resourceId : 'metal',
          value : 0
        }   
      ]
    }
  },  
  magneticShield : {
    name : 'Magnetic Shield',
    category :"infrastructure",
    cost: {
      colony: {
        metal: 1e12,
        glass: 1e12,
        electronics: 1e10,
        components: 1e10,
        superconductors : 1e9
      }
    },
    duration: 120000,
    description: "This very expensive cable can carry enough current to protect the planet and its atmosphere.  The reduction in cancer rates provides an effective boost of 50% to life growth.",
    repeatable: false,
    unlocked : false,
    attributes : {
      completionEffect: [
        {
          type: 'booleanFlag',
          target: 'terraforming',
          flagId: 'magneticShield',
          value: true
        },
        {
          target: 'terraforming',
          type: 'lifeGrowthMultiplier',
          value: 1.5
        }
      ]
    }
  },
  disposeResources : {
    name : "Resource Disposal",
    category : "resources",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to dispose of unwanted resources somewhere.  Cheaper than importing.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceExport : true,
      costPerShip : {colony : {metal : 100000, energy : 10000000000}},
      disposable : {surface : ['liquidWater', 'ice', 'dryIce'], atmospheric : ['carbonDioxide', 'oxygen', 'inertGas', 'greenhouseGas']},
    disposalAmount : 1000000
    }
  },
  earthProbe : {
    name : "Earth Recon Probe",
    category : "story",
    cost : {
      colony : {
        components : 10,
        electronics : 10,
        energy : 10000
      }
    },
    duration : 300000,
    description : "Send an automated probe back to Earth to search for clues.",
    repeatable : true,
    maxRepeatCount : 10,
    unlocked : false,
    attributes : {
      planet : 'titan',
      costDoubling : true,
      storySteps : [
        "Probe telemetry confirmed: Earth fragmented into massive tectonic shards.",
        "Expansive oceans of molten silicates illuminate the planetary remains.",
        "No continental structures persist; only turbulent magma storms detected.",
        "Residual gamma radiation permeates ruins of former metropolitan zones.",
        "Carbonized debris displays signatures of precision-directed energy pulses.",
        "Spectroscopic analysis indicates widespread positron annihilation events.",
        "Impact cratering consistent with a colossal asteroid collision identified.",
        "Chronometric data reveals catastrophic events unfolded within minutes.",
        "Orbital dispersion patterns resemble formation dynamics of a nascent asteroid belt.",
        "Surface integrity nullified—analysis confirms simultaneous laser, antimatter, and asteroid offensive."
      ]
    }
  },
  hyperionLantern: {
    name: "Hyperion Lantern",
    category: "infrastructure",
    cost: {
      colony: {
        metal: 1e9,
        glass: 1e9,
        electronics: 1e9,
        components: 1e9
      }
    },
    duration: 300000,
    description: "A ridiculously huge lamp placed in orbit. It's basically the biggest flashlight ever built, capable of flooding the planet with artificial sunlight.",
    repeatable: false,
    unlocked: false,
    attributes: {
      completionEffect: [
        {
          type: 'booleanFlag',
          target: 'terraforming',
          flagId: 'hyperionLanternBuilt',
          value: true
        }
      ]
    }
  }
};


