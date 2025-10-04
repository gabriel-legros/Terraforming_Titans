const projectParameters = {
  cargo_rocket: {
    type: 'CargoRocketProject',
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
          metal : 2,
          glass: 1,
          water : 1,
          food : 1,
          components: 10,
          electronics: 10,
          androids: 200,
        },
        special: {
          spaceships:25000
        }
      }
    }
  },
  galactic_market: {
    type: 'GalacticMarketProject',
    name: "Galactic Market",
    category :"resources",
    cost: {
    },
    duration: 0,
    description: "Open trading lanes with the wider galaxy to import resources funded through market exchanges.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      resourceChoiceGainCost: {
        colony: {
          metal: 2,
          glass: 1,
          water: 1,
          food: 1,
          components: 10,
          electronics: 10,
          androids: 200,
        },
        special: {
          spaceships: 25000,
        },
      },
    }
  },
  import_colonists_1: {
    type: 'Project',
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
    type: 'SpaceExportProject',
    name : "Metal Exportation",
    category : "resources",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to export resources to the market.  Generates funding.  The first 100 spaceship assignments reduce the duration, every spaceship assignment afterward provides a multiplier.",
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
    type: 'ScannerProject',
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
    type: 'ScannerProject',
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
    type: 'SpaceMirrorFacilityProject',
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
    type: 'DeeperMiningProject',
    name: "Deeper mining",
    category : "infrastructure",
    cost: {
      colony: {
        components: 10
      }
    },
    duration: 120000,
    description: "Deepens all ore mines to improve production, adding one layer. Each completion improves metal production by an additive 100%. Most of the cost scales with ore mines built while a small portion also scales with their average depth.",
    repeatable: true,
    maxDepth: 10000,
    unlocked : false,
    attributes : {
      costOreMineScaling : true,
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
  undergroundExpansion: {
    type: 'UndergroundExpansionProject',
    name: "Underground Land Expansion",
    category: "infrastructure",
    cost: {
      colony: {
        metal: 1,
        components: 0.01
      }
    },
    duration: 120000,
    description: "Build subterranean habitats to slightly expand usable land. Each completion increases land by a small amount.",
    repeatable: true,
    maxRepeatCount: 10000,
    unlocked: false,
    attributes: {}
  },
  oreSpaceMining: {
    type: 'SpaceMiningProject',
    name: "Metal Asteroid Mining",
    category :"resources",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to mine asteroids for metal. The first 100 spaceship assignments reduce the duration, every spaceship assignment afterward provides a multiplier. Without a space elevator, the metal cost per ship reduces the metal returned.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceMining : true,
      costPerShip : {colony : {metal : 100000, energy : 100000000000}},
      resourceGainPerShip : {colony: {metal : 500000}}
    }
  },
  carbonSpaceMining: {
    type: 'SpaceMiningProject',
    name: "Carbon Asteroid Mining",
    category :"resources",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to recover carbon from C-type asteroids, brought back as CO2. The first 100 spaceship assignments reduce the duration, every spaceship assignment afterward provides a multiplier.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceMining : true,
      costPerShip : {colony : {metal : 100000, energy : 100000000000}},
      resourceGainPerShip : {atmospheric: {carbonDioxide : 1000000}},
      maxPressure: 0.01,
      maxOxygenPressure: 15
    }
  },
  waterSpaceMining: {
    type: 'SpaceMiningProject',
    name: "Ice and Water importation",
    category :"resources",
    cost: {},
    duration: 100000,
    description: "Ships haul ice from space. If any zone is warm enough, it's delivered as liquid water there; otherwise it arrives frozen. The first 100 spaceship assignments reduce the duration, every spaceship assignment afterward provides a multiplier.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceMining : true,
      dynamicWaterImport: true,
      costPerShip : {colony : {metal : 100000, energy : 100000000000}},
      resourceGainPerShip : {surface: {ice : 1000000}}
    }
  },
  nitrogenSpaceMining: {
    type: 'SpaceMiningProject',
    name: "Nitrogen harvesting",
    category :"resources",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to recover nitrogen from the outer solar system. The first 100 spaceship assignments reduce the duration, every spaceship assignment afterward provides a multiplier.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceMining : true,
      costPerShip : {colony : {metal : 100000, energy : 100000000000}},
      resourceGainPerShip : {atmospheric: {inertGas : 1000000}},
      maxPressure: 75
    }
  },
  hydrogenSpaceMining: {
    type: 'SpaceMiningProject',
    name: "Hydrogen Importation",
    category :"resources",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to recover hydrogen from the outer solar system. The first 100 spaceship assignments reduce the duration, every spaceship assignment afterward provides a multiplier.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceMining: true,
      costPerShip: { colony: { metal: 100000, energy: 100000000000 } },
      resourceGainPerShip: { atmospheric: { hydrogen: 1000000 } },
      maxPressure: 75
    }
  },
  spaceElevator: {
    type: 'Project',
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
          targetId : 'hydrogenSpaceMining',
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
        },
        {
          target : 'project',
          targetId : 'spaceStorage',
          type : 'spaceshipCostMultiplier',
          resourceCategory : 'colony',
          resourceId : 'metal',
          value : 0
        }
      ]
    }
  },
  magneticShield : {
    type: 'Project',
    name : 'Magnetic Shield',
    category :"infrastructure",
    cost: {
      colony: {
        metal: 1e10,
        glass: 1e10,
        electronics: 1e9,
        components: 1e9,
        superconductors : 1e8
      }
    },
    duration: 120000,
    description: "This very expensive cable can carry enough current to protect the planet and its atmosphere.  The reduction in cancer rates negates the radiation penalty for life.  The cost of this project includes all the machinery and infrastructure required to build, house, cool and secure the cable.",
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
  planetaryThruster: {
    type: 'PlanetaryThrustersProject',
    name: 'Planetary Thrusters',
    category: 'mega',
    cost: {
      colony: {
        metal: 500_000_000,
        components: 1_000_000_000,
        electronics: 200_000_000
      }
    },
    duration: 300000,
    description: 'Install planetary fusion thrusters for subtle maneuvering.',
    repeatable: false,
    unlocked: false,
    attributes: { }
  },
  dysonSwarmReceiver : {
    type: 'DysonSwarmReceiverProject',
    name : 'Dyson Swarm',
    category : 'mega',
    cost: {
      colony: {
        metal: 10000000,
        components: 1000000,
        electronics: 100000
      }
    },
    duration: 300000,
    description: 'Expand your Dyson Swarm to produce power from the sun.  Build cheap receivers to receive power.  All colonies on terraformed worlds can help deploy collectors when materials are provided, shortening the process.  Collectors persist between worlds.  Collectors can be expanded even without the Dyson Swarm Receiver research.',
    repeatable: false,
    unlocked: false,
    attributes: { canUseSpaceStorage: true, completedWhenUnlocked: true }
  },
  orbitalRing: {
    type: 'OrbitalRingProject',
    name: 'Orbital Ring',
    category: 'mega',
    cost: {
      colony: {
        metal: 1_000_000_000_000_000,
        components: 100_000_000_000_000,
        superalloys: 10_000_000_000_000
      }
    },
    duration: 1800000,
    description: 'Orbital rings count as an additional terraformed world.  Does not grant a skill point.  You can build a ring on previously terraformed worlds, and on the current one if terraformed.  Building a ring on the current world also increases its land by its initial land value.',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: { canUseSpaceStorage: true }
  },
  spaceStorage : {
    type: 'SpaceStorageProject',
    name : 'Space Storage',
    category : 'mega',
    cost: {
      colony: {
        metal: 100_000_000_000,
      }
    },
    duration: 300000,
    description: 'Construct an orbital facility for massive resource storage. Each terraformed planet reduces expansion time.  Resources in space storage may also be used for certain special projects.  Space storage capacity and resources in storage persist between worlds.',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      spaceStorage: true,
      costPerShip: { colony: { metal : 100_000, energy: 250_000_000 } },
      transportPerShip: 1_000_000,
      canUseSpaceStorage: true
    }
  },
  particleAccelerator: {
    type: 'ParticleAcceleratorProject',
    name: 'Particle Accelerator',
    category: 'mega',
    cost: {
      colony: {
        superalloys: 50,
        superconductors: 50
      }
    },
    duration: 600000,
    description: 'Physicists can always use a bigger particle accelerator.',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      minimumRadiusMeters: 1,
      defaultRadiusMeters: 6_371_000,
      defaultStepMeters: 1,
      canUseSpaceStorage: true
    }
  },
  megaHeatSink: {
    type: 'Project',
    name: 'Mega Heat Sink',
    category: 'mega',
    cost: {
      colony: {
        superalloys: 1_000_000_000,
        components: 10_000_000
      }
    },
    duration: 60000,
    description: 'Construct a titanic heatsink complex to siphon planetary heat at unprecedented scales, fully equipped with its own pumps.  Each heat sink will accelerate planet cooling by 100 TW.',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      canUseSpaceStorage: true,
      megaHeatSink: true
    }
  },
  disposeResources : {
    type: 'SpaceDisposalProject',
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
      disposable : {surface : ['liquidWater', 'ice', 'dryIce'], atmospheric : ['carbonDioxide', 'oxygen', 'inertGas', 'greenhouseGas', 'atmosphericMethane', 'hydrogen', 'sulfuricAcid']},
      massDriverShipEquivalency: 10,
    disposalAmount : 1000000
    }
  }
};


