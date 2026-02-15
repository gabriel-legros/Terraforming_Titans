const projectParameters = {
  cargo_rocket: {
    type: 'CargoRocketProject',
    name: "Cargo Rocket",
    category :"resources",
    cost: {
    },
    duration: 60000,  // Duration of the project in milliseconds (e.g., 3 minutes)
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
      continuousAsBuilding: true,
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
    type: 'ImportColonistsProject',
    name: "Import colonists",
    category :"resources",
    cost: {
    },
    duration: 60000,  // Duration of the project in milliseconds
    description: "Use chemical rockets to import colonists",
    repeatable: true,  // Flag indicating if the project is repeatable
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      resourceGain: {
        colony: {
          colonists: 5
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
    kesslerDebrisSize: 'large',
    attributes: {
      spaceExport : true,
      continuousAsBuilding: true,
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
    kesslerDebrisSize: 'small',
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
    kesslerDebrisSize: 'small',
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
    kesslerDebrisSize: 'large',
    attributes: {
      disableWhenHazard: ['pulsar'],
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
  ringworldTerraforming: {
    type: 'RingworldTerraformingProject',
    name: 'Ringworld Terraforming',
    category: 'infrastructure',
    cost: {},
    duration: 0,
    description: "This project keeps track of the Ringworld's spin and its effects.",
    repeatable: false,
    unlocked: false,
    attributes: {
      energyRequired: 1e21,
      shipEnergyMultiplier: 0.1,
      power: 0,
      powerStep: 1e21
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
    description: "Deepen all ore mines to improve production, adding one layer. Each completion improves metal production by an additive 100%. Most of the cost scales with ore mines built while a small portion also scales with their average depth.",
    repeatable: true,
    maxDepth: 10000,
    unlocked : false,
    attributes : {
      costOreMineScaling : true,
      effectScaling : true,
      keepStartBarVisible: true,
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
        metal: 500,
        components: 50
      }
    },
    duration: 300000,
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
    kesslerDebrisSize: 'large',
    attributes: {
      spaceMining : true,
      importCapResource: 'metal',
      continuousAsBuilding: true,
      costPerShip : {colony : {metal : 100000, energy : 100000000000}},
      resourceGainPerShip : {colony: {metal : 500000}},
      kesslerDebrisFromGainFraction: 0.25
    }
  },
  siliconSpaceMining: {
    type: 'SpaceMiningProject',
    name: "Silica Asteroid Mining",
    category :"resources",
    cost: {},
    duration: 100000,
    description: "Use your spaceships to mine asteroids for silicon. The first 100 spaceship assignments reduce the duration, every spaceship assignment afterward provides a multiplier. Without a space elevator, the metal cost per ship reduces the silicon returned.",
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    kesslerDebrisSize: 'large',
    attributes: {
      spaceMining : true,
      importCapResource: 'silicon',
      continuousAsBuilding: true,
      costPerShip : {colony : {metal : 100000, energy : 100000000000}},
      resourceGainPerShip : {colony: {silicon : 500000}},
      kesslerDebrisFromGainFraction: 0.25
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
    kesslerDebrisSize: 'large',
    attributes: {
      spaceMining : true,
      importCapResource: 'carbon',
      continuousAsBuilding: true,
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
    kesslerDebrisSize: 'large',
    attributes: {
      spaceMining : true,
      importCapResource: 'water',
      continuousAsBuilding: true,
      dynamicWaterImport: true,
      maxWaterCoverage: 0.2,
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
    kesslerDebrisSize: 'large',
    attributes: {
      spaceMining : true,
      importCapResource: 'nitrogen',
      continuousAsBuilding: true,
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
    kesslerDebrisSize: 'large',
    attributes: {
      spaceMining: true,
      importCapResource: 'hydrogen',
      continuousAsBuilding: true,
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
      disableWhenHazard: ['kessler', 'pulsar'],
      landCostScaling: true,
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
          targetId : 'siliconSpaceMining',
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
      landCostScaling: true,
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
  artificialSky: {
    type: 'ArtificialSkyProject',
    name: 'Artificial Sky',
    category: 'infrastructure',
    cost: {
      colony: {
        superalloys: 10_000,
        water: 300_000,
        metal: 100_000
      }
    },
    duration: 300000,
    description: 'Deploy an artificial sky shield to block pulsar radiation bursts. Clears the pulsar hazard on completion.',
    repeatable: false,
    unlocked: false,
    attributes: {}
  },
  planetaryThruster: {
    type: 'PlanetaryThrustersProject',
    name: 'Planetary Thrusters',
    category: 'mega',
    requireStar: true,
    cost: {
      colony: {
        metal: 5_000_000_000,
        components: 10_000_000_000,
        electronics: 2_00_000_000
      }
    },
    duration: 300000,
    description: 'Install planetary fusion thrusters for subtle maneuvering.',
    repeatable: false,
    unlocked: false,
    attributes: {
      disableWhenHazard: ['kessler']
    }
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
  dysonSphere: {
    type: 'DysonSphereProject',
    name: 'Dyson Sphere',
    category: 'giga',
    cost: {
      colony: {
        superalloys: 1_000_000_000_000_000_000,
      }
    },
    duration: 18000000,
    description: 'Assemble a Dyson Sphere frame, enabling 100x faster collectors expansion.  Disables Dyson Swarm on completion, transferring all collectors.',
    repeatable: false,
    unlocked: false,
    attributes: { canUseSpaceStorage: true, preserveProgressOnTravel: true }
  },
  hephaestusMegaconstruction: {
    type: 'HephaestusMegaconstructionProject',
    name: 'Hephaestus Megaconstruction Yard',
    category: 'giga',
    cost: {
      colony: {
        superalloys: 500_000_000_000,
        components: 5_000_000_000_000
      }
    },
    duration: 18_000_000,
    description: 'Assemble a legendary construction yard that accelerates repeatable mega and giga projects. Each completion adds a yard that can be assigned, counting as an extra world.  Project duration scales with terraformed worlds.',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: { canUseSpaceStorage: true, preserveProgressOnTravel: true }
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
    description: 'Orbital rings count as an additional terraformed world.  Does not grant a skill point.  You can build a ring on previously terraformed worlds, and on the current one if terraformed.  Building a ring on the current world also increases its land by its initial land value.  You can prepay rings for each world without a ring.',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: { canUseSpaceStorage: true, showInResourcesRate: false }
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
    description: 'Construct an orbital facility for massive resource storage. Each terraformed world reduces expansion time.  Resources in space storage may also be used to pay for most mega projects (planetary thrusters excepted).  Space storage capacity and resources in storage persist between worlds.',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    kesslerDebrisSize: 'large',
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
    type: 'MegaHeatSinkProject',
    name: 'Mega Heat Sink',
    category: 'mega',
    cost: {
      colony: {
        superalloys: 1_000_000_000,
        components: 10_000_000
      }
    },
    duration: 60000,
    description: 'Construct a titanic heatsink complex to siphon planetary heat at unprecedented scales, fully equipped with its own pumps.  Each heat sink will accelerate planet cooling by 1 PW.  Will not take the current temperature below its trend.',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      disableWhenHazard: ['kessler', 'pulsar'],
      canUseSpaceStorage: true,
      megaHeatSink: true,
      workersPerCompletion: 1_000_000_000,
    }
  },
  lifters: {
    type: 'LiftersProject',
    name: 'Lifters',
    category: 'mega',
    cost: {
      colony: {
        superalloys: 1_000_000,
        electronics: 10_000_000,
        superconductors: 1_000_000_000,
        metal: 10_000_000_000,
        components: 500_000_000,
      }
    },
    duration: 300000,
    description: 'Assemble space-rated lifting platforms that either siphon hydrogen into space storage or peel away the local atmosphere, using inefficient energy beams.  Persists between worlds, duration scales with terraformed worlds, and taps unused Dyson power.',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      canUseSpaceStorage: true,
      lifterUnitRate: 10_000_000,
      lifterEnergyPerUnit: 10_000_000,
      lifterHarvestRecipes: {
        hydrogen: {
          label: 'Hydrogen',
          storageKey: 'hydrogen',
          outputMultiplier: 1
        },
        methane: {
          label: 'Methane',
          storageKey: 'atmosphericMethane',
          outputMultiplier: 0.01,
          requiresProjectFlag: 'methaneAmmoniaLifting'
        },
        ammonia: {
          label: 'Ammonia',
          storageKey: 'atmosphericAmmonia',
          outputMultiplier: 0.01,
          requiresProjectFlag: 'methaneAmmoniaLifting'
        }
      },
      canUseDysonOverflow: true,
    }
  },
  bioworld: {
    type: 'BioworldProject',
    name: 'Bioworld',
    category: 'mega',
    cost: {},
    duration: 300000,
    description: 'Cultivate a bioworld-scale ecosystem. Completion removes all Ecumenopolis Districts and permanently disables new ones. Completed bioworlds grant evolution points when travelling based on total biomass.',
    repeatable: false,
    unlocked: false,
    attributes: {
      projectGroup: 'specializedWorlds',
      keepStartBarVisible: true
    }
  },
  foundryWorld: {
    type: 'FoundryWorldProject',
    name: 'Foundry World',
    category: 'mega',
    cost: {
      colony: {
        superalloys: 1e16,
        components: 1e15
      }
    },
    duration: 300000,
    description: 'Tap into the metal-rich molten planetary core and convert the surface into a mega-scale casting hub. Completion converts all Ecumenopolis Districts into Metropolises and permanently disables new ones. Each completed foundry world adds +100B * sqrt(initial land / 50B) to the metal mining cap. Completed foundry worlds grant 10 metallurgy points times sqrt(initial land / 50B) when travelling.',
    repeatable: false,
    unlocked: false,
    attributes: {
      projectGroup: 'specializedWorlds',
      keepStartBarVisible: true
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
    kesslerDebrisSize: 'large',
    attributes: {
      spaceExport : true,
      continuousAsBuilding: true,
      costPerShip : {colony : {metal : 100000, energy : 10000000000}},
      disposable : {
        colony: ['water'],
        surface: [
          'liquidWater',
          'ice',
          'dryIce',
          'liquidCO2',
          'liquidMethane',
          'hydrocarbonIce',
          'liquidAmmonia',
          'ammoniaIce',
          'liquidOxygen',
          'oxygenIce',
          'liquidNitrogen',
          'nitrogenIce'
        ],
        atmospheric: [
          'atmosphericWater',
          'atmosphericAmmonia',
          'carbonDioxide',
          'oxygen',
          'inertGas',
          'greenhouseGas',
          'atmosphericMethane',
          'hydrogen',
          'sulfuricAcid'
        ]
      },
      massDriverShipEquivalency: 10,
      disposalAmount : 1000000
    }
  }
};


