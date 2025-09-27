const researchParameters = {
    energy: [
      {
        id: 'solar_efficiency',
        name: 'Improved Solar Efficiency',
        description: 'Increases the efficiency of solar panels by 25%.',
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
        name: 'Geothermal Power Generation',
        description: 'Unlocks geothermal generators, which require reduced maintenance, and a project to scan for suitable vents.',
        cost: { research: 1000 },
        prerequisites: [],
        requiresGeothermal: true,
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
        name: 'Advanced batteries',
        description: 'Doubles the storage capacity of batteries.',
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
        name: 'Nuclear Power Plant',
        description: 'Unlocks nuclear power plants, which produce vast amount of energy at great upfront cost.',
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
        name: 'Closed loop water cycle',
        description: 'Eliminates the water consumption of nuclear reactors.',
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
        name: 'Hydrogen Battery Array',
        description: 'Stores energy using compressed or liquid hydrogen.',
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
        name: 'Adapted fission power',
        description: 'Doubles the production of nuclear reactors.',
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
        name: 'Fusion reactor MkI',
        description: 'Enables a version of an old design from Earth.  Will require superconductors to build.',
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
        name: 'Improved fusion reactor',
        description: 'Doubles the production of fusion reactors.',
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
        name: 'State of the art fusion reactor',
        description: 'The best design that can be made.  Provides another 2x multiplier.',
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
        name: 'Hydrocarbon Generator',
        description: 'Allows construction of generators burning methane and oxygen for power.',
        cost: { research: 10000 },
        prerequisites: [],
        requiredFlags: ['hydrocarbonResearchUnlocked'],
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
        name: 'Dyson Swarm Receiver',
        description: 'Enables construction of a receiver for orbital solar collectors.',
        cost: { research: 100_000 },
        prerequisites: [],
        requiredFlags: ['dysonSwarmUnlocked'],
        effects: [
          { target: 'project', targetId: 'dysonSwarmReceiver', type: 'enable' },
          { target: 'building', targetId: 'dysonReceiver', type: 'enable' }
        ]
      },
      {
        id: 'superalloy_fusion_reactor',
        name: 'Superalloy Fusion Reactor',
        description: 'Unlocks a massive fusion reactor that requires superalloys.',
        cost: { research: 500000000000 },
        prerequisites: [],
        requiredFlags: ['superalloyResearchUnlocked'],
        effects: [
          { target: 'building', targetId: 'superalloyFusionReactor', type: 'enable' }
        ]
      },
      {
        id: 'next_generation_fusion',
        name: 'Next-Generation Fusion',
        description: 'Doubles superalloy fusion reactor energy output.',
        cost: { research: 100000000000000 },
        prerequisites: [],
        requiredFlags: ['superalloyResearchUnlocked'],
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
    ],
    industry: [
      {
        id: 'ore_processing',
        name: 'Efficient Ore Processing',
        description: 'Doubles ore output from mines.',
        cost: { research: 200 },
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
        name: 'Ore Scanning Satellite',
        description: 'Enables an infrastructure special project to launch satellites for scanning the surface for new ore veins.',
        cost: { research: 500 },
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
        name: 'Components factories',
        description: 'Allows production of components using human workers.',
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
        id: 'robotics_1',
        name: 'Farming robotics assistance',
        description: 'Integrates robots within hydroponics farm to reduce worker requirements by 20%.',
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
        name: 'Electronics factories',
        description: 'Allows production of electronics using human workers.',
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
        name: 'Assembly Lines',
        description: 'Integrates robots within components and electronics factory to reduce worker requirements by 20%.',
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
        name: 'Deep ore mines',
        description: 'Unlock a repeatable special project to increase ore output from mining.',
        cost: { research: 100000 },
        prerequisites: [],
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
        name: 'Android Manufacturing',
        description: 'Enables the manufacturing of androids, which can be both workers and colony helpers.  Androids require their own housing.  They may also be purchased using cargo rockets.',
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
        name: 'Android-assisted deeper mining',
        description: 'Allows assigning androids to the Deeper mining project for massive speed boosts.',
        cost: { research: 2000000 },
        prerequisites: ['deep_mine','android_factory'],
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
        name: 'Underground Land Expansion',
        description: 'Unlocks a repeatable android project to expand usable land via subterranean construction.',
        cost: { research: 2000000 },
        prerequisites: ['android_factory'],
        requiredFlags: ['undergroundHabitatsResearchUnlocked'],
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
        name: 'Superconductor Factory',
        description: 'Enables the fabrication of superconductors locally.',
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
        name: 'Advanced Alloys',
        description: 'Doubles metal output.',
        cost: { research: 10000000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'oreMine',
            effectId : 'advanced_alloy_research',
            type: 'productionMultiplier',
            value: 2
          },
        ],
      },
      {
        id: 'shipyard',
        name: 'Shipbuilding',
        description: 'Enables the construction of spaceships.  Also unlock a special project for asteroid mining and resource disposal.',
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
        {
          target : 'project',
          targetId : 'disposeResources',
          type: 'enable'
        }
      ],
    },
    {
      id: 'efficient_shipyards',
      name: 'Efficient Shipyards',
      description: 'Doubles shipyard production and consumption.',
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
      name: 'Self Replicating Ships',
      description: 'Unused spaceships duplicate themselves over time.',
      cost: { research: 10000000000 },
      prerequisites: [],
      requiredFlags: ['selfReplicatingShipsUnlocked'],
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
      name: 'Precision Assembly Lines',
      description: 'Integrates robots within superconductor and android factories to reduce worker requirements by 20%.',
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
        id: 'space_elevator',
        name: 'Space Elevator',
        description: 'Enables a special project for the space elevator, which eliminates the metal cost of many space activities.',
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
        name: 'Direct AI integration.',
        description: 'Integrates yourself within all factories to reduce all factory worker requirements by 25%.',
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
              targetId: 'biodome',
              type: 'workerMultiplier',
              value: 0.75
            }
        ],
      },
      {
        id: 'superalloy_foundry',
        name: 'Superalloy Foundry',
        description: 'Enables production of superalloys at great energy cost.',
        cost: { research: 500000000000 },
        prerequisites: [],
        requiredFlags: ['superalloyResearchUnlocked'],
        effects: [
          { target: 'building', targetId: 'superalloyFoundry', type: 'enable' },
          { target: 'resource', resourceType: 'colony', targetId: 'superalloys', type: 'enable' }
        ]
      },
    ],
    colonization: [
      {
        id: 'enhanced_colonist_import_1',
        name: 'Enhanced Colonist Importation',
        description: 'Increase the capacity of each colonist import by 10 using optimized spacecraft and improved logistics.',
        cost: { research: 100 },  // Adjust the cost to make it suitable for the impact of the research
        prerequisites: [],  // Requires the initial colonist import project to be available first
        effects: [
          {
            target: 'project',
            targetId: 'import_colonists_1',
            type: 'increaseResourceGain',
            resourceCategory: 'colony',
            resourceId: 'colonists',
            value: 10  // Increase the number of colonists imported by 30
          },
        ],
      },
      {
        id: 'launch_pads',
        name: 'Launch Pads',
        description: 'Allows automation of special projects.',
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
        name: 'Permanent outpost',
        description: 'Enables a larger colony for more efficient colonization.',
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
        name: 'Cloning Facilities',
        description: 'Unlocks cloning facilities that consume massive energy to grow colonists.',
        cost: { research: 1000 },
        prerequisites: [],
        requiredFlags: ['cloningResearchUnlocked'],
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
        name: 'Bigger rockets',
        description: 'Further increase the capacity of each colonist import by 30 using bigger rockets.',
        cost: { research: 5000 },  // Adjust the cost to make it suitable for the impact of the research
        prerequisites: [],  // Requires the initial colonist import project to be available first
        effects: [
          {
            target: 'project',
            targetId: 'import_colonists_1',
            type: 'increaseResourceGain',
            resourceCategory: 'colony',
            resourceId: 'colonists',
            value: 30  // Increase the number of colonists imported by 20
          },
        ],
      },
      {
        id: 't3_colony',
        name: 'Large outpost',
        description: 'Enables a very large outpost, suitable for long-term colonization.',
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
        name: 'Biggest rockets',
        description: 'Further increase the capacity of each colonist import by 150 using the biggest rockets available.',
        cost: { research: 50000 },  // Adjust the cost to make it suitable for the impact of the research
        prerequisites: [],  // Requires the initial colonist import project to be available first
        effects: [
          {
            target: 'project',
            targetId: 'import_colonists_1',
            type: 'increaseResourceGain',
            resourceCategory: 'colony',
            resourceId: 'colonists',
            value: 150  // Increase the number of colonists imported by 20
          },
        ],
      },
      {
        id: 'colony_sliders',
        name: 'Colony Management',
        description: 'Unlocks adjustable colony sliders.',
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
        name: 'Construction Office',
        description: 'Allows automation of building construction.',
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
        name: 'Dome town',
        description: 'The first dome design.  Can use androids as consumer goods.',
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
        name: 'Ship trading',
        description: 'Allows the export of metal via a new special project and purchase of ships via the cargo rocket special project.  Cargo rockets become continuous, consuming funding and delivering purchases in real time.',
        cost: { research: 50000000 },
        prerequisites: [],
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
        name: 'Dome City',
        description: 'A larger dome design.',
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
        name: 'Metropolis',
        description: 'Too big to be a dome, rather a collection of interlocked domes.',
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
        name: 'Ecumenopolis District',
        description: 'Creates a planet-wide city district with unmatched comfort.',
        cost: { research: 500000000000 },
        prerequisites: [],
        requiredFlags: ['superalloyResearchUnlocked'],
        effects: [
          { target: 'colony', targetId: 't7_colony', type: 'enable' }
        ],
      },
      {
        id: 'terraforming_bureau',
        name: 'Terraforming Bureau',
        description: 'Establishes oversight to automatically halt GHG factories at a chosen temperature and oxygen factories when O₂ pressure is too high.',
        cost: { research: 10000000 },
        prerequisites: [],
        effects: [
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
          }
        ],
      },
      {
        id: 'space_mirror_oversight',
        name: 'Space Mirror Facility Oversight',
        description: 'Applies automated oversight controls to the space mirror facility.',
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
        name: 'Atmospheric Monitoring',
        description: 'Enables setting limits on atmospheric mining special projects.',
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
    ],
    terraforming: [
      {
        id: 'dust_factory',
        name: 'Black Dust production',
        description: 'Unlocks a blueprint for black dust production, which can over a very long time significantly reduce the albedo of the ground to 0.05.',
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
        name: 'Hydroponic Farm',
        description: 'Produces food to feed colonists.',
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
        id: 'terraforming_sensor',
        name: 'Terraforming measurements',
        description: 'Unlocks the terraforming tab, which allows monitoring of terraforming parameters.',
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
        name: 'Adapted crops',
        description: 'Doubles the performance of our hydroponics farm using genetically modified potatoes.',
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
        name: 'Space mirrors',
        description: 'Unlocks a special project to launch the space mirror facility, which allows the deployment of space mirrors to increase the effective solar luminosity.',
        cost: { research: 10000 },
        prerequisites: [],
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
        name: 'Adapted black dust production',
        description: 'Quadruples the efficiency of dust factories.',
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
        name: 'Water Electrolysis',
        description: 'Unlocks a factory to produce oxygen from water.  Very energy intensive.',
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
        name: 'Chemical Reactor',
        description: 'Unlocks configurable reactors to perform various reactions.',
        cost: { research: 500_000 },
        prerequisites: [],
        requiredFlags: ['boschReactorUnlocked'],
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
        name: 'Mass Driver Foundations',
        description: 'Unlocks the mass driver launcher network and integrates surface disposal with orbital infrastructure.',
        cost: { research: 1_000_000_000 },
        prerequisites: [],
        requiredFlags: ['massDriverUnlocked'],
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
        name: 'Greenhouse Gas Factories',
        description: 'Allows the construction of greenhouse gas factories to produce SF6 which is stable, non-toxic and 23500 times more potent than CO2.',
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
        name: 'Streamlined Greenhouse Gas Production',
        description: 'Doubles the efficiency of GHG factories.',
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
        name: 'Mass Greenhouse Gas Production',
        description: 'Doubles the efficiency of GHG factories, again.',
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
        name: 'Life Designing and Production',
        description: 'Allows the designing and production of specially engineered biomass.',
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
        name: 'Carbon Importation',
        description: 'The asteroid belt is full of asteroids rich in carbon.  We can use our spaceships to extract CO2 and bring it back.',
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
        name: 'Water Importation',
        description: 'Water is everywhere but more may be needed sometimes.  Requires ships.',
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
        name: 'Nitrogen Importation',
        description: 'Import nitrogen to fill up the atmosphere with a neutral gas.',
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
        name: 'Hydrogen Importation',
        description: 'Import hydrogen to stockpile a reducing gas for industry and fuel.',
        cost: { research: 50_000_000 },
        prerequisites: [],
        requiredFlags: ['importHydrogenUnlocked'],
        effects: [
          {target : 'project',
            targetId : 'hydrogenSpaceMining',
            type: 'enable'
          }
        ],
      },
      {
        id: 'magneticShield',
        name: 'Magnetic Shield',
        description: 'Design for an equatorial wide superconductor wire that will carry a very large current around the planet.',
        cost: { research: 1000000000000 },
        prerequisites: [],
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
        name: 'Modular Nuclear Reactor',
        description: 'Miniaturizes fission reactors and automatically completes their research.',
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
        name: 'Hyperion Lantern',
        description: 'Research the construction of a large orbital facility that increases planetary luminosity.',
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
        name: 'Hydrocarbon Combustion Concept',
        description: 'Opens research into burning methane for power.',
        cost: { advancedResearch: 1000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            type: 'booleanFlag',
            flagId: 'hydrocarbonResearchUnlocked',
            value: true
          }
        ]
      },
      {
        id: 'infrared_vision',
        name: 'Infrared Vision',
        description: 'Equips ice harvesters with infrared sensors to operate around the clock.',
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
        name: 'Dyson Swarm Concept',
        description: 'Opens research into building massive solar collectors in space.',
        cost: { advancedResearch: 25000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            type: 'booleanFlag',
            flagId: 'dysonSwarmUnlocked',
            value: true
          }
        ]
      },
      {
        id: 'space_storage',
        name: 'Space Storage',
        description: 'Enables construction of an orbital storage facility.',
        cost: { advancedResearch: 30000 },
        prerequisites: [],
        effects: [
          { target: 'project', targetId: 'spaceStorage', type: 'enable' } ]
       },
      {
        id: 'cloning_concept',
        name: 'Cloning Concept',
        description: 'Explores human cloning to rapidly grow population.',
        cost: { advancedResearch: 40000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            type: 'booleanFlag',
            flagId: 'cloningResearchUnlocked',
            value: true
          }
        ]
      },
      {
        id: 'underground_habitats',
        name: 'Underground habitats',
        description: 'Opens research into expanding land through subterranean construction.',
        cost: { advancedResearch: 50000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            type: 'booleanFlag',
            flagId: 'undergroundHabitatsResearchUnlocked',
            value: true
          }
        ]
      },
      {
        id: 'hive_mind_androids',
        name: 'Hive Mind Androids',
        description: 'Links androids into a cooperative network producing research.',
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
        name: 'Space Mirror Focusing',
        description: 'Refines the space mirror facility to concentrate sunlight, allowing production of liquid water from ice.',
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
        name: 'Superalloys',
        description: 'Opens research into advanced superalloy materials.',
        cost: { advancedResearch: 100000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            type: 'booleanFlag',
            flagId: 'superalloyResearchUnlocked',
            value: true
          }
        ]
      },
      {
        id: 'nanotechnology_stage_1',
        name: 'Nanotechnology Stage I',
        description: 'Unlocks the nanocolony in the colony tab.',
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
        id: 'orbital_rings',
        name: 'Orbital Rings',
        description: 'Unlocks a new megastructure project for constructing orbital rings.',
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
        id: 'mechanical_assistance',
        name: 'Mechanical Assistance',
        description: 'Enables a new colony slider to provide mechanical assistance to partially counter the effects of high gravity.  The slider will only appear on high gravity worlds.',
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
        id: 'ship_smelting',
        name: 'Ship smelting',
        description: 'Ships can now smelt asteroids directly, allowing them to carry more metal.',
        cost: { advancedResearch: 200000 },
        prerequisites: [],
        effects: [
          {
            target: 'project',
            targetId: 'oreSpaceMining',
            type: 'shipCapacityMultiplier',
            value: 2
          }
        ]
      },
      {
        id: 'companion_satellite',
        name: 'Companion Satellite',
        description: 'An autonomous cube satellite that unlocks ore satellites and retains one per terraformed world when travelling.  Not intended for incineration.',
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
        id: 'self_replicating_ships_concept',
        name: 'Self Replicating Ships',
        description: 'Opens research into autonomous self-building spacecraft.',
        cost: { advancedResearch: 8000000 },
        prerequisites: [],
        effects: [
          {
            target: 'researchManager',
            type: 'booleanFlag',
            flagId: 'selfReplicatingShipsUnlocked',
            value: true
          }
        ]
      },
      {
        id: 'tractor_beams',
        name: 'Tractor Beams',
        description: 'Seriously?  Tractor Beams?  Sets planetary thrusters to a thrust-to-power ratio of 1, greatly reducing energy needs.',
        cost: { advancedResearch: 10000000 },
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
    ]
  };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = researchParameters;
}
  

