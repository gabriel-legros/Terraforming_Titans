const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

function stubResource(value) {
  return {
    value,
    decrease(amount) { this.value = Math.max(this.value - amount, 0); },
    increase(amount) { this.value += amount; },
    modifyRate: jest.fn(),
    updateStorageCap: () => {}
  };
}

describe('SpaceshipProject continuous cost and gain', () => {
  test('applies proportional cost and gain over time when at least 100 ships', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    ctx.resources = {
      colony: {
        energy: stubResource(50),
        metal: stubResource(0)
      },
      special: { spaceships: { value: 100 } }
    };
    vm.createContext(ctx);
    const projectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);

    global.resources = ctx.resources;

    const config = {
      name: 'Test',
      category: 'resources',
      cost: {},
      duration: 100000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: { colony: { energy: 10 } },
        resourceGainPerShip: { colony: { metal: 20 } }
      }
    };
    const project = new ctx.SpaceshipProject(config, 'test');
    project.assignedSpaceships = 100;
    expect(project.canStart()).toBe(true);
    project.start(ctx.resources);
    const duration = project.getEffectiveDuration();
    project.update(duration / 2);
    project.applyCostAndGain(duration / 2);
    expect(ctx.resources.colony.energy.value).toBeCloseTo(49.5);
    expect(ctx.resources.colony.metal.value).toBeCloseTo(1);
  });

  test('uses discrete mode below 100 ships', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    ctx.resources = {
      colony: {
        energy: stubResource(50),
        metal: stubResource(0)
      },
      special: { spaceships: { value: 99 } }
    };
    vm.createContext(ctx);
    const projectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);

    global.resources = ctx.resources;

    const config = {
      name: 'Test',
      category: 'resources',
      cost: {},
      duration: 100000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: { colony: { energy: 10 } },
        resourceGainPerShip: { colony: { metal: 20 } }
      }
    };
    const project = new ctx.SpaceshipProject(config, 'test');
    project.assignedSpaceships = 99;
    expect(project.canStart()).toBe(true);
    project.start(ctx.resources);
    const duration = project.getEffectiveDuration();
    expect(ctx.resources.colony.energy.value).toBeCloseTo(40);
    project.update(duration / 2);
    project.applyCostAndGain(duration / 2);
    expect(ctx.resources.colony.energy.value).toBeCloseTo(40);
    expect(ctx.resources.colony.metal.value).toBeCloseTo(0);
    project.update(duration / 2);
    expect(ctx.resources.colony.metal.value).toBeCloseTo(20);
  });
});

