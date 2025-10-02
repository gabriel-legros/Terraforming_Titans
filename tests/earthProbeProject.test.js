const fs = require('fs');
const path = require('path');
const vm = require('vm');
const loadProgress = require('./loadProgress');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Earth Recon Probe project', () => {
  test('parameters include planet restriction and cost doubling', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);
    loadProgress(ctx);
    const project = ctx.projectParameters.earthProbe;
    expect(project).toBeDefined();
    expect(project.repeatable).toBe(true);
    expect(project.maxRepeatCount).toBe(10);
    expect(project.attributes.costDoubling).toBe(true);
    expect(project.attributes.planet).toBe('titan');
    expect(project.category).toBe('story');
  });

  test('cost doubles with repeat count', () => {
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const config = {
      name: 'Probe',
      category: 'special',
      cost: { colony: { components: 10 } },
      duration: 10,
      description: '',
      repeatable: true,
      maxRepeatCount: 10,
      unlocked: true,
      attributes: { costDoubling: true }
    };
    const p = new ctx.Project(config, 'probe');
    expect(p.assignedSpaceships).toBeUndefined();
    expect(p.autoAssignSpaceships).toBeUndefined();
    expect(p.waitForCapacity).toBeUndefined();
    expect(p.selectedDisposalResource).toBeUndefined();
    expect(p.getScaledCost().colony.components).toBe(10);
    p.repeatCount = 1;
    expect(p.getScaledCost().colony.components).toBe(20);
    p.repeatCount = 2;
    expect(p.getScaledCost().colony.components).toBe(40);
  });
});
