const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceMiningProject default pressure threshold', () => {
  test('constructor initializes pressure thresholds without enabling them', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const miningCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceMiningProject.js'), 'utf8');
    vm.runInContext(miningCode + '; this.SpaceMiningProject = SpaceMiningProject;', ctx);

    ctx.resources = { colony: {}, special: { spaceships: { value: 0 } }, atmospheric: {}, surface: {}, underground: {} };
    ctx.projectManager = new ctx.ProjectManager();
    const params = {
      mine: {
        type: 'SpaceMiningProject',
        name: 'Mine',
        category: 'resources',
        cost: {},
        duration: 1,
        description: '',
        repeatable: true,
        maxRepeatCount: Infinity,
        unlocked: true,
        attributes: { spaceMining: true, maxPressure: 0.1, maxOxygenPressure: 10 }
      }
    };
    ctx.projectManager.initializeProjects(params);
    const project = ctx.projectManager.projects.mine;
    expect(project.disableAbovePressure).toBe(false);
    expect(project.disablePressureThreshold).toBe(0.1);
    expect(project.disableAboveOxygenPressure).toBe(false);
    expect(project.disableOxygenPressureThreshold).toBe(10);
  });
});
