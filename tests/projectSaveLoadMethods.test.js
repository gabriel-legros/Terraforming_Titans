const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Project save/load methods on subclasses', () => {
  test('SpaceMiningProject saves and loads custom fields', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const miningCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceMiningProject.js'), 'utf8');
    vm.runInContext(miningCode + '; this.SpaceMiningProject = SpaceMiningProject;', ctx);

    const config = { name: 'Mine', category: 'resources', cost: {}, duration: 1, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: { spaceMining: true } };
    const project = new ctx.SpaceMiningProject(config, 'mine');
    project.disableAbovePressure = true;
    project.disablePressureThreshold = 50;

    const saved = project.saveState();
    const loaded = new ctx.SpaceMiningProject(config, 'mine');
    loaded.loadState(saved);

    expect(loaded.disableAbovePressure).toBe(true);
    expect(loaded.disablePressureThreshold).toBe(50);
  });
});
