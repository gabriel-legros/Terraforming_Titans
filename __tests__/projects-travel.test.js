const EffectableEntity = require('../src/js/effectable-entity');

describe('ProjectManager auto-start travel behaviour', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const createManager = () => {
    global.EffectableEntity = EffectableEntity;
    const { ProjectManager } = require('../src/js/projects.js');
    const manager = new ProjectManager();
    manager.initializeProjects({
      dysonSwarmReceiver: {
        name: 'Dyson Swarm',
        category: 'mega',
        cost: { colony: { metal: 1 } },
        duration: 1000,
        description: '',
        repeatable: false,
        unlocked: true,
        attributes: { canUseSpaceStorage: true },
      },
      spaceStorage: {
        name: 'Space Storage',
        category: 'mega',
        cost: { colony: { metal: 1 } },
        duration: 1000,
        description: '',
        repeatable: true,
        unlocked: true,
        attributes: { spaceStorage: true, canUseSpaceStorage: true },
      },
    });
    return manager;
  };

  afterEach(() => {
    delete global.gameSettings;
    delete global.Project;
    delete global.ProjectManager;
    delete global.projectManager;
    delete global.EffectableEntity;
    jest.resetModules();
  });

  it('persists the uncheck preference through save/load cycles', () => {
    const manager = createManager();
    manager.projects.spaceStorage.autoStartUncheckOnTravel = true;

    const saved = manager.saveState();

    const restored = createManager();
    restored.loadState(saved);

    expect(restored.projects.spaceStorage.autoStartUncheckOnTravel).toBe(true);
  });

  it('clears auto-start on travel even when preservation is enabled', () => {
    const manager = createManager();
    const dyson = manager.projects.dysonSwarmReceiver;
    dyson.autoStart = true;
    dyson.autoStartUncheckOnTravel = true;

    const travelState = manager.saveTravelState();

    const afterTravel = createManager();
    global.gameSettings = { preserveProjectAutoStart: true };
    afterTravel.projects.dysonSwarmReceiver.autoStart = true;

    afterTravel.loadTravelState(travelState);

    expect(afterTravel.projects.dysonSwarmReceiver.autoStart).toBe(false);
    expect(afterTravel.projects.dysonSwarmReceiver.autoStartUncheckOnTravel).toBe(true);
  });

  it('forces auto-start off if a legacy travel state kept it enabled', () => {
    const manager = createManager();
    global.gameSettings = { preserveProjectAutoStart: true };
    manager.projects.spaceStorage.autoStart = true;

    manager.loadTravelState({
      spaceStorage: {
        autoStart: true,
        autoStartUncheckOnTravel: true,
      },
    });

    expect(manager.projects.spaceStorage.autoStart).toBe(false);
  });
});
