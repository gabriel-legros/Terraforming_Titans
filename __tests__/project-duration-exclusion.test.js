const EffectableEntity = require('../src/js/effectable-entity');

describe('ProjectManager duration multipliers', () => {
  beforeEach(() => {
    jest.resetModules();
    global.EffectableEntity = EffectableEntity;
  });

  afterEach(() => {
    delete global.EffectableEntity;
    delete global.Project;
    delete global.ProjectManager;
    jest.resetModules();
  });

  test('skips spaceship exclusion effects for spaceship projects', () => {
    const { ProjectManager } = require('../src/js/projects.js');
    const manager = new ProjectManager();
    manager.activeEffects = [
      { type: 'projectDurationMultiplier', value: 0.5, excludeSpaceships: true },
      { type: 'projectDurationMultiplier', value: 0.8 },
    ];

    const spaceshipProject = { attributes: { spaceMining: true, spaceExport: false } };
    const regularProject = { attributes: { spaceMining: false, spaceExport: false } };

    expect(manager.getDurationMultiplier(spaceshipProject)).toBeCloseTo(0.8, 6);
    expect(manager.getDurationMultiplier(regularProject)).toBeCloseTo(0.4, 6);
  });
});
