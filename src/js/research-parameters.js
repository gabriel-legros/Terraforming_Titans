const researchParameters = {
    energy: [
      {
        id: 'solar_efficiency',
        name: '',
        description: '',
        cost: { research: 100 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'solarPanel',
            type: 'productionMultiplier',
            value: 1.25, // Increases solar panel production by 25%
          },
        ],
      },
      {
        id: 'geothermal_plant',
        name: '',
        description: '',
        cost: { research: 1000 },
        prerequisites: [],
        requiresGeothermal: true,
        artificialAllowed: false,
        effects: [
          {
            target: 'building',
            targetId: 'geothermalGenerator',
            type: 'enable',
          },
          {
            target: 'project',
            targetId : 'geo_satellite',
            type: 'enable'
          },
          {
            target: 'resource',
            resourceType: 'underground',
            targetId : 'geothermal',
            type: 'enable'
          }
        ],
      },
      {
        id: 'battery_efficiency',
        name: '',
        description: '',
        cost: { research: 5000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'battery',
            type: 'storageMultiplier',
            value: 2, // Increases solar panel production by 20%
          },
        ],
      },
      {
        id: 'fission_plant1',
        name: '',
        description: '',
        cost: { research: 10000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'nuclearPowerPlant',
            type: 'enable',
          },
        ],
      },
      {
        id: 'fission_plant1_upgrade',
        name: '',
        description: '',
        cost: { research: 50000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'nuclearPowerPlant',
            type: 'resourceConsumptionMultiplier',
            resourceCategory: 'colony',
            resourceTarget : 'water',
            value : 0
          },
          {
            target: 'building',
            targetId: 'nuclearPowerPlant',
            type: 'resourceProductionMultiplier',
            resourceCategory: 'atmospheric',
            resourceTarget : 'atmosphericWater',
            value : 0
          },
        ],
      },
      {
        id: 'hydrogen_battery',
        name: '',
        description: '',
        cost: { research: 100000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'hydrogenBattery',
            type: 'enable',
          },
        ],
      },
      {
        id: 'fission_plant1_upgrade2',
        name: '',
        description: '',
        cost: { research: 500000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'nuclearPowerPlant',
            type: 'productionMultiplier',
            value: 2
          },
          {
            target: 'building',
            targetId: 'nuclearPowerPlant',
            type: 'resourceConsumptionMultiplier',
            resourceCategory: 'colony',
            resourceTarget: 'water',
            value: 2
          }
        ],
      },
      {
        id: 'fusion',
        name: '',
        description: '',
        cost: { research: 1000000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'fusionPowerPlant',
            type: 'enable',
          },
          {
            target: 'resource',
            resourceType: 'colony',
            targetId : 'superconductors',
            type : 'enable'
          }
        ],
      },
      {
        id: 'improved_fusion_1',
        name: '',
        description: '',
        cost: { research: 1000000000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'fusionPowerPlant',
            type: 'productionMultiplier',
            value: 2
          }
        ],
      },
      {
        id: 'improved_fusion_2',
        name: '',
        description: '',
        cost: { research: 1000000000000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'fusionPowerPlant',
            type: 'productionMultiplier',
            value: 2
          },
          {
            target: 'building',
            targetId: 'superalloyFusionReactor',
            type: 'productionMultiplier',
            value: 2
          }
        ],
      },
      {
        id: 'hydrocarbon_generator',
        name: '',
        description: '',
        cost: { research: 10000 },
        prerequisites: [],
        disabled: true,
        requiresMethane: true,
        effects: [
          {
            target: 'building',
            targetId: 'hydrocarbonGenerator',
            type: 'enable',
          }
        ],
      },
      {
        id: 'dyson_swarm_receiver',
        name: '',
        description: '',
        cost: { research: 100_000 },
        prerequisites: [],
        disabled: true,
        effects: [
          { target: 'project', targetId: 'dysonSwarmReceiver', type: 'enable' },
          { target: 'building', targetId: 'dysonReceiver', type: 'enable' }
        ]
      },
      {
        id: 'superalloy_fusion_reactor',
        name: '',
        description: '',
        cost: { research: 500000000000 },
        prerequisites: [],
        disabled: true,
        effects: [
          { target: 'building', targetId: 'superalloyFusionReactor', type: 'enable' }
        ]
      },
      {
        id: 'next_generation_fusion',
        name: '',
        description: '',
        cost: { research: 100000000000000 },
        prerequisites: [],
        disabled: true,
        effects: [
          {
            target: 'building',
            targetId: 'superalloyFusionReactor',
            effectId: 'next_generation_fusion_research',
            type: 'productionMultiplier',
            value: 2
          }
        ]
      },
      {
        id: 'antimatter_containment',
        name: '',
        description: '',
        cost: { research: 100000000000 },
        prerequisites: [],
        disabled: true,
        effects: [
          { target: 'building', targetId: 'antimatterFarm', type: 'enable' },
          { target: 'building', targetId: 'antimatterBattery', type: 'enable' },
          {
            target: 'resource',
            resourceType: 'special',
            targetId: 'antimatter',
            type: 'enable'
          }
        ]
      },
      {
        id: 'laser_cannon',
        name: '',
        description: '',
        cost: { research: 5_000_000_000 },
        prerequisites: [],
        disabled: true,
        requiresKesslerHazard: true,
        effects: [
          { target: 'building', targetId: 'laserCannon', type: 'enable' }
        ]
      },
      {
        id: 'ai_reactor_overclocking',
        name: '',
        description: '',
        cost: { research: 5_000_000_000_000 },
        prerequisites: [],
        disabled: true,
        repeatable: true,
        repeatableCostMultiplier: 10,
        effects: [
          {
            target: 'building',
            targetId: 'superalloyFusionReactor',
            type: 'productionMultiplier',
            value: 1.25,
            repeatableAddend: 0.25,
            effectId: 'ai_reactor_overclocking_output'
          }
        ]
      },
    ],
    industry: [
      {
        id: 'ore_processing',
        name: '',
        description: '',
        cost: { research: 200 },
        artificialAllowed: false,
        coreHeatAllowed: false,
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'oreMine',
            effectId : 'ore_processing_research',
            type: 'productionMultiplier',
            value: 2, // Increases ore production by 30%
          },
        ],
      },
      {
        id: 'ore_scanning',
        name: '',
        description: '',
        cost: { research: 500 },
        artificialAllowed: false,
        coreHeatAllowed: false,
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'satellite',
            type: 'enable',
          },
        ],
      },
      {
        id: 'components_factory',
        name: '',
        description: '',
        cost: { research: 1000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'componentFactory',
            type: 'enable',
          },
        ],
      },
      {
        id: 'waste_processing',
        name: '',
        description: '',
        cost: { research: 2000 },
        prerequisites: [],
        disabled: true,
        effects: [
          {
            target: 'building',
            targetId: 'garbageSorter',
            type: 'enable',
          },
          {
            target: 'building',
            targetId: 'trashIncinerator',
            type: 'enable',
          },
          {
            target: 'building',
            targetId: 'junkRecycler',
            type: 'enable',
          },
          {
            target: 'building',
            targetId: 'scrapRecycler',
            type: 'enable',
          },
          {
            target: 'building',
            targetId: 'radioactiveRecycler',
            type: 'enable',
          },
          {
            target: 'resource',
            resourceType: 'surface',
            targetId: 'scrapMetal',
            type: 'enable',
          },
          {
            target: 'resource',
            resourceType: 'surface',
            targetId: 'junk',
            type: 'enable',
          },
          {
            target: 'resource',
            resourceType: 'surface',
            targetId: 'radioactiveWaste',
            type: 'enable',
          },
        ],
      },
      {
        id: 'waste_workforce_automation',
        name: '',
        description: '',
        cost: { research: 200000 },
        prerequisites: ['waste_processing'],
        disabled: true,
        effects: [
          {
            target: 'building',
            targetId: 'garbageSorter',
            type: 'workerMultiplier',
            value: 0.8,
          },
          {
            target: 'building',
            targetId: 'trashIncinerator',
            type: 'workerMultiplier',
            value: 0.8,
          },
          {
            target: 'building',
            targetId: 'junkRecycler',
            type: 'workerMultiplier',
            value: 0.8,
          },
          {
            target: 'building',
            targetId: 'scrapRecycler',
            type: 'workerMultiplier',
            value: 0.8,
          },
          {
            target: 'building',
            targetId: 'radioactiveRecycler',
            type: 'workerMultiplier',
            value: 0.8,
          },
        ],
      },
      {
        id: 'robotics_1',
        name: '',
        description: '',
        cost: { research: 5000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'hydroponicFarm',
            type: 'workerMultiplier',
            value: 0.8
          },
        ],
      },
      {
        id: 'electronics_factory',
        name: '',
        description: '',
        cost: { research: 10000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'electronicsFactory',
            type: 'enable',
          },
        ],
      },
      {
        id: 'robotics_2',
        name: '',
        description: '',
        cost: { research: 50000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'componentFactory',
            type: 'workerMultiplier',
            value: 0.8
          },
          {
            target: 'building',
            targetId: 'electronicsFactory',
            type: 'workerMultiplier',
            value: 0.8
          },
        ],
      },
      {
        id: 'deep_mine',
        name: '',
        description: '',
        cost: { research: 100000 },
        prerequisites: [],
        artificialAllowed: false,
        coreHeatAllowed: false,
        effects: [
          {
            target: 'project',
            targetId: 'deeperMining',
            type: 'enable',
            value: true,
          },
        ],
      },
      {
        id: 'android_factory',
        name: '',
        description: '',
        cost: { research: 500000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'androidFactory',
            type: 'enable'
          },
          {
            target: 'building',
            targetId: 'androidHousing',
        type: 'enable'
      },
      {
        target: 'resource',
        resourceType : 'colony',
        targetId: 'androids',
        type: 'enable'
      },
      ],
      },
      {
        id: 'android_assisted_mining',
        name: '',
        description: '',
        cost: { research: 2000000 },
        prerequisites: ['deep_mine','android_factory'],
        artificialAllowed: false,
        coreHeatAllowed: false,
        effects: [
          {
            target: 'project',
            targetId: 'deeperMining',
            type: 'booleanFlag',
            flagId: 'androidAssist',
            value: true
          }
        ],
      },
      {
        id: 'underground_land_expansion',
        name: '',
        description: '',
        cost: { research: 200_000 },
        prerequisites: [],
        artificialAllowed: false,
        coreHeatAllowed: false,
        disabled: true,
        effects: [
          {
            target: 'project',
            targetId: 'undergroundExpansion',
            type: 'enable',
            value: true,
          },
          {
            target: 'project',
            targetId: 'undergroundExpansion',
            type: 'booleanFlag',
            flagId: 'androidAssist',
            value: true
          }
        ],
      },
      {
        id: 'superconductor_factory',
        name: '',
        description: '',
        cost: { research: 1000000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'superconductorFactory',
            type: 'enable'
          },
          {
            target: 'resource',
            resourceType: 'colony',
            targetId: 'superconductors',
            type: 'enable'
          },
        ],
      },
      {
        id: 'graphene_factory',
        name: '',
        description: '',
        cost: { research: 10_000_000 },
        prerequisites: [],
        disabled: true,
        effects: [
          {
            target: 'building',
            targetId: 'grapheneFactory',
            type: 'enable'
          }
        ],
      },
      //{
      //  id: 'recycling',
      //  name: 'Recycling',
      //  description: 'Unlocks the recycling facility, which is capable of recycling all sorts of material lost to maintenance.',
      //  cost: {research: 5000000},
      //  prerequisites: [],
      //  effects: [
      //    {
      //      target: 'building',
      //      targetId: 'recyclingFacility',
      //      type: 'enable',
      //    },
      //    {
      //      target: 'resource',
      //      resourceType: 'surface',
      //      targetId: 'scrapMetal',
      //      type: 'enable'
      //    }
      //  ]
      //}, 
      {
        id: 'advanced_alloy',
        name: '',
        description: '',
        cost: { research: 10000000 },
        prerequisites: [],
        artificialAllowed: false,
        effects: [
          {
            target: 'building',
            targetId: 'oreMine',
            effectId : 'advanced_alloy_research',
            type: 'productionMultiplier',
            value: 2
          },
          {
            target: 'building',
            targetId: 'foundry',
            effectId : 'advanced_alloy_foundry_research',
            type: 'resourceProductionMultiplier',
            resourceCategory: 'colony',
            resourceTarget: 'metal',
            value: 2
          },
        ],
      },
      {
        id: 'shipyard',
        name: '',
        description: '',
        cost: { research: 50000000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'shipyard',
            type: 'enable'
          },
          {
            target: 'resource',
            resourceType: 'special',
            targetId: 'spaceships',
            type: 'enable'
          },
          {target : 'project',
            targetId : 'oreSpaceMining',
            type: 'enable'
          },
          {target : 'project',
            targetId : 'siliconSpaceMining',
            type: 'enable',
            requiredResearchFlags: ['siliconMiningUnlocked']
          },
        {
          target : 'project',
          targetId : 'disposeResources',
          type: 'enable'
        }
      ],
    },
    {
      id: 'efficient_shipyards',
      name: '',
      description: '',
      cost: { research: 100000000000 },
      prerequisites: [],
      effects: [
        {
          target: 'building',
          targetId: 'shipyard',
          type: 'productionMultiplier',
          value: 2
        },
        {
          target: 'building',
          targetId: 'shipyard',
          type: 'consumptionMultiplier',
          value: 2
        }
      ],
    },
    {
      id: 'self_replicating_ships',
      name: '',
      description: '',
      cost: { research: 10000000000 },
      prerequisites: [],
      disabled: true,
      effects: [
        {
          target: 'global',
          type: 'booleanFlag',
          flagId: 'selfReplicatingShips',
          value: true
        }
      ]
    },
    {
      id: 'robotics_3',
      name: '',
      description: '',
        cost: { research: 100000000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'superconductorFactory',
            type: 'workerMultiplier',
            value: 0.8
          },
          {
            target: 'building',
            targetId: 'androidFactory',
            type: 'workerMultiplier',
            value: 0.8
          },
        ],
      },  
      {
        id: 'massive_scale_glass_smelting',
        name: '',
        description: '',
        cost: { research: 500_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'glassSmelter',
            type: 'productionMultiplier',
            value: 2
          },
          {
            target: 'building',
            targetId: 'glassSmelter',
            type: 'consumptionMultiplier',
            value: 2
          }
        ],
      },
      {
        id: 'space_elevator',
        name: '',
        description: '',
        cost: { research: 1000000000 },
        prerequisites: [],
        effects: [
          {
            target : 'project',
            targetId : 'spaceElevator',
            type: 'enable'
          }
        ],
      }, 
      {
        id: 'robotics_4',
        name: '',
        description: '',
        cost: { research: 1000000000000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'superconductorFactory',
            type: 'workerMultiplier',
            value: 0.75
          },
          {
            target: 'building',
            targetId: 'androidFactory',
            type: 'workerMultiplier',
            value: 0.75
          },
          {
            target: 'building',
            targetId: 'componentFactory',
            type: 'workerMultiplier',
            value: 0.75
          },
          {
            target: 'building',
            targetId: 'electronicsFactory',
            type: 'workerMultiplier',
            value: 0.75
          },
          {
            target: 'building',
            targetId: 'ghgFactory',
            type: 'workerMultiplier',
            value: 0.75
          },
          {
            target: 'building',
            targetId: 'oxygenFactory',
            type: 'workerMultiplier',
            value: 0.75
          },
          {
            target: 'building',
            targetId: 'grapheneFactory',
            type: 'workerMultiplier',
            value: 0.75
          },
            {
              target: 'building',
              targetId: 'biodome',
              type: 'workerMultiplier',
              value: 0.75
            }
        ],
      },
      {
        id: 'superalloy_foundry',
        name: '',
        description: '',
        cost: { research: 500000000000 },
        prerequisites: [],
        disabled: true,
        effects: [
          { target: 'building', targetId: 'superalloyFoundry', type: 'enable' }
        ]
      },
      {
        id: 'ai_industrial_coordination',
        name: '',
        description: '',
        cost: { research: 5_000_000_000_000 },
        prerequisites: [],
        disabled: true,
        repeatable: true,
        repeatableCostMultiplier: 10,
        effects: [
          {
            target: 'global',
            type: 'globalWorkerReduction',
            value: 0.1,
            repeatableAddend: 0.1,
            effectId: 'ai_industrial_coordination_workers'
          }
        ]
      },
    ],
    colonization: [
      {
        id: 'enhanced_colonist_import_1',
        name: '',
        description: '',
        cost: { research: 100 },  // Adjust the cost to make it suitable for the impact of the research
        prerequisites: [],  // Requires the initial colonist import project to be available first
        effects: [
          {
            target: 'project',
            targetId: 'import_colonists_1',
            type: 'projectDurationMultiplier',
            value: 0.5  // Halve the duration of the colonist import project
          },
        ],
      },
      {
        id: 'launch_pads',
        name: '',
        description: '',
        cost: { research: 500 },
        prerequisites: [],
        effects: [
          {
            type: 'booleanFlag',
            target: 'projectManager',
            flagId: 'automateSpecialProjects',
            value: true
          },
        ],
      },
      {
        id: 't2_colony',
        name: '',
        description: '',
        cost: { research: 1000 },
        prerequisites: [],
        effects: [
          {
            target: 'colony',
            targetId: 't2_colony',
            type: 'enable',
          },
          {
            target: 'colony',
            targetId: 'aerostat_colony',
            type: 'addComfort',
            value: 0.1,
          },
        ],
      },
      {
        id: 'cloning_facilities',
        name: '',
        description: '',
        cost: { research: 1000 },
        prerequisites: [],
        disabled: true,
        effects: [
          {
            target: 'building',
            targetId: 'cloningFacility',
            type: 'enable',
          },
        ],
      },
      {
        id: 'enhanced_colonist_import_2',
        name: '',
        description: '',
        cost: { research: 5000 },  // Adjust the cost to make it suitable for the impact of the research
        prerequisites: [],  // Requires the initial colonist import project to be available first
        effects: [
          {
            target: 'project',
            targetId: 'import_colonists_1',
            type: 'increaseResourceGain',
            resourceCategory: 'colony',
            resourceId: 'colonists',
            value: 5  // Increase the number of colonists imported by 5
          },
        ],
      },
      {
        id: 't3_colony',
        name: '',
        description: '',
        cost: { research: 10000 },
        prerequisites: [],
        effects: [
          {
            target: 'colony',
            targetId: 't3_colony',
            type: 'enable',
          },
          {
            target: 'colony',
            targetId: 'aerostat_colony',
            type: 'addResourceConsumption',
            resourceCategory: 'colony',
            resourceId: 'electronics',
            amount: 0.01,
          },
          {
            target: 'colony',
            targetId: 'aerostat_colony',
            type: 'addComfort',
            value: 0.1,
          },
        ],
      },
      {
        id: 'enhanced_colonist_import_3',
        name: '',
        description: '',
        cost: { research: 50000 },  // Adjust the cost to make it suitable for the impact of the research
        prerequisites: [],  // Requires the initial colonist import project to be available first
        effects: [
          {
            target: 'project',
            targetId: 'import_colonists_1',
            type: 'increaseResourceGain',
            resourceCategory: 'colony',
            resourceId: 'colonists',
            value: 30  // Increase the number of colonists imported by 30
          },
        ],
      },
      {
        id: 'colony_sliders',
        name: '',
        description: '',
        cost: { research: 50000 },
        prerequisites: [],
        effects: [
          {
            target: 'tabContent',
            targetId: 'colony-sliders-container',
            type: 'enableContent'
          }
        ],
      },
      {
        id: 'construction_office',
        name: '',
        description: '',
        cost: { research: 100000 },
        prerequisites: [],
        effects: [
          {
            type: 'booleanFlag',
            target: 'global',
            flagId: 'automateConstruction',
            value: true
          },
          {
            target: 'tabContent',
            targetId: 'construction-office-container',
            type: 'enableContent'
          }
        ],
      },
      {
        id: 't4_colony',
        name: '',
        description: '',
        cost: { research: 500000 },
        prerequisites: [],
        effects: [
          {
            target: 'colony',
            targetId: 't4_colony',
            type: 'enable',
          },
          {
            target: 'colony',
            targetId: 'aerostat_colony',
            type: 'addResourceConsumption',
            resourceCategory: 'colony',
            resourceId: 'androids',
            amount: 0.0001,
          },
          {
            target: 'colony',
            targetId: 'aerostat_colony',
            type: 'addComfort',
            value: 0.1,
          },
        ],
      },
      {
        id: 'trading',
        name: '',
        description: '',
        cost: { research: 50000000 },
        prerequisites: [],
        disableFlag: 'galacticMarket',
        effects: [
            {
              target: 'resource',
              resourceType: 'special',
              targetId: 'spaceships',
              type: 'enable'
            },
            {
              target : 'project',
              targetId : 'exportResources',
              type: 'enable'
            },
            {
              target : 'project',
              targetId : 'cargo_rocket',
              type: 'booleanFlag',
              flagId : 'continuousTrading',
              value : true
            }
        ],
      }, 
      {
        id: 't5_colony',
        name: '',
        description: '',
        cost: { research: 5000000 },
        prerequisites: [],
        effects: [
          {
            target: 'colony',
            targetId: 't5_colony',
            type: 'enable',
          },
          {
            target: 'colony',
            targetId: 'aerostat_colony',
            type: 'addComfort',
            value: 0.1,
          },
        ],
      },
      {
        id: 't6_colony',
        name: '',
        description: '',
        cost: { research: 100000000 },
        prerequisites: [],
        effects: [
          {
            target: 'colony',
            targetId: 't6_colony',
            type: 'enable',
          },
          {
            target: 'colony',
            targetId: 'aerostat_colony',
            type: 'addComfort',
            value: 0.1,
          },
        ],
      },
      {
        id: 't7_colony',
        name: '',
        description: '',
        cost: { research: 500000000000 },
        prerequisites: [],
        disableFlag: 'ecumenopolisDisabled',
        disabled: true,
        effects: [
          { target: 'colony', targetId: 't7_colony', type: 'enable' },
          { target: 'resource', resourceType: 'colony', targetId: 'superalloys', type: 'enable' }
        ],
      },
      {
        id: 'terraforming_bureau',
        name: '',
        description: '',
        cost: { research: 10000000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'dustFactory',
            type: 'booleanFlag',
            flagId: 'terraformingBureauFeature',
            value: true
          },
          {
            target: 'building',
            targetId: 'ghgFactory',
            type: 'booleanFlag',
            flagId: 'terraformingBureauFeature',
            value: true
          },
          {
            target: 'building',
            targetId: 'oxygenFactory',
            type: 'booleanFlag',
            flagId: 'terraformingBureauFeature',
            value: true
          },
          {
            target: 'building',
            targetId: 'boschReactor',
            type: 'booleanFlag',
            flagId: 'terraformingBureauFeature',
            value: true
          }
        ],
      },
      {
        id: 'space_mirror_oversight',
        name: '',
        description: '',
        cost: { research: 1000000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'spaceMirrorFacility',
            type: 'booleanFlag',
            flagId: 'spaceMirrorFacilityOversight',
            value: true
          }
        ],
      },
      {
        id: 'atmospheric_monitoring',
        name: '',
        description: '',
        cost: { research: 1000000000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'carbonSpaceMining',
            type: 'booleanFlag',
            flagId: 'atmosphericMonitoring',
            value: true
          },
          {
            target: 'project',
            targetId: 'waterSpaceMining',
            type: 'booleanFlag',
            flagId: 'atmosphericMonitoring',
            value: true
          },
          {
            target: 'project',
            targetId: 'nitrogenSpaceMining',
            type: 'booleanFlag',
            flagId: 'atmosphericMonitoring',
            value: true
          },
          {
            target: 'project',
            targetId: 'hydrogenSpaceMining',
            type: 'booleanFlag',
            flagId: 'atmosphericMonitoring',
            value: true
          },
          {
            target: 'project',
            targetId: 'disposeResources',
            type: 'booleanFlag',
            flagId: 'atmosphericMonitoring',
            value: true
          }
        ],
      },
      {
        id: 'ai_ecumenopolis_expansion',
        name: '',
        description: '',
        cost: { research: 5_000_000_000_000 },
        prerequisites: [],
        disabled: true,
        repeatable: true,
        repeatableCostMultiplier: 10,
        effects: [
          {
            target: 'colony',
            targetId: 't7_colony',
            type: 'storageMultiplier',
            value: 1.1,
            repeatableAddend: 0.1,
            effectId: 'ai_ecumenopolis_expansion_storage'
          },
          {
            target: 'colony',
            targetId: 't7_colony',
            type: 'productionMultiplier',
            value: 1.1,
            repeatableAddend: 0.1,
            effectId: 'ai_ecumenopolis_expansion_production'
          },
          {
            target: 'colony',
            targetId: 't7_colony',
            type: 'consumptionMultiplier',
            value: 1.1,
            repeatableAddend: 0.1,
            effectId: 'ai_ecumenopolis_expansion_consumption'
          }
        ],
      },
    ],
    terraforming: [
      {
        id: 'dust_factory',
        name: '',
        description: '',
        cost: { research: 100 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'dustFactory',
            type: 'enable'
          },
          {
            target: 'resource',
            resourceType: 'special',
            targetId : 'albedoUpgrades',
            type: 'enable'
          },
          {
            target: 'resource',
            resourceType: 'special',
            targetId : 'whiteDust',
            type: 'enable'
          }
        ],
      },
      {
        id: 'hydroponic_farm',
        name: '',
        description: '',
        cost: { research: 500 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'hydroponicFarm',
            type: 'enable'
          },
        ],
      },
      {
        id: 'surface_food_production',
        name: '',
        description: '',
        cost: { research: 1_000_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'lifeManager',
            type: 'booleanFlag',
            flagId: 'surfaceFoodProduction',
            value: true,
          },
        ],
      },
      {
        id: 'engineered_nitrogen_fixation',
        name: '',
        description: '',
        cost: { research: 200_000_000 },
        prerequisites: ['life'],
        effects: [
          {
            target: 'lifeManager',
            type: 'booleanFlag',
            flagId: 'engineeredNitrogenFixation',
            value: true,
          },
        ],
      },
      {
        id: 'terraforming_sensor',
        name: '',
        description: '',
        cost: { research: 1000 },
        prerequisites: [],
        effects: [
          {
            target: 'tab',
            targetId: 'terraforming-tab',
            type: 'enable'
          },
          {
            target: 'tab',
            targetId: 'terraforming',
            type: 'activateTab',
            onLoad : false
          },
          {
            target: 'terraforming',
            type: 'booleanFlag',
            flagId: 'summaryUnlocked',
            value: true
          },
          {
            target: 'terraforming',
            type: 'booleanFlag',
            flagId: 'milestonesUnlocked',
            value: true
          },
          {
            target: 'resource',
            resourceType: 'surface',
            targetId : 'liquidWater',
            type: 'enable'
          },
          {
            target: 'resource',
            resourceType: 'surface',
            targetId : 'dryIce',
            type: 'enable'
          },
          {
            target: 'resource',
            resourceType: 'atmospheric',
            targetId : 'carbonDioxide',
            type: 'enable'
          },
          {
            target: 'resource',
            resourceType: 'atmospheric',
            targetId : 'inertGas',
            type: 'enable'
          },
          {
            target: 'resource',
            resourceType: 'atmospheric',
            targetId : 'oxygen',
            type: 'enable'
          },
          {
            target: 'resource',
            resourceType: 'atmospheric',
            targetId : 'atmosphericWater',
            type: 'enable'
          },
          {
            target: 'resource',
            resourceType: 'atmospheric',
            targetId : 'atmosphericMethane',
            type: 'enable'
          },          
          {
            target: 'resource',
            resourceType: 'atmospheric',
            targetId : 'sulfuricAcid',
            type: 'enable'
          },          
          {
            target: 'resource',
            resourceType: 'atmospheric',
            targetId : 'hydrogen',
            type: 'enable'
          }
        ],
      },
      {
        id: 'hydroponics_efficiency',
        name: '',
        description: '',
        cost: { research: 5000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'hydroponicFarm',
            type: 'productionMultiplier',
            value: 2,
          },
        ],
      },
      {
        id: 'space_mirror',
        name: '',
        description: '',
        cost: { research: 10000 },
        prerequisites: [],
        ringworldAllowed: false,
        effects: [
          {
            target: 'project',
            targetId: 'spaceMirrorFacility',
            type: 'enable'
          }
        ],
      },
      {
        id: 'dust_efficiency',
        name: '',
        description: '',
        cost: { research: 50000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'dustFactory',
            type: 'productionMultiplier',
            value: 4,
          },
        ],
      },
      {
        id: 'water_electrolysis',
        name: '',
        description: '',
        cost: { research: 100000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'oxygenFactory',
            type: 'enable'
          },
        ],
      },
      {
        id: 'chemical_reactor',
        name: '',
        description: '',
        cost: { research: 500_000 },
        prerequisites: [],
        disabled: true,
        effects: [
          {
            target: 'building',
            targetId: 'boschReactor',
            type: 'enable'
          },
        ],
      },
      {
        id: 'mass_driver',
        name: '',
        description: '',
        cost: { research: 1_000_000_000 },
        prerequisites: [],
        disabled: true,
        effects: [
          {
            target: 'building',
            targetId: 'massDriver',
            type: 'enable'
          },
          {
            target: 'project',
            targetId: 'disposeResources',
            type: 'booleanFlag',
            flagId: 'massDriverEnabled',
            value: true,
          }
        ],
      },
      {
        id: 'ghg_factory',
        name: '',
        description: '',
        cost: { research: 500000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'ghgFactory',
            type: 'enable'
          },
          {
            target: 'resource',
            resourceType: 'atmospheric',
            targetId : 'greenhouseGas',
            type: 'enable'
          },
          {
            target: 'resource',
            resourceType: 'atmospheric',
            targetId : 'calciteAerosol',
            type: 'enable'
          }
        ],
      },
      {
        id: 'ghg_efficiency',
        name: '',
        description: '',
        cost: { research: 10000000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'ghgFactory',
            type: 'productionMultiplier',
            value: 2,
          },
        ],
      },
      {
        id: 'ghg_efficiency2',
        name: '',
        description: '',
        cost: { research: 100000000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'ghgFactory',
            type: 'productionMultiplier',
            value: 2,
          },
        ],
      },
      {
        id: 'life',
        name: '',
        description: '',
        cost: { research: 1_000_000 },
        prerequisites: [],
        effects: [
            {
              target: 'building',
              targetId: 'biodome',
              type: 'enable'
            },
          {
            target: 'resource',
            resourceType: 'surface',
            targetId : 'biomass',
            type: 'enable'
          },
          {
            target: 'lifeDesigner',
            type: 'enable'
          },
          {
            target: 'terraforming',
            type: 'booleanFlag',
            flagId: 'lifeDesignerUnlocked',
            value: true
          }
        ],
      },
      {
        id: 'carbonImport',
        name: '',
        description: '',
        cost: { research: 500000000 },
        prerequisites: [],
        effects: [
          {target : 'project',
            targetId : 'carbonSpaceMining',
            type: 'enable'
          }
        ],
      },   
      {
        id: 'waterImport',
        name: '',
        description: '',
        cost: { research: 50_000_000 },
        prerequisites: [],
        effects: [
          {target : 'project',
            targetId : 'waterSpaceMining',
            type: 'enable'
          }
        ],
      },
      {
        id: 'nitrogenImport',
        name: '',
        description: '',
        cost: { research: 10000000000 },
        prerequisites: [],
        effects: [
          {target : 'project',
            targetId : 'nitrogenSpaceMining',
            type: 'enable'
          }
        ],
      },
      {
        id: 'hydrogenImport',
        name: '',
        description: '',
        cost: { research: 50_000_000 },
        prerequisites: [],
        disabled: true,
        effects: [
          {target : 'project',
            targetId : 'hydrogenSpaceMining',
            type: 'enable'
          }
        ],
      },
      {
        id: 'magneticShield',
        name: '',
        description: '',
        cost: { research: 1000000000000 },
        prerequisites: [],
        requiresNoNaturalMagnetosphere: true,
        effects: [
          {target : 'project',
            targetId : 'magneticShield',
            type: 'enable'
          }
        ],
      },
    ],
    advanced: [
      {
        id: 'modular_nuclear_reactor',
        name: '',
        description: '',
        cost: { advancedResearch: 1000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            targetId: 'fission_plant1',
            type: 'completeResearch'
          },
          {
            target: 'building',
            targetId: 'nuclearPowerPlant',
            type: 'enable'
          },
          {
            target: 'building',
            targetId: 'nuclearPowerPlant',
            type: 'productionMultiplier',
            value: 0.01
          },
          {
            target: 'building',
            targetId: 'nuclearPowerPlant',
            type: 'consumptionMultiplier',
            value: 0.01
          },
          {
            target: 'building',
            targetId: 'nuclearPowerPlant',
            type: 'resourceCostMultiplier',
            resourceCategory: 'colony',
            resourceId: 'metal',
            value: 0.01
          },
          {
            target: 'building',
            targetId: 'nuclearPowerPlant',
            type: 'resourceCostMultiplier',
            resourceCategory: 'colony',
            resourceId: 'components',
            value: 0.01
          },
          {
            target: 'building',
            targetId: 'nuclearPowerPlant',
            type: 'resourceCostMultiplier',
            resourceCategory: 'colony',
            resourceId: 'electronics',
            value: 0.01
          }
        ]
      },
      {
        id: 'hyperion_lantern',
        name: '',
        description: '',
        cost: { advancedResearch: 10000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'hyperionLantern',
            type: 'enable'
          }
        ]
      },
      {
        id: 'hydrocarbon_research',
        name: '',
        description: '',
        cost: { advancedResearch: 1000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            type: 'enableResearch',
            targetId: 'hydrocarbon_generator'
          }
        ]
      },
      {
        id: 'infrared_vision',
        name: '',
        description: '',
        cost: { advancedResearch: 20000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'iceHarvester',
            type: 'booleanFlag',
            flagId: 'dayNightActivity',
            value: false
          }
        ]
      },
      {
        id: 'dyson_swarm_concept',
        name: '',
        description: '',
        cost: { advancedResearch: 25000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            type: 'enableResearch',
            targetId: 'dyson_swarm_receiver'
          }
        ]
      },
      {
        id: 'space_storage',
        name: '',
        description: '',
        cost: { advancedResearch: 30000 },
        prerequisites: [],
        effects: [
          { target: 'project', targetId: 'spaceStorage', type: 'enable' },
          {
            target: 'resource',
            resourceType: 'colony',
            targetId : 'superconductors',
            type : 'enable'
          } ],
       },
      {
        id: 'cloning_concept',
        name: '',
        description: '',
        cost: { advancedResearch: 40000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            type: 'enableResearch',
            targetId: 'cloning_facilities'
          }
        ]
      },
      {
        id: 'underground_habitats',
        name: '',
        description: '',
        cost: { advancedResearch: 50000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            type: 'enableResearch',
            targetId: 'underground_land_expansion'
          }
        ]
      },
      {
        id: 'hive_mind_androids',
        name: '',
        description: '',
        cost: { advancedResearch: 60000 },
        prerequisites: [],
        effects: [
          {
            target: 'global',
            type: 'booleanFlag',
            flagId: 'hiveMindAndroids',
            value: true
          }
        ]
      },
      {
        id: 'space_mirror_focusing',
        name: '',
        description: '',
        cost: { advancedResearch: 80000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'spaceMirrorFacility',
            type: 'booleanFlag',
            flagId: 'spaceMirrorFocusing',
            value: true
          }
        ]
      },
      {
        id: 'super_alloys',
        name: '',
        description: '',
        cost: { advancedResearch: 100000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            type: 'booleanFlag',
            flagId: 'superalloyResearchUnlocked',
            value: true
          },
          { target: 'researchManager', type: 'enableResearch', targetId: 'superalloy_fusion_reactor' },
          { target: 'researchManager', type: 'enableResearch', targetId: 'next_generation_fusion' },
          { target: 'researchManager', type: 'enableResearch', targetId: 'superalloy_foundry' },
          { target: 'researchManager', type: 'enableResearch', targetId: 't7_colony' },
          { target: 'resource', resourceType: 'colony', targetId: 'superalloys', type: 'enable' }
        ]
      },
      {
        id: 'nanotechnology_stage_1',
        name: '',
        description: '',
        cost: { advancedResearch: 125000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            type: 'booleanFlag',
            flagId: 'nanotechnologyStage1',
            value: true
          },
          {
            target: 'nanotechManager',
            type: 'enable'
          }
        ]
      },
      {
        id: 'nanotechnology_stage_2',
        name: '',
        description: '',
        cost: { advancedResearch: 625000 },
        prerequisites: ['nanotechnology_stage_1'],
        effects: [
          {
            target: 'nanotechManager',
            type: 'booleanFlag',
            flagId: 'stage2_enabled',
            value: true
          }
        ]
      },
      {
        id: 'nanotechnology_stage_3',
        name: '',
        description: '',
        cost: { advancedResearch: 25_000_000 },
        prerequisites: ['nanotechnology_stage_2'],
        effects: [
          {
            target: 'nanotechManager',
            type: 'booleanFlag',
            flagId: 'stage3_enabled',
            value: true
          }
        ]
      },
      {
        id: 'orbital_rings',
        name: '',
        description: '',
        cost: { advancedResearch: 150000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'orbitalRing',
            type: 'enable'
          }
        ]
      },
      {
        id: 'mega_particle_accelerator',
        name: '',
        description: '',
        cost: { advancedResearch: 250000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'particleAccelerator',
            type: 'enable'
          }
        ]
      },
      {
        id: 'mega_heat_sink',
        name: '',
        description: '',
        cost: { advancedResearch: 400000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'megaHeatSink',
            type: 'enable'
          }
        ]
      },
      {
        id: 'lifting',
        name: '',
        description: '',
        cost: { advancedResearch: 750000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'lifters',
            type: 'enable'
          }
        ]
      },
      {
        id: 'bioworkforce',
        name: '',
        description: '',
        cost: { advancedResearch: 500000 },
        prerequisites: [],
        effects: [
          {
            target: 'lifeManager',
            type: 'booleanFlag',
            flagId: 'bioworkforce',
            value: true
          },
          {
            target: 'project',
            targetId: 'bioworld',
            type: 'enable'
          }
        ]
      },
      {
        id: 'biocortex_integration',
        name: '',
        description: '',
        cost: { advancedResearch: 200000000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'bioworld',
            type: 'booleanFlag',
            flagId: 'biocortexIntegration',
            value: true
          }
        ]
      },
      {
        id: 'foundry_worlds',
        name: '',
        description: '',
        cost: { advancedResearch: 50000000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'foundryWorld',
            type: 'enable'
          }
        ]
      },
      {
        id: 'manufacturing_worlds',
        name: '',
        description: '',
        cost: { advancedResearch: 100_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'manufacturingWorld',
            type: 'enable'
          }
        ]
      },
      {
        id: 'next_gen_bioengineering',
        name: '',
        description: '',
        cost: { advancedResearch: 1500000 },
        prerequisites: [],
        effects: [
          {
            target: 'lifeManager',
            type: 'booleanFlag',
            flagId: 'nextGenBioEngineering',
            value: true
          }
        ]
      },
      {
        id: 'repeatable_ai_research',
        name: '',
        description: '',
        cost: { advancedResearch: 2_000_000 },
        prerequisites: [],
        effects: [
          { target: 'researchManager', type: 'enableResearch', targetId: 'ai_reactor_overclocking' },
          { target: 'researchManager', type: 'enableResearch', targetId: 'ai_industrial_coordination' },
          { target: 'researchManager', type: 'enableResearch', targetId: 'ai_ecumenopolis_expansion' }
        ]
      },
      {
        id: 'hazardous_biomass_incineration',
        name: '',
        description: '',
        cost: { advancedResearch: 2_500_000 },
        prerequisites: [],
        disabled: true,
        effects: [
          {
            target: 'building',
            type: 'booleanFlag',
            targetId: 'trashIncinerator',
            flagId: 'hazardousBiomassIncineration',
            value: true
          }
        ]
      },
      {
        id: 'galactic_market',
        name: '',
        description: '',
        cost: { advancedResearch: 300000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'galactic_market',
            type: 'enable'
          },
          {
            target: 'project',
            targetId: 'cargo_rocket',
            type: 'permanentProjectDisable',
            value: true
          },
          {
            target: 'project',
            targetId: 'exportResources',
            type: 'permanentProjectDisable',
            value: true
          },
          {
            target: 'researchManager',
            type: 'booleanFlag',
            flagId: 'galacticMarket',
            value: true
          }
        ]
      },
      {
        id: 'mechanical_assistance',
        name: '',
        description: '',
        cost: { advancedResearch: 175000 },
        prerequisites: [],
        effects: [
          {
            target: 'colonySliders',
            type: 'booleanFlag',
            flagId: 'mechanicalAssistance',
            value: true
          }
        ]
      },
      {
        id: 'warpnet',
        name: '',
        description: '',
        cost: { advancedResearch: 875000 },
        prerequisites: [],
        effects: [
          {
            target: 'colonySliders',
            type: 'booleanFlag',
            flagId: 'warpnet',
            value: true
          }
        ]
      },
      {
        id: 'ship_smelting',
        name: '',
        description: '',
        cost: { advancedResearch: 200000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'oreSpaceMining',
            type: 'shipCapacityMultiplier',
            value: 2
          },
          {
            target: 'project',
            targetId: 'siliconSpaceMining',
            type: 'shipCapacityMultiplier',
            value: 2
          },
          {
            target: 'project',
            targetId: 'waterSpaceMining',
            type: 'booleanFlag',
            flagId: 'waterImportTargeting',
            value: true
          }
        ]
      },
      {
        id: 'companion_satellite',
        name: '',
        description: '',
        cost: { advancedResearch: 225000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            targetId: 'ore_scanning',
            type: 'completeResearch'
          }
        ]
      },
      {
        id: 'oneill_cylinders',
        name: '',
        description: '',
        cost: { advancedResearch: 1000000 },
        prerequisites: [],
        effects: [
          {
            target: 'spaceManager',
            type: 'booleanFlag',
            flagId: 'oneillCylinders',
            value: true
          },
          {
            target: 'tab',
            type: 'spaceTabAlert',
            value: true,
            onLoad: false
          }
        ]
      },
      {
        id: 'high_gravity_adaptation',
        name: '',
        description: '',
        cost: { advancedResearch: 3_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'population',
            type: 'booleanFlag',
            flagId: 'highGravityAdaptation',
            value: true
          }
        ]
      },
      {
        id: 'biostorage',
        name: '',
        description: '',
        cost: { advancedResearch: 4_000_000 },
        prerequisites: [],
        effects: [
          { target: 'project', targetId: 'spaceStorage', type: 'booleanFlag', flagId: 'biostorage', value: true },
          {
            target: 'resource',
            resourceType: 'surface',
            targetId : 'biomass',
            type: 'enable'
          },
        ]
      },
      {
        id: 'warp_gate_fabrication',
        name: '',
        description: '',
        cost: { advancedResearch: 5_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'warpGateNetworkManager',
            type: 'booleanFlag',
            flagId: 'warpGateFabrication',
            value: true
          }
        ]
      },
      {
        id: 'chemistry_of_scale',
        name: '',
        description: '',
        cost: { advancedResearch: 6_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'boschReactor',
            type: 'booleanFlag',
            flagId: 'chemistryOfScale',
            value: true
          }
        ]
      },
      {
        id: 'self_replicating_ships_concept',
        name: '',
        description: '',
        cost: { advancedResearch: 8000000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            type: 'enableResearch',
            targetId: 'self_replicating_ships'
          }
        ]
      },
      {
        id: 'graphene_mastery',
        name: '',
        description: '',
        cost: { advancedResearch: 9_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            type: 'enableResearch',
            targetId: 'graphene_factory'
          },
          {
            target: 'project',
            targetId: 'spaceStorage',
            type: 'booleanFlag',
            flagId: 'graphiteStorage',
            value: true
          }
        ]
      },
      {
        id: 'dyson_sphere',
        name: '',
        description: '',
        cost: { advancedResearch: 10_000_000 },
        prerequisites: [],
        effects: [
          { target: 'project', targetId: 'dysonSphere', type: 'enable' }
        ]
      },
      {
        id: 'space_antimatter_safety_regulations',
        name: '',
        description: '',
        cost: { advancedResearch: 12_000_000 },
        prerequisites: [],
        effects: [
          { target: 'project', targetId: 'spaceAntimatter', type: 'enable' },
          { target: 'building', targetId: 'antimatterFarm', type: 'booleanFlag', flagId: 'spaceEnergyTransferRecipe', value: true }
        ]
      },
      {
        id: 'additional_dyson_spheres',
        name: '',
        description: '',
        cost: { advancedResearch: 5_000_000_000 },
        prerequisites: ['dyson_sphere'],
        effects: [
          { target: 'project', targetId: 'dysonSphere', type: 'booleanFlag', flagId: 'additionalDysonSpheres', value: true }
        ]
      },
      {
        id: 'nanotechnology_recycling',
        name: '',
        description: '',
        cost: { advancedResearch: 15_000_000 },
        prerequisites: [],
        disabled: true,
        effects: [
          {
            target: 'nanotechManager',
            type: 'booleanFlag',
            flagId: 'nanotechRecycling',
            value: true
          }
        ]
      },
      {
        id: 'companion_mirror',
        name: '',
        description: '',
        cost: { advancedResearch: 20_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            targetId: 'space_mirror',
            type: 'completeResearch'
          }
        ]
      },
      {
        id: 'methane_ammonia_lifting',
        name: '',
        description: '',
        cost: { advancedResearch: 30_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'spaceStorage',
            type: 'booleanFlag',
            flagId: 'methaneAmmoniaStorage',
            value: true
          },
          {
            target: 'project',
            targetId: 'lifters',
            type: 'booleanFlag',
            flagId: 'methaneAmmoniaLifting',
            value: true
          }
        ]
      },
      {
        id: 'hephaestus_megaconstruction',
        name: '',
        description: '',
        cost: { advancedResearch: 40_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'hephaestusMegaconstruction',
            type: 'enable'
          }
        ]
      },
      {
        id: 'warp_storage',
        name: '',
        description: '',
        cost: { advancedResearch: 75_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'storageDepot',
            type: 'booleanFlag',
            flagId: 'warpStorageRecipe',
            value: true
          },
          {
            target: 'project',
            targetId: 'spaceStorage',
            type: 'booleanFlag',
            flagId: 'warpStorageUpgrade',
            value: true
          }
        ]
      },
      {
        id: 'nuclear_alchemy',
        name: '',
        description: '',
        cost: { advancedResearch: 500_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'nuclearAlchemyFurnace',
            type: 'enable'
          }
        ]
      },
      {
        id: 'artificial_ecosystems',
        name: '',
        description: '',
        cost: { advancedResearch: 750_000_000 },
        prerequisites: ['biostorage'],
        effects: [
          {
            target: 'project',
            targetId: 'spaceStorage',
            type: 'booleanFlag',
            flagId: 'artificialEcosystems',
            value: true
          }
        ]
      },
      {
        id: 'bioships',
        name: '',
        description: '',
        cost: { advancedResearch: 8_000_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'lifeManager',
            type: 'booleanFlag',
            flagId: 'bioships',
            value: true
          }
        ]
      },
      {
        id: 'gigafoundries',
        name: '',
        description: '',
        cost: { advancedResearch: 10_000_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'superalloyGigafoundry',
            type: 'enable'
          }
        ]
      },
      {
        id: 'hyperlane',
        name: '',
        description: '',
        cost: { advancedResearch: 15_000_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'spaceManager',
            type: 'booleanFlag',
            flagId: 'hyperlane',
            value: true
          }
        ]
      },
      {
        id: 'core_surgery',
        name: '',
        description: '',
        cost: { advancedResearch: 20_000_000_000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'apolloCoreSurgeryPlatform',
            type: 'enable'
          }
        ]
      },
      {
        id: 'tractor_beams',
        name: '',
        description: '',
        cost: { advancedResearch: 999_999_999 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'planetaryThruster',
            type: 'booleanFlag',
            flagId: 'tractorBeams',
            value: true
          }
        ]
      },
      {
        id: 'star_lifting',
        name: '',
        description: '',
        cost: { advancedResearch: 2_000_000_000 },
        prerequisites: ['lifting'],
        effects: [
          {
            target: 'project',
            targetId: 'lifters',
            type: 'booleanFlag',
            flagId: 'starLifting',
            value: true
          }
        ]
      }
    ]
  };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = researchParameters;
}
  
