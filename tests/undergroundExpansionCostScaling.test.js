const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Underground Land Expansion cost scaling', () => {
  test('cost scales with land', () => {
    const ctx = { console, EffectableEntity };
    ctx.resources = { surface: { land: { value: 5 } } };
    ctx.terraforming = { initialLand: 5 };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const androidCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'AndroidProject.js'), 'utf8');
    vm.runInContext(androidCode + '; this.AndroidProject = AndroidProject;', ctx);
    const ugCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'UndergroundExpansionProject.js'), 'utf8');
    vm.runInContext(ugCode + '; this.UndergroundExpansionProject = UndergroundExpansionProject;', ctx);
    const config = {
      name: 'undergroundExpansion',
      category: 'infrastructure',
      cost: { colony: { metal: 10, components: 10 } },
      duration: 1,
      description: '',
      repeatable: true,
      unlocked: true,
      attributes: {}
    };
    const p = new ctx.UndergroundExpansionProject(config, 'undergroundExpansion');
    const cost = p.getScaledCost();
    expect(cost.colony.metal).toBe(50);
    expect(cost.colony.components).toBe(50);
  });
});
