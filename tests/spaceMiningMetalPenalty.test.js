const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('metal production penalty without space elevator', () => {
  let context;
  beforeEach(() => {
    context = {
      console,
      EffectableEntity,
      shipEfficiency: 1,
      resources: {},
      buildings: {},
      colonies: {},
      projectManager: { projects: {}, getDurationMultiplier: () => 1 },
      populationModule: {},
      tabManager: {},
      fundingModule: {},
      terraforming: {},
      lifeDesigner: {},
      lifeManager: {},
      oreScanner: {},
      globalEffects: new EffectableEntity({ description: 'global' })
    };
    vm.createContext(context);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', context);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', context);
    const miningCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceMiningProject.js'), 'utf8');
    vm.runInContext(miningCode + '; this.SpaceMiningProject = SpaceMiningProject;', context);

    context.resources = {
      colony: {
        metal: { value: 0, decrease: jest.fn(), increase: jest.fn() }
      },
      special: { spaceships: { value: 1 } }
    };
    global.resources = context.resources;
    Object.assign(global, context);
  });

  test('metal gain reduced by metal cost', () => {
    const config = {
      name: 'Mine',
      category: 'resources',
      cost: {},
      duration: 100,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: { colony: { metal: 10 } },
        resourceGainPerShip: { colony: { metal: 100 } }
      }
    };
    const project = new context.SpaceMiningProject(config, 'mine');
    project.assignedSpaceships = 1;
    expect(project.canStart()).toBe(true);
    project.start(context.resources);
    const duration = project.getEffectiveDuration();
    project.update(duration);
    expect(context.resources.colony.metal.increase).toHaveBeenCalledWith(90);
    expect(context.resources.colony.metal.decrease).not.toHaveBeenCalled();
  });

  test('no penalty when metal cost removed', () => {
    const config = {
      name: 'Mine',
      category: 'resources',
      cost: {},
      duration: 100,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: { colony: { metal: 10 } },
        resourceGainPerShip: { colony: { metal: 100 } }
      }
    };
    const project = new context.SpaceMiningProject(config, 'mine');
    project.assignedSpaceships = 1;
    project.activeEffects.push({
      type: 'resourceCostMultiplier',
      resourceCategory: 'colony',
      resourceId: 'metal',
      value: 0
    });
    expect(project.canStart()).toBe(true);
    project.start(context.resources);
    const duration = project.getEffectiveDuration();
    project.update(duration);
    expect(context.resources.colony.metal.increase).toHaveBeenCalledWith(100);
  });
});
