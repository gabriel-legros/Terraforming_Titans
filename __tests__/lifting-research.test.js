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

  it('defines the methane and ammonia lifting research with storage and recipe flags', () => {
    const research = researchParameters.advanced.find((entry) => entry.id === 'methane_ammonia_lifting');
    expect(research).toBeDefined();
    expect(research.cost).toEqual({ advancedResearch: 30_000_000 });
    expect(research.effects).toEqual([
      {
        target: 'project',
        targetId: 'spaceStorage',
        type: 'booleanFlag',
        flagId: 'methaneAmmoniaStorage',
        value: true,
      },
      {
        target: 'project',
        targetId: 'lifters',
        type: 'booleanFlag',
        flagId: 'methaneAmmoniaLifting',
        value: true,
      },
    ]);
  });
});
