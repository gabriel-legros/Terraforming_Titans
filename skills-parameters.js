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
    unlocks: ['pop_growth', 'worker_reduction']
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
    }
  },
  worker_reduction: {
    id: 'worker_reduction',
    name: 'Automation',
    description: 'Reduces worker requirements by 10%',
    cost: 1,
    maxRank: 5,
    effect: {
      target: 'building',
      type: 'globalWorkerReduction',
      baseValue: 0.1,
      perRank: true
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = skillParameters;
}
