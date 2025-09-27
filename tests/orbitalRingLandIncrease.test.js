const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Orbital Ring project land effect', () => {
  function setup() {
    const ctx = { console, projectElements: {} };
    ctx.EffectableEntity = require('../src/js/effectable-entity.js');
    ctx.resources = {
      colony: { land: { value: 100 } },
      surface: { land: { value: 100 } }
    };
    ctx.currentPlanetParameters = {
      resources: { colony: { land: { initialValue: 100 } } }
    };
    ctx.terraforming = { initialLand: 100 };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    const tdpCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'TerraformingDurationProject.js'), 'utf8');
    const orbCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'OrbitalRingProject.js'), 'utf8');
    const spaceCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'space.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project; this.ProjectManager = ProjectManager;', ctx);
    vm.runInContext(tdpCode + '; this.TerraformingDurationProject = TerraformingDurationProject;', ctx);
    vm.runInContext(orbCode + '; this.OrbitalRingProject = OrbitalRingProject;', ctx);
    vm.runInContext(spaceCode + '; this.SpaceManager = SpaceManager;', ctx);
    ctx.spaceManager = new ctx.SpaceManager({ mars: {} });
    ctx.spaceManager.planetStatuses.mars.terraformed = true;
    ctx.globalThis = ctx;
    return ctx;
  }

  test('completion adds initial land and sets flag', () => {
    const ctx = setup();
    const config = { name: 'orbitalRing', category: 'mega', cost: {}, duration: 1, description: '', repeatable: true, unlocked: true, attributes: {} };
    const project = new ctx.OrbitalRingProject(config, 'orbitalRing');
    project.complete();
    expect(project.ringCount).toBe(1);
    expect(project.currentWorldHasRing).toBe(true);
    expect(ctx.spaceManager.planetStatuses.mars.orbitalRing).toBe(true);
    expect(ctx.resources.surface.land.value).toBe(200);
  });
});
