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
            type: 'enableBuilding',
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
            type: 'enableBuilding',
          },
        ],
      }
    ],
    industry: [
      {
        id: 'ore_processing',
        name: 'Efficient Ore Processing',
        description: 'Increases the ore output from mining.',
        cost: { research: 200 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'oreMine',
            type: 'productionMultiplier',
            value: 1.3, // Increases ore production by 30%
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
            type: 'enableBuilding',
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
            type: 'enableBuilding',
          },
        ],
      },
    ],
    colonization: [
      {
        id: 'greenhouses',
        name: 'Greenhouse Farming',
        description: 'Enables greenhouses for growing food on Mars.',
        cost: { research: 100 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'greenhouse',
            type: 'enableBuilding',
          },
        ],
      },
      {
        id: 'enhanced_colonist_import_1',
        name: 'Enhanced Colonist Importation',
        description: 'Increase the capacity of each colonist import by 10 using optimized spacecraft and improved logistics.',
        cost: { research: 500 },  // Adjust the cost to make it suitable for the impact of the research
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
        id: 't2_colony',
        name: 'Small outpost',
        description: 'Enables a larger colony for more efficient colonization.',
        cost: { research: 1000 },
        prerequisites: [],
        effects: [
          {
            target: 'colony',
            targetId: 't2_colony',
            type: 'enableBuilding',
          },
        ],
      },
      {
        id: 'launch_pads',
        name: 'Launch Pads',
        description: 'Allows automation of special projects.',
        cost: { research: 1000 },
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
    ],
    terraforming: [
      {
        id: 'atmospheric_venting',
        name: 'TBA',
        description: 'TBA.',
        cost: { research: 200 },
        prerequisites: [],
        effects: [
          {
            target: 'resource',
            targetId: 'atmosphericPressure',
            type: 'increment',
            value: 1000, // Increases atmospheric pressure by 1000 units
          },
        ],
      }
    ],
  };
  