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
    unlocks: ['pop_growth', 'research_boost']
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
    unlocks: ['worker_reduction']
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
    unlocks: ['maintenance_reduction']
  },
  research_boost: {
    id: 'research_boost',
    name: 'Innovation Initiative',
    description: 'Boosts research output by 20% per rank',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'global',
      type: 'researchBoost',
      baseValue: 0.2,
      perRank: true
    },
    unlocks: ['scanning_speed']
  },
  maintenance_reduction: {
    id: 'maintenance_reduction',
    name: 'Streamlined Operations',
    description: 'Reduces maintenance costs by 10% per rank',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'global',
      type: 'maintenanceReduction',
      baseValue: 0.1,
      perRank: true
    },
    unlocks: ['ship_efficiency']
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
    unlocks: ['ship_efficiency']
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
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = skillParameters;
}
