const skillParameters = {
  build_cost: {
    id: 'build_cost',
    name: '',
    description: '',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'global',
      type: 'globalCostReduction',
      name: '',
      baseValue: 0.1,
      perRank: true
    },
    requires: []
  },
  pop_growth: {
    id: 'pop_growth',
    name: '',
    description: '',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'population',
      type: 'globalPopulationGrowth',
      name: '',
      baseValue: 0.2,
      perRank: true
    },
    requires: ['worker_reduction']
  },
  worker_reduction: {
    id: 'worker_reduction',
    name: '',
    description: '',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'global',
      type: 'globalWorkerReduction',
      baseValue: 0.1,
      perRank: true
    },
    requires: ['build_cost']
  },
  research_boost: {
    id: 'research_boost',
    name: '',
    description: '',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'global',
      type: 'globalResearchBoost',
      baseValue: 0.5,
      perRank: true
    },
    requires: ['build_cost']
  },
  maintenance_reduction: {
    id: 'maintenance_reduction',
    name: '',
    description: '',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'global',
      type: 'globalMaintenanceReduction',
      name: '',
      baseValue: 0.1,
      perRank: true
    },
    requires: ['pop_growth']
  },
  android_efficiency: {
    id: 'android_efficiency',
    name: '',
    description: '',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'building',
      targetId: 'androidFactory',
      type: 'productionMultiplier',
      baseValue: 0.4,
      perRank: true
    },
    requires: ['project_speed']
  },
  ship_efficiency: {
    id: 'ship_efficiency',
    name: '',
    description: '',
    cost: 1,
    maxRank: 5,
    effects: [
      {
        target: 'global',
        type: 'shipEfficiency',
        baseValue: 0.3,
        perRank: true
      },
      {
        target: 'project',
        targetId: 'galactic_market',
        type: 'tradeSaturationMultiplier',
        baseValue: 0.3,
        perRank: true
      },
      {
        target: 'project',
        targetId: 'exportResources',
        type: 'tradeSaturationMultiplier',
        baseValue: 0.3,
        perRank: true
      }
    ],
    requires: ['project_speed']
  },
  project_speed: {
    id: 'project_speed',
    name: '',
    description: '',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'projectManager',
      type: 'projectDurationReduction',
      baseValue: 0.15,
      perRank: true
    },
    requires: ['research_boost']
  },
  life_design_points: {
    id: 'life_design_points',
    name: '',
    description: '',
    cost: 1,
    maxRank: 5,
    effects: [
      {
        target: 'lifeDesigner',
        type: 'lifeDesignPointBonus',
        baseValue: 20,
        perRank: true
      },
      {
        target: 'lifeDesigner',
        type: 'lifeDesignPointShopMultiplier',
        baseValue: 0.2,
        perRank: true
      },
      {
        target: 'lifeDesigner',
        type: 'lifeDesignPointBiodomeMultiplier',
        baseValue: 0.2,
        perRank: true
      }
    ],
    requires: ['pop_growth']
  },
  nanotech_efficiency: {
    id: 'nanotech_efficiency',
    name: '',
    description: '',
    cost: 1,
    maxRank: 5,
    hiddenUntilRevealed: true,
    effect: {
      target: 'nanotechManager',
      type: 'nanotechEfficiencyMultiplier',
      baseValue: 0.2,
      perRank: true
    },
    requires: []
  },
  chemistry_mastery: {
    id: 'chemistry_mastery',
    name: '',
    description: '',
    cost: 1,
    maxRank: 5,
    hiddenUntilRevealed: true,
    effects: [
      {
        target: 'building',
        targetId: 'boschReactor',
        type: 'productionMultiplier',
        baseValue: 0.2,
        perRank: true
      },
      {
        target: 'building',
        targetId: 'boschReactor',
        type: 'consumptionMultiplier',
        baseValue: 0.2,
        perRank: true
      }
    ],
    requires: []
  },
  optimized_heat_sinks: {
    id: 'optimized_heat_sinks',
    name: '',
    description: '',
    cost: 1,
    maxRank: 5,
    hiddenUntilRevealed: true,
    effect: {
      target: 'project',
      targetId: 'megaHeatSink',
      type: 'heatSinkPowerMultiplier',
      baseValue: 0.5,
      perRank: true
    },
    requires: []
  },
  cloning_expertise: {
    id: 'cloning_expertise',
    name: '',
    description: '',
    cost: 1,
    maxRank: 5,
    hiddenUntilRevealed: true,
    effect: {
      target: 'building',
      targetId: 'cloningFacility',
      type: 'productionMultiplier',
      baseValue: 0.4,
      perRank: true
    },
    requires: []
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = skillParameters;
}
