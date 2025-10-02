const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('waterSpaceMining dynamic returns', () => {
  function setupContext(temps) {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const miningCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceMiningProject.js'), 'utf8');
    vm.runInContext(miningCode + '; this.SpaceMiningProject = SpaceMiningProject;', ctx);

    ctx.getZonePercentage = getZonePercentage;
    ctx.terraforming = {
      zonalWater: {
        tropical: { liquid: 0, ice: 0, buriedIce: 0 },
        temperate: { liquid: 0, ice: 0, buriedIce: 0 },
        polar: { liquid: 0, ice: 0, buriedIce: 0 }
      },
      temperature: { zones: {
        tropical: { value: temps.tropical },
        temperate: { value: temps.temperate },
        polar: { value: temps.polar }
      }},
      synchronizeGlobalResources: jest.fn()
    };
    ctx.resources = { special: { spaceships: { value: 1 } } };
    Object.assign(global, {
      resources: ctx.resources,
      terraforming: ctx.terraforming,
      getZonePercentage: ctx.getZonePercentage
    });
    return ctx;
  }

  function createProject(ctx) {
    const config = {
      name: 'Water',
      category: 'resources',
      cost: {},
      duration: 1,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        dynamicWaterImport: true,
        costPerShip: {},
        resourceGainPerShip: { surface: { ice: 100 } }
      }
    };
    const project = new ctx.SpaceMiningProject(config, 'water');
    project.assignedSpaceships = 1;
    return project;
  }

  test('returns ice when all zones below freezing', () => {
    const ctx = setupContext({ tropical: 260, temperate: 260, polar: 250 });
    const project = createProject(ctx);
    expect(project.canStart()).toBe(true);
    project.start(ctx.resources);
    const duration = project.getEffectiveDuration();
    project.update(duration);
    const tropExp = 100 * getZonePercentage('tropical');
    const tempExp = 100 * getZonePercentage('temperate');
    const polarExp = 100 * getZonePercentage('polar');
    expect(ctx.terraforming.zonalWater.tropical.ice).toBeCloseTo(tropExp);
    expect(ctx.terraforming.zonalWater.temperate.ice).toBeCloseTo(tempExp);
    expect(ctx.terraforming.zonalWater.polar.ice).toBeCloseTo(polarExp);
  });

  test('returns liquid water only in warm zones', () => {
    const ctx = setupContext({ tropical: 280, temperate: 250, polar: 250 });
    const project = createProject(ctx);
    expect(project.canStart()).toBe(true);
    project.start(ctx.resources);
    const duration = project.getEffectiveDuration();
    project.update(duration);
    expect(ctx.terraforming.zonalWater.tropical.liquid).toBeCloseTo(100);
    expect(ctx.terraforming.zonalWater.temperate.liquid).toBe(0);
    expect(ctx.terraforming.zonalWater.polar.liquid).toBe(0);
  });
});
