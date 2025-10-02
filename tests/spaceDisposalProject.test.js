const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

function createDisposalContext() {
  const ctx = {
    console,
    EffectableEntity,
    shipEfficiency: 1,
    projectElements: {},
    formatNumber: n => n,
    formatBigInteger: n => n,
    formatTotalCostDisplay: () => '',
    formatTotalResourceGainDisplay: () => '',
    formatTotalMaintenanceDisplay: () => '',
    calculateProjectProductivities: () => ({}),
  };
  vm.createContext(ctx);

  const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
  vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
  const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
  vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
  const exportBase = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceExportBaseProject.js'), 'utf8');
  vm.runInContext(exportBase + '; this.SpaceExportBaseProject = SpaceExportBaseProject;', ctx);
  const disposalSubclass = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceDisposalProject.js'), 'utf8');
  vm.runInContext(disposalSubclass + '; this.SpaceDisposalProject = SpaceDisposalProject;', ctx);

  ctx.projectManager = { projects: {}, isBooleanFlagSet: () => false };
  ctx.ZONES = ['tropical', 'temperate', 'polar'];
  return ctx;
}

function createResource(value) {
  return {
    value,
    increase(amount) { this.value += amount; },
    decrease(amount) { this.value = Math.max(0, this.value - amount); },
  };
}

describe('SpaceDisposalProject', () => {
  test('initializes from parameters and calculates disposal', () => {
    const ctx = createDisposalContext();
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.disposeResources;
    expect(config.type).toBe('SpaceDisposalProject');

    const project = new ctx.SpaceDisposalProject(config, 'disposeResources');
    expect(project.selectedDisposalResource).toBeUndefined();

    project.assignedSpaceships = 200;
    project.selectedDisposalResource = { category: 'surface', resource: 'liquidWater' };
    const disposal = project.calculateSpaceshipTotalDisposal();

    expect(disposal.surface.liquidWater).toBeCloseTo(config.attributes.disposalAmount);
  });

  test('discrete disposal removes zonal water proportionally', () => {
    const ctx = createDisposalContext();
    ctx.resources = {
      surface: { liquidWater: createResource(1000) },
      colony: {},
      special: { spaceships: { value: 200 } },
      atmospheric: {},
    };
    ctx.terraforming = {
      zonalWater: {
        tropical: { liquid: 600, ice: 0 },
        temperate: { liquid: 300, ice: 0 },
        polar: { liquid: 100, ice: 0 },
      },
      zonalCO2: {
        tropical: { ice: 0, liquid: 0 },
        temperate: { ice: 0, liquid: 0 },
        polar: { ice: 0, liquid: 0 },
      },
      zonalSurface: {},
    };

    const config = {
      name: 'dispose',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceExport: true,
        costPerShip: {},
        disposalAmount: 400,
        disposable: { surface: ['liquidWater'] },
        defaultDisposal: { category: 'surface', resource: 'liquidWater' },
      },
    };

    const project = new ctx.SpaceDisposalProject(config, 'dispose');
    ctx.projectManager.projects.dispose = project;

    project.assignSpaceships(50);
    expect(project.isContinuous()).toBe(false);

    const started = project.start(ctx.resources);
    expect(started).toBe(true);

    expect(ctx.terraforming.zonalWater.tropical.liquid).toBeCloseTo(360);
    expect(ctx.terraforming.zonalWater.temperate.liquid).toBeCloseTo(180);
    expect(ctx.terraforming.zonalWater.polar.liquid).toBeCloseTo(60);
    expect(ctx.resources.surface.liquidWater.value).toBeCloseTo(600);
  });

  test('continuous disposal removes zonal water each tick', () => {
    const ctx = createDisposalContext();
    ctx.resources = {
      surface: { liquidWater: createResource(20000) },
      colony: {},
      special: { spaceships: { value: 400 } },
      atmospheric: {},
    };
    ctx.terraforming = {
      zonalWater: {
        tropical: { liquid: 12000, ice: 0 },
        temperate: { liquid: 6000, ice: 0 },
        polar: { liquid: 2000, ice: 0 },
      },
      zonalCO2: {
        tropical: { ice: 0, liquid: 0 },
        temperate: { ice: 0, liquid: 0 },
        polar: { ice: 0, liquid: 0 },
      },
      zonalSurface: {},
    };

    const config = {
      name: 'dispose',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceExport: true,
        costPerShip: {},
        disposalAmount: 100,
        disposable: { surface: ['liquidWater'] },
        defaultDisposal: { category: 'surface', resource: 'liquidWater' },
      },
    };

    const project = new ctx.SpaceDisposalProject(config, 'dispose');
    ctx.projectManager.projects.dispose = project;

    project.assignSpaceships(150);
    expect(project.isContinuous()).toBe(true);
    project.start(ctx.resources);

    const accumulatedChanges = {
      surface: { liquidWater: 0 },
      colony: { funding: 0 },
    };

    project.applyCostAndGain(1000, accumulatedChanges, 1);

    expect(accumulatedChanges.surface.liquidWater).toBeCloseTo(-15000);
    expect(ctx.terraforming.zonalWater.tropical.liquid).toBeCloseTo(3000);
    expect(ctx.terraforming.zonalWater.temperate.liquid).toBeCloseTo(1500);
    expect(ctx.terraforming.zonalWater.polar.liquid).toBeCloseTo(500);
  });

  test('mass drivers contribute effective ships and use configurable equivalency', () => {
    const ctx = createDisposalContext();
    ctx.resources = {
      surface: {},
      colony: { metal: {} },
      special: { spaceships: { value: 0 } },
      atmospheric: {},
    };
    ctx.buildings = { massDriver: { active: 0 } };

    const originalBuildings = global.buildings;
    global.buildings = ctx.buildings;
    try {
      const config = {
        name: 'dispose',
        category: 'resources',
        cost: {},
        duration: 1000,
        description: '',
        repeatable: true,
        maxRepeatCount: Infinity,
        unlocked: true,
        attributes: {
          spaceExport: true,
          costPerShip: { colony: { metal: 2 } },
          disposalAmount: 100,
          disposable: { atmospheric: ['greenhouseGas'] },
          defaultDisposal: { category: 'atmospheric', resource: 'greenhouseGas' },
          massDriverShipEquivalency: 5,
        },
      };

      const project = new ctx.SpaceDisposalProject(config, 'dispose');
      ctx.projectManager.projects.dispose = project;

      project.assignedSpaceships = 10;
      expect(project.getActiveShipCount()).toBe(10);
      expect(project.isContinuous()).toBe(false);

      project.applyBooleanFlag({ flagId: 'massDriverEnabled', value: true });
      ctx.buildings.massDriver.active = 3;
      expect(project.massDriverShipEquivalency).toBe(5);
      expect(project.getActiveShipCount()).toBe(25);
      expect(project.isContinuous()).toBe(false);

      ctx.buildings.massDriver.active = 20;
      expect(project.getActiveShipCount()).toBe(110);
      expect(project.isContinuous()).toBe(true);

      const perSecondCost = project.calculateSpaceshipTotalCost(true);
      const expectedMultiplier = project.getActiveShipCount() * (1000 / project.getEffectiveDuration());
      expect(perSecondCost.colony.metal).toBeCloseTo(config.attributes.costPerShip.colony.metal * expectedMultiplier);

      const defaultConfig = {
        ...config,
        attributes: {
          ...config.attributes,
        },
      };
      delete defaultConfig.attributes.massDriverShipEquivalency;

      const defaultProject = new ctx.SpaceDisposalProject(defaultConfig, 'defaultDispose');
      ctx.projectManager.projects.defaultDispose = defaultProject;
      defaultProject.applyBooleanFlag({ flagId: 'massDriverEnabled', value: true });
      defaultProject.assignedSpaceships = 0;
      ctx.buildings.massDriver.active = 2;

      expect(defaultProject.massDriverShipEquivalency).toBe(10);
      expect(defaultProject.getActiveShipCount()).toBe(20);
    } finally {
      if (originalBuildings === undefined) {
        delete global.buildings;
      } else {
        global.buildings = originalBuildings;
      }
    }
  });
});
