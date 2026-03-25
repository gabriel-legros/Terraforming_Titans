const projectParameters = {
  cargo_rocket: {
    type: 'CargoRocketProject',
    name: '',
    category :"resources",
    cost: {
    },
    duration: 60000,  // Duration of the project in milliseconds (e.g., 3 minutes)
    description: '',
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
    name: '',
    category :"resources",
    cost: {
    },
    duration: 0,
    description: '',
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
    name: '',
    category :"resources",
    cost: {
    },
    duration: 60000,  // Duration of the project in milliseconds
    description: '',
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
    name : '',
    category : "resources",
    cost: {},
    duration: 100000,
    description: '',
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
    name: '',
    category :"infrastructure",
    cost: {
      colony: {
        metal: 50,
        electronics: 10,
        energy: 500000
      }
    },
    duration: 60000,  // Duration of the project in milliseconds (e.g., 1 minute)
    description: '',
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
    name: '',
    category :"infrastructure",
    cost: {
      colony: {
        metal: 50,
        electronics: 10,
        energy: 500000
      }
    },
    duration: 60000,  // Duration of the project in milliseconds (e.g., 1 minute)
    description: '',
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
    name: '',
    category :"infrastructure",
    cost: {
      colony: {
        metal: 10000,
        electronics: 1000,
        components: 1000
      }
    },
    duration: 180000,
    description: '',
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
    name: '',
    category: 'infrastructure',
    cost: {},
    duration: 0,
    description: '',
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
    name: '',
    category : "infrastructure",
    cost: {
      colony: {
        components: 10
      }
    },
    duration: 120000,
    description: '',
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
    name: '',
    category: "infrastructure",
    cost: {
      colony: {
        metal: 500,
        components: 50
      }
    },
    duration: 240000,
    description: '',
    repeatable: true,
    maxRepeatCount: 10000,
    unlocked: false,
    attributes: {}
  },
  oreSpaceMining: {
    type: 'SpaceMiningProject',
    name: '',
    category :"resources",
    cost: {},
    duration: 100000,
    description: '',
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
    name: '',
    category :"resources",
    cost: {},
    duration: 100000,
    description: '',
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
    name: '',
    category :"resources",
    cost: {},
    duration: 100000,
    description: '',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    kesslerDebrisSize: 'large',
    attributes: {
      spaceMining : true,
      importCapResource: 'carbon',
      continuousAsBuilding: true,
      costPerShip : {colony : {metal : 100000, energy : 100_000_000_000}},
      resourceGainPerShip : {atmospheric: {carbonDioxide : 1000000}},
      maxPressure: 0.01,
      maxOxygenPressure: 15
    }
  },
  waterSpaceMining: {
    type: 'SpaceMiningProject',
    name: '',
    category :"resources",
    cost: {},
    duration: 100000,
    description: '',
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
    name: '',
    category :"resources",
    cost: {},
    duration: 100000,
    description: '',
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
    name: '',
    category :"resources",
    cost: {},
    duration: 100000,
    description: '',
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
    name: '',
    category :"infrastructure",
    cost: {
      colony: {
        metal : 50000000,
        electronics : 1000000,
        components: 1000000
      }
    },
    duration: 360000,
    description: '',
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
    name : '',
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
    description: '',
    repeatable: false,
    unlocked : false,
    attributes : {
      disableWhenHazard: ['pulsar'],
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
  klishyWeb: {
    type: 'Project',
    name: '',
    category: 'infrastructure',
    cost: {
      colony: {
        glass: 1_000_000_000_000_000,
        metal: 1_000_000_000_000_000,
        components : 10_000_000_000_000,
        superconductors : 10_000_000_000_000
      }
    },
    duration: 300000,
    description: '',
    repeatable: false,
    unlocked: false,
    automationRequiresEverEnabled: true,
    attributes: {}
  },
  keratiHive: {
    type: 'KeratiHiveProject',
    name: '',
    category: 'infrastructure',
    cost: {},
    duration: 0,
    description: '',
    repeatable: false,
    unlocked: false,
    automationRequiresEverEnabled: true,
    attributes: {
      tuning: {
        initialState: {
          territory: 1,
          spawningPools: 1,
          poolProgress: 0,
          hiveFood: 0,
          honey: 0,
          larva: 0,
          drones: 1,
          builders: 0,
          hunters: 0,
          princesses: 1,
          queens: 0,
          empresses: 0
        },
        batch: {
          defaultAmount: 1,
          maxAmount: 1e18
        },
        foodTransfer: {
          defaultAmount: 1
        },
        costs: {
          droneLarva: 1,
          droneHoney: 5,
          builderLarva: 1,
          builderHoney: 15,
          hunterLarva: 1,
          hunterHoney: 50,
          princessLarva: 5,
          princessHoney: 100,
          queenHoney: 5000,
          empressHoney: 100000
        },
        rates: {
          droneFoodPerSecond: 1,
          droneHoneyPerSecond: 1,
          builderHoneyPerSecond: 5,
          builderPoolProgressPerSecond: 0.005,
          hunterBiomassPerSecond: 0.1,
          hunterFoodPerSecond: 10,
          hunterTerritoryPerSecond: 0.005,
          princessLarvaPerSecond: 0.1,
          queenLarvaPerSecond: 1,
          empressLarvaPerSecond: 10
        },
        territoryPerPool: 1
      }
    }
  },
  artificialSky: {
    type: 'ArtificialSkyProject',
    name: '',
    category: 'infrastructure',
    cost: {
      colony: {
        superalloys: 1_000,
        water: 300_000,
        metal: 100_000
      }
    },
    duration: 50000000,
    description: '',
    repeatable: true,
    maxRepeatCount: 1,
    unlocked: false,
    kesslerDebrisSize: 'large',
    attributes: {
      spaceMining: true,
      showInResourcesRate: false
    }
  },
  artificialCrust: {
    type: 'ArtificialCrustProject',
    name: '',
    category: 'infrastructure',
    cost: {
      colony: {
        superalloys: 100,
        components: 2_000,
        metal: 200_000
      }
    },
    duration: 50000,
    description: '',
    repeatable: true,
    maxRepeatCount: 1,
    unlocked: true,
    automationRequiresEverEnabled: true,
    attributes: {
      spaceMining: true,
      showInResourcesRate: false
    }
  },
  planetaryThruster: {
    type: 'PlanetaryThrustersProject',
    name: '',
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
    description: '',
    repeatable: false,
    unlocked: false,
    attributes: {
      disableWhenHazard: ['kessler']
    }
  },
  dysonSwarmReceiver : {
    type: 'DysonSwarmReceiverProject',
    name : '',
    category : 'mega',
    cost: {
      colony: {
        metal: 10000000,
        components: 1000000,
        electronics: 100000
      }
    },
    duration: 300000,
    description: '',
    repeatable: false,
    unlocked: false,
    attributes: {
      canUseSpaceStorage: true,
      completedWhenUnlocked: true,
      spaceBuilding: true,
      spaceEnergyProducer: true
    }
  },
  dysonSphere: {
    type: 'DysonSphereProject',
    name: '',
    category: 'giga',
    cost: {
      colony: {
        superalloys: 1_000_000_000_000_000_000,
      }
    },
    duration: 18_000_000,
    description: '',
    repeatable: false,
    unlocked: false,
    attributes: {
      canUseSpaceStorage: true,
      preserveProgressOnTravel: true,
      spaceBuilding: true,
      spaceEnergyProducer: true
    }
  },
  hephaestusMegaconstruction: {
    type: 'HephaestusMegaconstructionProject',
    name: '',
    category: 'giga',
    cost: {
      colony: {
        superalloys: 500_000_000_000,
        components: 5_000_000_000_000
      }
    },
    duration: 18_000_000,
    description: '',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: { canUseSpaceStorage: true, preserveProgressOnTravel: true }
  },
  nuclearAlchemyFurnace: {
    type: 'NuclearAlchemyFurnaceProject',
    name: '',
    category: 'giga',
    cost: {
      colony: {
        superalloys: 1_000_000_000_000_000,
        components: 100_000_000_000_000,
        superconductors: 100_000_000_000_000
      }
    },
    duration: 36_000_000,
    description: '',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      canUseSpaceStorage: true,
      alchemyParameter: 50_000_000_000,
      spaceBuilding: true
    }
  },
  superalloyGigafoundry: {
    type: 'SuperalloyGigafoundryProject',
    name: '',
    category: 'giga',
    cost: {
      colony: {
        superalloys: 1_000_000_000_000_000,
        components: 100_000_000_000_000,
        superconductors: 100_000_000_000_000,
        glass: 100_000_000_000_000,
        electronics: 50_000_000_000_000
      }
    },
    duration: 144_000_000,
    description: '',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      canUseSpaceStorage: true,
      alchemyParameter: 1,
      spaceBuilding: true
    }
  },
  apolloCoreSurgeryPlatform: {
    type: 'ApolloCoreSurgeryPlatformProject',
    name: '',
    category: 'giga',
    cost: {
      colony: {
        superalloys: 100_000_000_000_000_000_000,
        components: 1_000_000_000_000_000_000,
        electronics: 10_000_000_000_000
      }
    },
    duration: 18_000_000,
    description: '',
    repeatable: false,
    unlocked: false,
    attributes: {
      canUseSpaceStorage: true,
      spaceBuilding: true,
      preserveProgressOnTravel: true
    }
  },
  orbitalRing: {
    type: 'OrbitalRingProject',
    name: '',
    category: 'mega',
    cost: {
      colony: {
        metal: 1_000_000_000_000_000,
        components: 100_000_000_000_000,
        superalloys: 10_000_000_000_000
      }
    },
    duration: 1800000,
    description: '',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: { canUseSpaceStorage: true, showInResourcesRate: false }
  },
  spaceStorage : {
    type: 'SpaceStorageProject',
    name : '',
    category : 'mega',
    cost: {
      colony: {
        metal: 100_000_000_000,
      }
    },
    duration: 300000,
    description: '',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    kesslerDebrisSize: 'large',
    attributes: {
      spaceStorage: true,
      costPerShip: { colony: { metal : 100_000, energy: 2_500_000_000 } },
      transportPerShip: 1_000_000,
      canUseSpaceStorage: true,
      defaultExpansionRecipe: 'standard',
      expansionRecipes: {
        standard: {
          label: '',
          expansionSpeedMultiplier: 1,
          cost: {
            colony: {
              metal: 100_000_000_000
            }
          }
        },
        warp: {
          label: '',
          requiresProjectFlag: 'warpStorageUpgrade',
          expansionSpeedMultiplier: 10,
          cost: {
            colony: {
              metal: 10_000_000_000,
              components: 10_000_000_000,
              electronics: 10_000_000_000
            }
          }
        }
      }
    }
  },
  particleAccelerator: {
    type: 'ParticleAcceleratorProject',
    name: '',
    category: 'mega',
    cost: {
      colony: {
        superalloys: 50,
        superconductors: 50
      }
    },
    duration: 600000,
    description: '',
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
    name: '',
    category: 'mega',
    cost: {
      colony: {
        superalloys: 1_000_000_000,
        components: 10_000_000
      }
    },
    duration: 60000,
    description: '',
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
  spaceAntimatter: {
    type: 'SpaceAntimatterProject',
    name: '',
    category: 'mega',
    cost: {
      colony: {
        metal: 100_000,
        electronics: 1_000,
        superconductors: 500
      }
    },
    duration: 1,
    description: '',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      canUseSpaceStorage: true,
      preserveProgressOnTravel: true
    }
  },
  lifters: {
    type: 'LiftersProject',
    name: '',
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
    duration: 300_000,
    description: '',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    attributes: {
      canUseSpaceStorage: true,
      lifterUnitRate: 500_000_000,
      lifterEnergyPerUnit: 5_000_000_000_000_000,
      spaceBuilding: true,
      lifterStripRecipe: {
        label: '',
        complexity: 10,
        displayOrder: 2
      },
      lifterHarvestRecipes: {
        hydrogen: {
          label: '',
          storageKey: 'hydrogen',
          outputMultiplier: 1,
          complexity: 1,
          displayOrder: 1
        },
        methane: {
          label: '',
          storageKey: 'atmosphericMethane',
          outputMultiplier: 1,
          complexity: 100,
          displayOrder: 3,
          requiresProjectFlag: 'methaneAmmoniaLifting'
        },
        ammonia: {
          label: '',
          storageKey: 'atmosphericAmmonia',
          outputMultiplier: 1,
          complexity: 100,
          displayOrder: 4,
          requiresProjectFlag: 'methaneAmmoniaLifting'
        },
        starLifting: {
          label: '',
          storageKey: 'hydrogen',
          complexity: 100,
          displayOrder: 5,
          requiresProjectFlag: 'starLifting',
          outputs: {
            hydrogen: 1,
            oxygen: 0.01,
            graphite: 0.005,
            inertGas: 0.0015,
            silicon: 0.001,
            metal: 0.0008
          }
        }
      }
    }
  },
  bioworld: {
    type: 'BioworldProject',
    name: '',
    category: 'mega',
    cost: {},
    duration: 300000,
    description: '',
    repeatable: false,
    unlocked: false,
    attributes: {
      projectGroup: 'specializedWorlds',
      keepStartBarVisible: true
    }
  },
  foundryWorld: {
    type: 'FoundryWorldProject',
    name: '',
    category: 'mega',
    cost: {
      colony: {
        superalloys: 1e16,
        components: 1e15
      }
    },
    duration: 300000,
    description: '',
    repeatable: false,
    unlocked: false,
    attributes: {
      projectGroup: 'specializedWorlds',
      keepStartBarVisible: true
    }
  },
  manufacturingWorld: {
    type: 'ManufacturingWorldProject',
    name: '',
    category: 'mega',
    cost: {},
    duration: 300000,
    description: '',
    repeatable: false,
    unlocked: false,
    attributes: {
      projectGroup: 'specializedWorlds',
      keepStartBarVisible: true,
      spaceBuilding: true
    }
  },
  disposeResources : {
    type: 'SpaceDisposalProject',
    name : '',
    category : "resources",
    cost: {},
    duration: 100000,
    description: '',
    repeatable: true,
    maxRepeatCount: Infinity,
    unlocked: false,
    kesslerDebrisSize: 'large',
    attributes: {
      spaceExport : true,
      continuousAsBuilding: true,
      costPerShip : {colony : {metal : 100000, energy : 10_000_000_000}},
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


