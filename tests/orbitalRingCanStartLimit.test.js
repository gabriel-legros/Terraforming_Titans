const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Orbital Ring project start limits', () => {
  function setup() {
    const ctx = { console, projectElements: {} };
    ctx.EffectableEntity = require('../src/js/effectable-entity.js');
    ctx.resources = { colony: { metal: { value: 1 }, components: { value: 1 }, superalloys: { value: 1 } } };
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
    ctx.globalThis = ctx;
    return ctx;
  }

  test('cannot exceed terraformed worlds', () => {
    const ctx = setup();
    ctx.spaceManager.planetStatuses.mars.terraformed = true;
    const config = {
      name: 'orbitalRing',
      category: 'mega',
      cost: {},
      duration: 1,
      description: '',
      repeatable: true,
      unlocked: true,
      attributes: {}
    };
    const project = new ctx.OrbitalRingProject(config, 'orbitalRing');
    expect(project.canStart()).toBe(true);
    project.ringCount = 1;
    expect(project.canStart()).toBe(false);
  });
});
