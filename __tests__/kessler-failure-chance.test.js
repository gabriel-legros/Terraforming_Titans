const EffectableEntity = require('../src/js/effectable-entity');

describe('Kessler failure chance', () => {
  afterEach(() => {
    delete global.EffectableEntity;
    delete global.hazardManager;
    jest.resetModules();
  });

  test('uses debris size to compute failure chance for base projects', () => {
    global.EffectableEntity = EffectableEntity;
    global.hazardManager = {
      kesslerHazard: {
        getSuccessChance: (isLarge) => (isLarge ? 0.2 : 0.9)
      }
    };

    const { Project } = require('../src/js/projects.js');
    const smallProject = new Project(
      {
        name: 'Small Test',
        category: 'infrastructure',
        cost: { colony: {} },
        duration: 1000,
        description: '',
        repeatable: false,
        unlocked: true,
        kesslerDebrisSize: 'small',
        attributes: {}
      },
      'smallTest'
    );
    const largeProject = new Project(
      {
        name: 'Large Test',
        category: 'mega',
        cost: { colony: {} },
        duration: 1000,
        description: '',
        repeatable: false,
        unlocked: true,
        kesslerDebrisSize: 'large',
        attributes: {}
      },
      'largeTest'
    );

    expect(smallProject.getKesslerFailureChance()).toBeCloseTo(0.1);
    expect(largeProject.getKesslerFailureChance()).toBeCloseTo(0.8);
  });
});
