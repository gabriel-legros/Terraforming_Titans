const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Deeper mining max depth', () => {
  test('cannot start when depth reached', () => {
    const ctx = { console, EffectableEntity };
    ctx.resources = { colony: { androids: { value: 0 } } };
    ctx.buildings = { oreMine: { count: 1 } };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const androidCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'AndroidProject.js'), 'utf8');
    vm.runInContext(androidCode + '; this.AndroidProject = AndroidProject;', ctx);
    const deeperCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'DeeperMiningProject.js'), 'utf8');
    vm.runInContext(deeperCode + '; this.DeeperMiningProject = DeeperMiningProject;', ctx);
    const config = { name: 'deeperMining', category: 'infrastructure', cost: {}, duration: 1, description: '', repeatable: true, maxDepth: 2, unlocked: true, attributes: {} };
    const project = new ctx.DeeperMiningProject(config, 'deeperMining');
    expect(project.canStart()).toBe(true);
    project.averageDepth = 2;
    expect(project.canStart()).toBe(false);
  });
});
