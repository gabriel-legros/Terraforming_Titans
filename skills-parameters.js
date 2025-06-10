const skillParameters = {
  build_cost: {
    id: 'build_cost',
    name: 'Efficient Architecture',
    description: 'Reduces Building Costs by 10%',
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
    description: 'Increases population growth by 10%',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'population',
      type: 'globalPopulationGrowth',
      baseValue: 0.1,
      perRank: true
    },
    requires: ['research_boost']
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
    description: 'Boosts research output by 20% per rank',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'global',
      type: 'globalResearchBoost',
      baseValue: 0.2,
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
    requires: ['worker_reduction']
  },
  scanning_speed: {
    id: 'scanning_speed',
    name: 'Rapid Prospecting',
    description: 'Doubles ore scanning speed each rank',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'oreScanner',
      type: 'scanningSpeedMultiplier',
      baseValue: 2,
      perRank: true
    },
    requires: ['maintenance_reduction']
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
    requires: ['maintenance_reduction']
  },
  project_speed: {
    id: 'project_speed',
    name: 'Faster Projects',
    description: 'Reduces project durations by 10% per rank',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'projects',
      type: 'projectDurationReduction',
      baseValue: 0.1,
      perRank: true
    },
    requires: ['pop_growth']
  },
  life_design_points: {
    id: 'life_design_points',
    name: 'More Life Design Points',
    description: 'Grants 10 life design points per rank',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'lifeDesigner',
      type: 'lifeDesignPointBonus',
      baseValue: 10,
      perRank: true
    },
    requires: ['pop_growth']
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = skillParameters;
}
