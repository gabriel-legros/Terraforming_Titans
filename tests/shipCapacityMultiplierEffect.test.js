const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('shipCapacityMultiplier effect', () => {
  test('doubles resource gain per ship when applied', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const miningCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceMiningProject.js'), 'utf8');
    vm.runInContext(miningCode + '; this.SpaceMiningProject = SpaceMiningProject;', ctx);

    const config = {
      name: 'Test',
      category: 'resources',
      cost: {},
      duration: 100,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: { colony: { metal: 1 } },
        resourceGainPerShip: { colony: { metal: 10 } }
      }
    };

    const project = new ctx.SpaceMiningProject(config, 'oreSpaceMining');
    project.assignedSpaceships = 1;
    let gain = project.calculateSpaceshipTotalResourceGain();
    expect(gain.colony.metal).toBeCloseTo(10);
    project.addAndReplace({ type: 'shipCapacityMultiplier', value: 2, effectId: 'test', sourceId: 'test' });
    gain = project.calculateSpaceshipTotalResourceGain();
    expect(gain.colony.metal).toBeCloseTo(20);
  });
});
