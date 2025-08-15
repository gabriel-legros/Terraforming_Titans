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

function createChanges(resources) {
  const changes = {};
  for (const category in resources) {
    changes[category] = {};
    for (const resource in resources[category]) {
      changes[category][resource] = 0;
    }
  }
  return changes;
}

function applyChanges(resources, changes) {
  for (const category in changes) {
    for (const resource in changes[category]) {
      if (resources[category]?.[resource]) {
        resources[category][resource].value += changes[category][resource];
      }
    }
  }
}

describe('SpaceshipProject continuous cost and gain', () => {
  test('applies proportional cost and gain over time when more than 100 ships', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    ctx.resources = {
      colony: {
        energy: stubResource(1000),
        metal: stubResource(0)
      },
      special: { spaceships: { value: 101 } }
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
    project.assignedSpaceships = 101;
    expect(project.canStart()).toBe(true);
    project.start(ctx.resources);
    const duration = project.getEffectiveDuration();
    project.update(duration / 2);
    const changes = createChanges(ctx.resources);
    project.applyCostAndGain(duration / 2, changes);
    applyChanges(ctx.resources, changes);
    expect(ctx.resources.colony.energy.value).toBeCloseTo(495);
    expect(ctx.resources.colony.metal.value).toBeCloseTo(1010);
  });

  test('uses discrete mode at or below 100 ships', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    ctx.resources = {
      colony: {
        energy: stubResource(1000),
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
    expect(ctx.resources.colony.energy.value).toBeCloseTo(990);
    project.update(duration / 2);
    let changes = createChanges(ctx.resources);
    project.applyCostAndGain(duration / 2, changes);
    applyChanges(ctx.resources, changes);
    expect(ctx.resources.colony.energy.value).toBeCloseTo(990);
    expect(ctx.resources.colony.metal.value).toBeCloseTo(0);
    project.update(duration / 2);
    changes = createChanges(ctx.resources);
    project.applyCostAndGain(duration / 2, changes);
    applyChanges(ctx.resources, changes);
    expect(ctx.resources.colony.metal.value).toBeCloseTo(20);
  });

  test('production rate matches at 100-ship transition', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    vm.createContext(ctx);
    const projectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);

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
    const discreteDuration = project.getEffectiveDuration();
    const discreteGain = project.calculateSpaceshipTotalResourceGain().colony.metal;
    const discreteRate = discreteGain * 1000 / discreteDuration;
    const perShipGain = project.calculateSpaceshipGainPerShip().colony.metal;
    const continuousRate = perShipGain * 100 * 1000 / project.duration;
    expect(discreteRate).toBeCloseTo(continuousRate);
  });

  test('reverts to discrete mode when ship count drops to 100 or less', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    ctx.resources = {
      colony: { energy: stubResource(1000), metal: stubResource(0) },
      special: { spaceships: { value: 150 } }
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
    project.assignSpaceships(150);
    project.start(ctx.resources);
    expect(project.isContinuous()).toBe(true);
    expect(project.remainingTime).toBe(Infinity);
    project.assignSpaceships(-50);
    expect(project.isContinuous()).toBe(false);
    const duration = project.getEffectiveDuration();
    expect(project.remainingTime).toBeCloseTo(duration);
    project.update(duration / 2);
    expect(project.remainingTime).toBeCloseTo(duration / 2);
  });
});

