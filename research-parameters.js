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
        description: 'Unlocks geothermal generators, which require no maintenance, and a project to scan for suitable vents.',
        cost: { research: 1000 },
        prerequisites: [],
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
        description: 'Reduces the water consumption of nuclear reactors by 80%.',
        cost: { research: 50000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'nuclearPowerPlant',
            type: 'resourceConsumptionMultiplier',
            resourceCategory: 'colony',
            resourceTarget : 'water',
            value : 0.2
          },
          {
            target: 'building',
            targetId: 'nuclearPowerPlant',
            type: 'resourceProductionMultiplier',
            resourceCategory: 'atmospheric',
            resourceTarget : 'atmosphericWater',
            value : 0.2
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
          }
        ],
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
        description: 'Enables a project to launch satellites for scanning the surface for new ore veins.',
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
        description: 'Enables the manufacturing of androids, which can be both workers and colony helpers.  Androids require their own housing.',
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
      {
        id: 'recycling',
        name: 'Recycling',
        description: 'Unlocks the recycling facility, which is capable of recycling all sorts of material lost to maintenance.',
        cost: {research: 5000000},
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'recyclingFacility',
            type: 'enable',
          },
          {
            target: 'resource',
            resourceType: 'surface',
            targetId: 'scrapMetal',
            type: 'enable'
          }
        ]
      }, 
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
            targetId: 'bioFactory',
            type: 'workerMultiplier',
            value: 0.75
          }
        ],
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
        name: 'Small outpost',
        description: 'Enables a larger colony for more efficient colonization.',
        cost: { research: 1000 },
        prerequisites: [],
        effects: [
          {
            target: 'colony',
            targetId: 't2_colony',
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
        ],
      }, 
      {
        id: 'trading',
        name: 'Ship trading',
        description: 'Allows the export of metal and purchase of ships via special projects.  Also significantly reduces the duration of cargo rockets.',
        cost: { research: 1000000 },
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
              flagId : 'instantDuration',
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
          }
        ],
      },
      {
        id: 'life',
        name: 'Life Designing and Production',
        description: 'Allows the designing and production of specially engineered biomass.',
        cost: { research: 1000000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'bioFactory',
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
        description: 'Water is everywhere but more may be needed sometimes.',
        cost: { research: 500000000 },
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
  };
  