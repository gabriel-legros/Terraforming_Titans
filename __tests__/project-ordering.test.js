const EffectableEntity = require('../src/js/effectable-entity');

const createManager = () => {
  global.EffectableEntity = EffectableEntity;
  const { ProjectManager } = require('../src/js/projects.js');
  const manager = new ProjectManager();
  const baseProject = (name) => ({
    name,
    category: 'resources',
    cost: { colony: { metal: 1 } },
    duration: 1000,
    description: '',
    repeatable: false,
    unlocked: true,
  });
  manager.initializeProjects({
    alpha: baseProject('Alpha'),
    gamma: baseProject('Gamma'),
    epsilon: baseProject('Epsilon'),
    oreSpaceMining: baseProject('Ore'),
    waterSpaceMining: baseProject('Water'),
    siliconSpaceMining: baseProject('Silica'),
    carbonSpaceMining: baseProject('Carbon'),
    nitrogenSpaceMining: baseProject('Nitrogen'),
    hydrogenSpaceMining: baseProject('Hydrogen'),
  });
  return manager;
};

describe('Project order normalization', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    delete global.Project;
    delete global.ProjectManager;
    delete global.projectManager;
    delete global.EffectableEntity;
    jest.resetModules();
  });

  it('normalizes import projects when saving state', () => {
    const manager = createManager();
    manager.projectOrder = [
      'alpha',
      'oreSpaceMining',
      'gamma',
      'waterSpaceMining',
      'epsilon',
      'siliconSpaceMining',
      'carbonSpaceMining',
      'nitrogenSpaceMining',
      'hydrogenSpaceMining',
    ];

    const saved = manager.saveState();

    expect(saved.order).toEqual([
      'alpha',
      'oreSpaceMining',
      'waterSpaceMining',
      'siliconSpaceMining',
      'carbonSpaceMining',
      'nitrogenSpaceMining',
      'hydrogenSpaceMining',
      'gamma',
      'epsilon',
    ]);
    expect(manager.projectOrder).toEqual(saved.order);
  });

  it('restores grouped import order when loading travel state', () => {
    const manager = createManager();
    const travelState = {
      _order: [
      'alpha',
      'oreSpaceMining',
      'gamma',
      'waterSpaceMining',
      'epsilon',
      'siliconSpaceMining',
      'carbonSpaceMining',
      'nitrogenSpaceMining',
      'hydrogenSpaceMining',
    ],
  };

    manager.loadTravelState(travelState);

    expect(manager.projectOrder).toEqual([
      'alpha',
      'oreSpaceMining',
      'waterSpaceMining',
      'siliconSpaceMining',
      'carbonSpaceMining',
      'nitrogenSpaceMining',
      'hydrogenSpaceMining',
      'gamma',
      'epsilon',
    ]);
  });
});
