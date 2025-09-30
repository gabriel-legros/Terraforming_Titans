const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity.js');

const previousEffectableEntity = global.EffectableEntity;
global.EffectableEntity = EffectableEntity;

const SpaceManager = require('../src/js/space.js');

function createProjectContext(spaceManager, resources, terraforming) {
  const ctx = {
    console,
    EffectableEntity,
    resources,
    terraforming,
    spaceManager,
    projectManager: { projects: {} },
    addJournalEntry: () => {},
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  const baseDir = path.join(__dirname, '..', 'src/js');
  const projectsCode = fs.readFileSync(path.join(baseDir, 'projects.js'), 'utf8');
  vm.runInContext(`${projectsCode}; this.Project = Project; this.ProjectManager = ProjectManager;`, ctx);
  const tdpCode = fs.readFileSync(path.join(baseDir, 'projects', 'TerraformingDurationProject.js'), 'utf8');
  vm.runInContext(`${tdpCode}; this.TerraformingDurationProject = TerraformingDurationProject;`, ctx);
  const orbCode = fs.readFileSync(path.join(baseDir, 'projects', 'OrbitalRingProject.js'), 'utf8');
  vm.runInContext(`${orbCode}; this.OrbitalRingProject = OrbitalRingProject;`, ctx);
  const resourceCode = fs.readFileSync(path.join(baseDir, 'resource.js'), 'utf8');
  vm.runInContext(`${resourceCode}; this.reconcileLandResourceValue = reconcileLandResourceValue;`, ctx);

  return ctx;
}

function createSpaceManager() {
  const planetsData = {
    mars: { name: 'Mars' },
    titan: { name: 'Titan' },
    venus: { name: 'Venus' },
  };
  return new SpaceManager(planetsData);
}

const projectConfig = {
  name: 'orbitalRing',
  category: 'mega',
  cost: {},
  duration: 1000,
  description: '',
  repeatable: true,
  unlocked: true,
  attributes: {},
};

describe('Orbital ring assignments', () => {
  afterAll(() => {
    global.EffectableEntity = previousEffectableEntity;
  });

  test('assigns ring to current story world and updates land', () => {
    const spaceManager = createSpaceManager();
    spaceManager.planetStatuses.mars.terraformed = true;
    spaceManager.currentPlanetKey = 'mars';
    const resources = { surface: { land: { value: 50 } }, colony: {} };
    const terraforming = { initialLand: 50 };
    const ctx = createProjectContext(spaceManager, resources, terraforming);
    const project = new ctx.OrbitalRingProject(projectConfig, 'orbitalRing');

    project.complete();
    ctx.reconcileLandResourceValue();

    expect(spaceManager.planetStatuses.mars.orbitalRing).toBe(true);
    expect(project.ringCount).toBe(1);
    expect(project.currentWorldHasRing).toBe(true);
    expect(resources.surface.land.value).toBe(100);
  });

  test('assigns additional ring to other terraformed story world', () => {
    const spaceManager = createSpaceManager();
    spaceManager.planetStatuses.mars.terraformed = true;
    spaceManager.planetStatuses.venus.terraformed = true;
    spaceManager.planetStatuses.mars.orbitalRing = true;
    spaceManager.currentPlanetKey = 'mars';
    const resources = { surface: { land: { value: 200 } }, colony: {} };
    const terraforming = { initialLand: 100 };
    const ctx = createProjectContext(spaceManager, resources, terraforming);
    const project = new ctx.OrbitalRingProject(projectConfig, 'orbitalRing');
    project.ringCount = 1;
    project.currentWorldHasRing = true;

    project.complete();
    ctx.reconcileLandResourceValue();

    expect(spaceManager.planetStatuses.mars.orbitalRing).toBe(true);
    expect(spaceManager.planetStatuses.venus.orbitalRing).toBe(true);
    expect(resources.surface.land.value).toBe(200);
  });

  test('assigns rings to random worlds after story worlds', () => {
    const spaceManager = createSpaceManager();
    spaceManager.planetStatuses.mars.terraformed = true;
    spaceManager.planetStatuses.mars.orbitalRing = true;
    spaceManager.currentPlanetKey = 'mars';
    const seed = '12345';
    spaceManager.randomWorldStatuses[seed] = {
      name: 'Seed 12345',
      terraformed: true,
      colonists: 0,
      original: null,
      visited: true,
      orbitalRing: false,
      departedAt: null,
      ecumenopolisPercent: 0,
    };
    spaceManager.currentRandomSeed = seed;
    spaceManager.currentPlanetKey = seed;
    const resources = { surface: { land: { value: 20 } }, colony: {} };
    const terraforming = { initialLand: 20 };
    const ctx = createProjectContext(spaceManager, resources, terraforming);
    const project = new ctx.OrbitalRingProject(projectConfig, 'orbitalRing');
    project.ringCount = 1;

    project.complete();
    ctx.reconcileLandResourceValue();

    expect(spaceManager.randomWorldStatuses[seed].orbitalRing).toBe(true);
    expect(project.ringCount).toBe(2);
    expect(project.currentWorldHasRing).toBe(true);
    expect(resources.surface.land.value).toBe(40);
  });

  test('reconciles assignments when loading project state', () => {
    const spaceManager = createSpaceManager();
    spaceManager.planetStatuses.mars.terraformed = true;
    spaceManager.planetStatuses.venus.terraformed = true;
    spaceManager.currentPlanetKey = 'mars';
    const resources = { surface: { land: { value: 0 } }, colony: {} };
    const terraforming = { initialLand: 75 };
    const ctx = createProjectContext(spaceManager, resources, terraforming);
    const projectManager = new ctx.ProjectManager();
    const orbitalProject = new ctx.OrbitalRingProject(projectConfig, 'orbitalRing');
    projectManager.projects.orbitalRing = orbitalProject;
    projectManager.projectOrder = ['orbitalRing'];
    ctx.projectManager = projectManager;

    const savedState = { projects: { orbitalRing: { ringCount: 2, currentWorldHasRing: false } } };

    projectManager.loadState(savedState);

    expect(spaceManager.countOrbitalRings()).toBe(2);
    expect(spaceManager.planetStatuses.mars.orbitalRing).toBe(true);
    expect(spaceManager.planetStatuses.venus.orbitalRing).toBe(true);
    expect(orbitalProject.currentWorldHasRing).toBe(true);
  });
});
