const skillParameters = {
  build_cost: {
    id: 'build_cost',
    name: 'Efficient Architecture',
    description: 'Reduces Building Costs by 10% (indirectly impacts maintenance)',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'global',
      type: 'globalCostReduction',
      baseValue: 0.1,
      perRank: true
    },
    requires: []
  },
  pop_growth: {
    id: 'pop_growth',
    name: 'Population Boom',
    description: 'Increases population growth by 20%',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'population',
      type: 'globalPopulationGrowth',
      name: 'Awakening',
      baseValue: 0.2,
      perRank: true
    },
    requires: ['worker_reduction']
  },
  worker_reduction: {
    id: 'worker_reduction',
    name: 'Automation',
    description: 'Reduces worker requirements by 10%',
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
    name: 'Innovation Initiative',
    description: 'Boosts research output by 50% per rank',
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
    name: 'Streamlined Operations',
    description: 'Reduces maintenance costs by 10% per rank',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'global',
      type: 'globalMaintenanceReduction',
      baseValue: 0.1,
      perRank: true
    },
    requires: ['pop_growth']
  },
  android_efficiency: {
    id: 'android_efficiency',
    name: 'Androids Efficiency',
    description: 'Increases android factory production by 40% per rank',
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
    name: 'Advanced Logistics',
    description: 'Ships import and export 20% more per rank',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'global',
      type: 'shipEfficiency',
      baseValue: 0.2,
      perRank: true
    },
    requires: ['project_speed']
  },
  project_speed: {
    id: 'project_speed',
    name: 'Faster Projects',
    description: 'Reduces project durations by 15% per rank',
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
    name: 'More Life Design Points',
    description: 'Grants 20 life design points per rank',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'lifeDesigner',
      type: 'lifeDesignPointBonus',
      baseValue: 20,
      perRank: true
    },
    requires: ['pop_growth']
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = skillParameters;
}
