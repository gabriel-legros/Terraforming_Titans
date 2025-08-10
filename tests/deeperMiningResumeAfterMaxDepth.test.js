const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Deeper mining resumes after building more mines', () => {
  test('project can start again when depth drops below max', () => {
    const ctx = { console, EffectableEntity };
    ctx.buildings = { oreMine: { count: 2 } };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const androidCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'AndroidProject.js'), 'utf8');
    vm.runInContext(androidCode + '; this.AndroidProject = AndroidProject;', ctx);
    const deeperCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'DeeperMiningProject.js'), 'utf8');
    vm.runInContext(deeperCode + '; this.DeeperMiningProject = DeeperMiningProject;', ctx);
    const config = { name: 'deeperMining', category: 'infrastructure', cost: {}, duration: 1, description: '', repeatable: true, maxDepth: 2, unlocked: true, attributes: {} };
    const project = new ctx.DeeperMiningProject(config, 'deeperMining');
    project.averageDepth = 2;
    project.isCompleted = true;
    project.oreMineCount = 2;
    ctx.buildings.oreMine.count = 4;
    project.registerMine();
    expect(project.averageDepth).toBeLessThan(2);
    expect(project.isCompleted).toBe(false);
    expect(project.canStart()).toBe(true);
  });
});
