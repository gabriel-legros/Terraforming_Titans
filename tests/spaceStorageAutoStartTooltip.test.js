const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('Space storage discrete tooltip behavior', () => {
  function setupContext() {
    const dom = new JSDOM('<!DOCTYPE html><div></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.window = dom.window;
    ctx.console = console;
    ctx.projectElements = {};
    ctx.formatNumber = n => n.toString();
    ctx.formatBigInteger = n => n.toString();
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
    ctx.toDisplayTemperature = x => x;
    ctx.getTemperatureUnit = () => 'K';
    ctx.gameSettings = { useCelsius: false };
    ctx.shipEfficiency = 1;
    ctx.invalidateAutomationSettingsCache = () => {};

    const EffectableEntity = require('../src/js/effectable-entity.js');
    ctx.EffectableEntity = EffectableEntity;

    vm.createContext(ctx);

    const projectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(`${projectCode}; this.Project = Project;`, ctx);

    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(`${spaceshipCode}; this.SpaceshipProject = SpaceshipProject;`, ctx);

    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(`${storageCode}; this.SpaceStorageProject = SpaceStorageProject;`, ctx);

    return ctx;
  }

  function buildResources() {
    const modifyRate = jest.fn();
    const metal = {
      displayName: 'Metal',
      value: 0,
      cap: 1_000_000,
      increase(amount) {
        this.value += amount;
      },
      decrease(amount) {
        this.value -= amount;
      },
      modifyRate,
    };

    return {
      modifyRate,
      resources: {
        colony: {
          metal,
        },
        surface: {
          liquidWater: {
            value: 0,
            cap: 1_000_000,
            increase() {},
            decrease() {},
            modifyRate() {},
          },
        },
        special: {
          spaceships: { value: 1_000 },
        },
      },
    };
  }

  function createProject(ctx) {
    const config = {
      name: 'spaceStorage',
      category: 'space',
      cost: {},
      duration: 20_000,
      repeatable: true,
      maxRepeatCount: 1000,
      unlocked: true,
      attributes: {
        costPerShip: {},
        transportPerShip: 500,
      },
    };
    return new ctx.SpaceStorageProject(config, 'spaceStorage');
  }

  test('auto start withdraw operations apply per-second tooltip rates while active', () => {
    const ctx = setupContext();
    const { resources, modifyRate } = buildResources();
    ctx.resources = resources;

    const project = createProject(ctx);
    project.assignedSpaceships = 10;
    project.repeatCount = 5;
    project.shipOperationAutoStart = true;
    project.shipWithdrawMode = true;
    project.selectedResources = [{ category: 'colony', resource: 'metal' }];
    project.resourceUsage.metal = 500;
    project.usedStorage = 500;

    expect(project.startShipOperation()).toBe(true);
    expect(modifyRate).toHaveBeenCalledTimes(1);
    expect(modifyRate).toHaveBeenLastCalledWith(50, 'Space storage transfer', 'project');

    project.updateShipOperation(1000);
    expect(modifyRate).toHaveBeenCalledTimes(2);
    expect(modifyRate).toHaveBeenLastCalledWith(50, 'Space storage transfer', 'project');

    project.updateShipOperation(project.shipOperationRemainingTime);
    expect(modifyRate).toHaveBeenCalledTimes(3);
    expect(modifyRate).toHaveBeenLastCalledWith(50, 'Space storage transfer', 'project');
    expect(project.shipOperationIsActive).toBe(false);
    expect(resources.colony.metal.value).toBe(500);
  });

  test('manual withdraw operations only mark rates on completion', () => {
    const ctx = setupContext();
    const { resources, modifyRate } = buildResources();
    ctx.resources = resources;

    const project = createProject(ctx);
    project.assignedSpaceships = 10;
    project.repeatCount = 5;
    project.shipOperationAutoStart = false;
    project.shipWithdrawMode = true;
    project.selectedResources = [{ category: 'colony', resource: 'metal' }];
    project.resourceUsage.metal = 500;
    project.usedStorage = 500;

    expect(project.startShipOperation()).toBe(true);
    expect(modifyRate).not.toHaveBeenCalled();

    project.updateShipOperation(1000);
    expect(modifyRate).not.toHaveBeenCalled();

    project.updateShipOperation(project.shipOperationRemainingTime);
    expect(modifyRate).toHaveBeenCalledTimes(1);
    expect(modifyRate).toHaveBeenLastCalledWith(50, 'Space storage transfer', 'project');
    expect(project.shipOperationIsActive).toBe(false);
    expect(resources.colony.metal.value).toBe(500);
  });
});
