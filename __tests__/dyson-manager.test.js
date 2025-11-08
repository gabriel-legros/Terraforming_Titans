describe('DysonManager', () => {
  let dysonManager;

  const createSwarmProject = (collectors = 0, energyPerCollector = 0) => ({
    collectors,
    energyPerCollector,
  });

  const createReceiver = (active = 0, energyPerBuilding = 0, productivity = 1) => ({
    active,
    production: { colony: { energy: energyPerBuilding } },
    productivity,
  });

  beforeEach(() => {
    jest.resetModules();
    dysonManager = require('../src/js/dyson-manager.js');
    global.projectManager = { projects: { dysonSwarmReceiver: createSwarmProject() } };
    global.buildings = { dysonReceiver: createReceiver() };
  });

  afterEach(() => {
    delete global.projectManager;
    delete global.buildings;
    delete global.dysonManager;
    delete global.DysonManager;
  });

  it('returns zero overflow when no collectors exist', () => {
    expect(dysonManager.getOverflowEnergyPerSecond()).toBe(0);
  });

  it('subtracts receiver usage from swarm energy', () => {
    global.projectManager.projects.dysonSwarmReceiver = createSwarmProject(10, 1000);
    global.buildings.dysonReceiver = createReceiver(2, 3000, 1.5);

    expect(dysonManager.getOverflowEnergyPerSecond()).toBe(10_000 - 9_000);
  });

  it('never returns negative overflow even when receivers exceed swarm output', () => {
    global.projectManager.projects.dysonSwarmReceiver = createSwarmProject(1, 1000);
    global.buildings.dysonReceiver = createReceiver(5, 5000, 2);

    expect(dysonManager.getOverflowEnergyPerSecond()).toBe(0);
  });
});
