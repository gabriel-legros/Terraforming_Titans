const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Deeper mining registerMine updates depth', () => {
  test('average depth updates when mines built', () => {
    const ctx = { console, EffectableEntity };
    ctx.buildings = { oreMine: { count: 0 } };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const androidCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'AndroidProject.js'), 'utf8');
    vm.runInContext(androidCode + '; this.AndroidProject = AndroidProject;', ctx);
    const deeperCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'DeeperMiningProject.js'), 'utf8');
    vm.runInContext(deeperCode + '; this.DeeperMiningProject = DeeperMiningProject;', ctx);
    const config = { name: 'deeperMining', category: 'infrastructure', cost: {}, duration: 1, description: '', repeatable: true, maxDepth: Infinity, unlocked: true, attributes: { costOreMineScaling: true }};
    const p = new ctx.DeeperMiningProject(config, 'deeperMining');
    ctx.buildings.oreMine.count = 4;
    p.registerMine();
    expect(p.oreMineCount).toBe(4);
    expect(p.averageDepth).toBe(1);
    p.averageDepth = 2;
    ctx.buildings.oreMine.count = 6;
    p.registerMine();
    expect(p.oreMineCount).toBe(6);
    expect(p.averageDepth).toBeCloseTo((2 * 4 + 2) / 6);
  });
});
