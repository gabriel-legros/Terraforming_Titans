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

describe('continuous spaceship project automation', () => {
  let ctx;
  beforeEach(() => {
    ctx = { console, EffectableEntity, shipEfficiency: 1 };
    ctx.resources = {
      colony: {
        energy: stubResource(100000),
        metal: stubResource(0),
        funding: stubResource(0)
      },
      atmospheric: {
        carbonDioxide: stubResource(5),
        greenhouseGas: stubResource(10000)
      },
      special: { spaceships: { value: 200 } },
      surface: { liquidWater: stubResource(0) }
    };
    ctx.terraforming = {
      temperature: { value: 400 },
      celestialParameters: { gravity: 1, radius: 1 }
    };
    ctx.calculateAtmosphericPressure = (amount) => amount * 1000;
    ctx.projectManager = { projects: {}, durationMultiplier: 1 };
    vm.createContext(ctx);
    const projCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const miningCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceMiningProject.js'), 'utf8');
    vm.runInContext(miningCode + '; this.SpaceMiningProject = SpaceMiningProject;', ctx);
    const exportBaseCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceExportBaseProject.js'), 'utf8');
    vm.runInContext(exportBaseCode + '; this.SpaceExportBaseProject = SpaceExportBaseProject;', ctx);
    const disposalCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceDisposalProject.js'), 'utf8');
    vm.runInContext(disposalCode + '; this.SpaceDisposalProject = SpaceDisposalProject;', ctx);
    global.resources = ctx.resources;
    global.terraforming = ctx.terraforming;
    global.calculateAtmosphericPressure = ctx.calculateAtmosphericPressure;
    global.shipEfficiency = ctx.shipEfficiency;
    global.projectManager = ctx.projectManager;
  });

  test('space mining halts and resumes based on pressure automation', () => {
    const config = {
      name: 'Import Carbon',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: { colony: { energy: 10 } },
        resourceGainPerShip: { colony: { metal: 20 }, atmospheric: { carbonDioxide: 1 } }
      }
    };
    const project = new ctx.SpaceMiningProject(config, 'importCarbon');
    project.assignedSpaceships = 150;
    project.autoStart = true;
    project.disableAbovePressure = true;
    project.disablePressureThreshold = 6; // kPa
    expect(project.canStart()).toBe(true);
    project.start(ctx.resources);
    project.update(1000);
    project.applyCostAndGain(1000);
    expect(ctx.resources.colony.metal.value).toBeGreaterThan(0);
    ctx.resources.atmospheric.carbonDioxide.value = 7; // exceed threshold
    project.update(1000);
    project.applyCostAndGain(1000);
    expect(project.isActive).toBe(false);
    const metalAfterStop = ctx.resources.colony.metal.value;
    ctx.resources.atmospheric.carbonDioxide.value = 5; // below threshold
    if (project.autoStart && !project.isActive && project.canStart()) {
      project.start(ctx.resources);
    }
    project.update(1000);
    project.applyCostAndGain(1000);
    expect(ctx.resources.colony.metal.value).toBeGreaterThan(metalAfterStop);
  });

  test('space disposal halts and resumes based on temperature automation', () => {
    const config = {
      name: 'Disposal',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      unlocked: true,
      attributes: {
        spaceExport: true,
        disposalAmount: 10,
        fundingGainAmount: 1,
        costPerShip: { colony: { energy: 5 } },
        disposable: { atmospheric: ['greenhouseGas'] },
        defaultDisposal: { category: 'atmospheric', resource: 'greenhouseGas' }
      }
    };
    const project = new ctx.SpaceDisposalProject(config, 'dispose');
    project.assignedSpaceships = 150;
    project.autoStart = true;
    project.disableBelowTemperature = true;
    project.disableTemperatureThreshold = 350;
    project.selectedDisposalResource = { category: 'atmospheric', resource: 'greenhouseGas' };
    expect(project.canStart()).toBe(true);
    project.start(ctx.resources);
    project.update(1000);
    project.applyCostAndGain(1000);
    expect(ctx.resources.atmospheric.greenhouseGas.value).toBeLessThan(10000);
    ctx.terraforming.temperature.value = 300; // below threshold
    project.update(1000);
    project.applyCostAndGain(1000);
    expect(project.isActive).toBe(false);
    const ghgAfterStop = ctx.resources.atmospheric.greenhouseGas.value;
    ctx.terraforming.temperature.value = 400; // above threshold
    if (project.autoStart && !project.isActive && project.canStart()) {
      project.start(ctx.resources);
    }
    project.update(1000);
    project.applyCostAndGain(1000);
    expect(ctx.resources.atmospheric.greenhouseGas.value).toBeLessThan(ghgAfterStop);
  });
});
