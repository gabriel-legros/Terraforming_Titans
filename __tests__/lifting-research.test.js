const researchParameters = require('../src/js/research-parameters.js');

describe('Lifting advanced research', () => {
  it('defines the lifting research entry with the correct cost and unlock', () => {
    const lifting = researchParameters.advanced.find((entry) => entry.id === 'lifting');
    expect(lifting).toBeDefined();
    expect(lifting.cost).toEqual({ advancedResearch: 750000 });
    expect(lifting.effects).toEqual([
      {
        target: 'project',
        targetId: 'lifters',
        type: 'enable',
      },
    ]);
  });
});
