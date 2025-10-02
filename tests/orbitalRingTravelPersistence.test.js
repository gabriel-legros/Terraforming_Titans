const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Orbital Ring travel persistence', () => {
  function setup() {
    const ctx = { console, projectElements: {} };
    ctx.EffectableEntity = require('../src/js/effectable-entity.js');
    ctx.resources = { colony: {}, surface: {} };
    ctx.spaceManager = {
      getUnmodifiedTerraformedWorldCount: () => 2,
      getCurrentPlanetKey: () => 'mars',
      isPlanetTerraformed: () => true,
      setCurrentWorldHasOrbitalRing: () => {}
    };
    ctx.terraforming = { initialLand: 0 };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    const tdpCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'TerraformingDurationProject.js'), 'utf8');
    const orbCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'OrbitalRingProject.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project; this.ProjectManager = ProjectManager;', ctx);
    vm.runInContext(tdpCode + '; this.TerraformingDurationProject = TerraformingDurationProject;', ctx);
    vm.runInContext(orbCode + '; this.OrbitalRingProject = OrbitalRingProject;', ctx);
    ctx.globalThis = ctx;
    return ctx;
  }

  test('active state and remaining time persist through travel', () => {
    const ctx = setup();
    const config = {
      name: 'orbitalRing',
      category: 'mega',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      unlocked: true,
      attributes: {}
    };
    const project = new ctx.OrbitalRingProject(config, 'orbitalRing');
    project.start(ctx.resources);
    project.update(200);
    const saved = project.saveTravelState();
    const project2 = new ctx.OrbitalRingProject(config, 'orbitalRing');
    project2.loadTravelState(saved);
    expect(project2.isActive).toBe(true);
    expect(project2.remainingTime).toBe(800);
    project2.update(200);
    expect(project2.remainingTime).toBe(600);
  });
});
