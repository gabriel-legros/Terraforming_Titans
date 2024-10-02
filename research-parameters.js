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
            effectType: 'productionMultiplier',
            value: 1.2, // Increases solar panel production by 20%
          },
        ],
      },
      {
        id: 'geothermal_plant',
        name: 'Geothermal Power Generation',
        description: 'Unlocks geothermal generators, which require no maintenance.',
        cost: { research: 100 },
        prerequisites: [],
        effects: [
          {
            target: 'building',
            targetId: 'geothermalGenerator',
            effectType: 'enableBuilding',
          },
        ],
      },
      {
        id: 'energy_storage',
        name: 'Advanced Energy Storage',
        description: 'Increases battery capacity for energy storage.',
        cost: { research: 150 },
        prerequisites: ['solar_efficiency'],
        effects: [
          {
            target: 'building',
            targetId: 'battery',
            effectType: 'storageMultiplier',
            value: 1.5, // Increases battery storage capacity by 50%
          },
        ],
      },
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
            effectType: 'productionMultiplier',
            value: 1.3, // Increases ore production by 30%
          },
        ],
      },
      {
        id: 'robotic_factories',
        name: 'Robotic Factories',
        description: 'Allows automated production facilities.',
        cost: { research: 300 },
        prerequisites: ['ore_processing'],
        effects: [
          {
            target: 'building',
            targetId: 'factory',
            effectType: 'enableBuilding',
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
            effectType: 'enableBuilding',
          },
        ],
      },
      {
        id: 'crew_morale',
        name: 'Crew Morale Improvements',
        description: 'Improves colonist productivity by boosting morale.',
        cost: { research: 150 },
        prerequisites: ['greenhouses'],
        effects: [
          {
            target: 'colony',
            targetId: 'colonists',
            effectType: 'productivityMultiplier',
            value: 1.1, // Increases colonist productivity by 10%
          },
        ],
      },
    ],
    terraforming: [
      {
        id: 'atmospheric_venting',
        name: 'Atmospheric Venting',
        description: 'Vents more carbon dioxide into the atmosphere, increasing pressure.',
        cost: { research: 200 },
        prerequisites: [],
        effects: [
          {
            target: 'resource',
            targetId: 'atmosphericPressure',
            effectType: 'increment',
            value: 1000, // Increases atmospheric pressure by 1000 units
          },
        ],
      },
      {
        id: 'planting_moss',
        name: 'Planting Moss',
        description: 'Allows moss to grow, slowly increasing oxygen levels.',
        cost: { research: 250 },
        prerequisites: ['atmospheric_venting'],
        effects: [
          {
            target: 'resource',
            targetId: 'oxygen',
            effectType: 'incrementPerTick',
            value: 1, // Slowly increases oxygen levels by 1 unit per tick
          },
        ],
      },
    ],
  };
  