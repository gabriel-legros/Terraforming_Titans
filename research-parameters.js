const researchParameters = {
    energy: [
      {
        id: 'solar_efficiency',
        name: 'Improved Solar Efficiency',
        description: 'Increases the efficiency of solar panels.',
        cost: { research: 100 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'solarPanel',
            type: 'productionMultiplier',
            value: 1.25, // Increases solar panel production by 20%
          },
        ],
      },
      {
        id: 'geothermal_plant',
        name: 'Geothermal Power Generation',
        description: 'Unlocks geothermal generators, which require no maintenance.',
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
        id: 'fusion_1',
        name: 'Fusion reactor MkI',
        description: 'Enables a version of an old design from Earth.  Will require superconductors to build.',
        cost: { research: 1000000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'fusionPowerPlant1',
            type: 'enable',
          },
        ],
      },
    ],
    industry: [
      {
        id: 'ore_processing',
        name: 'Efficient Ore Processing',
        description: 'Increases the ore output from mining by 50%.',
        cost: { research: 200 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'oreMine',
            type: 'productionMultiplier',
            value: 1.5, // Increases ore production by 30%
          },
        ],
      },
      {
        id: 'ore_scanning',
        name: 'Ore Scanning Satellite',
        description: 'Enables a project at launch satellites for scanning the surface for new ore veins.',
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
        description: 'Doubles ore output from mining.',
        cost: { research: 100000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'oreMine',
            type: 'productionMultiplier',
            value: 2, // Increases ore production by 30%
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
            targetId: 'automateSpecialProjects',
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
        description: 'Further increase the capacity of each colonist import by 20 using bigger rockets.',
        cost: { research: 5000 },  // Adjust the cost to make it suitable for the impact of the research
        prerequisites: [],  // Requires the initial colonist import project to be available first
        effects: [
          {
            target: 'project',
            targetId: 'import_colonists_1',
            type: 'increaseResourceGain',
            resourceCategory: 'colony',
            resourceId: 'colonists',
            value: 20  // Increase the number of colonists imported by 30
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
        id: 't4_colony',
        name: 'Dome town',
        description: 'The first dome design.',
        cost: { research: 100000 },
        prerequisites: [],
        effects: [
          {
            target: 'colony',
            targetId: 't4_colony',
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
        id: 'dust_efficiency',
        name: 'Adapted black dust production',
        description: 'Doubles the efficiency of dust factories.',
        cost: { research: 5000 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'dustFactory',
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
        id: 'ghg_factory',
        name: 'Greenhouse Gas Factories',
        description: 'Allows the construction of greenhouse gas factories to produce SF6 which is stable, non-toxic and 23500 times more potent than CO2.',
        cost: { research: 100000 },
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
    ],
  };
  