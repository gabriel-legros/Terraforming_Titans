const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceMiningProject pressure settings persistence', () => {
  test('saveState and loadState preserve pressure fields', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const miningCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceMiningProject.js'), 'utf8');
    vm.runInContext(miningCode + '; this.SpaceMiningProject = SpaceMiningProject;', ctx);

    ctx.resources = { colony: { metal: { value: 0 } }, special: { spaceships: { value: 0 } } };
    ctx.projectManager = new ctx.ProjectManager();
    const params = { mine: { type: 'SpaceMiningProject', name: 'Mine', category: 'resources', cost: {}, duration: 1, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: { spaceMining: true } } };
    ctx.projectManager.initializeProjects(params);

    const project = ctx.projectManager.projects.mine;
    project.disableAbovePressure = true;
    project.disablePressureThreshold = 50;

    const saved = ctx.projectManager.saveState();
    const manager2 = new ctx.ProjectManager();
    manager2.initializeProjects(params);
    manager2.loadState(saved);

    const loaded = manager2.projects.mine;
    expect(loaded.disableAbovePressure).toBe(true);
    expect(loaded.disablePressureThreshold).toBe(50);
  });
});

