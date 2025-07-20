const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Deeper mining cost scaling', () => {
  test('cost scales with ore mines built', () => {
    const ctx = { console, EffectableEntity };
    ctx.buildings = { oreMine: { count: 5 } };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const androidCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'AndroidProject.js'), 'utf8');
    vm.runInContext(androidCode + '; this.AndroidProject = AndroidProject;', ctx);
    const config = {
      name: 'deeperMining',
      category: 'infrastructure',
      cost: { colony: { electronics: 10, components: 10 } },
      duration: 1,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: { costOreMineScaling: true }
    };
    const p = new ctx.AndroidProject(config, 'deeperMining');
    const cost = p.getScaledCost();
    expect(cost.colony.electronics).toBe(50);
    expect(cost.colony.components).toBe(50);
  });
});
