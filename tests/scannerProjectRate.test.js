const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('ScannerProject auto-start cost rate', () => {
  test('cost scales with build count', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projCode + '; this.Project = Project;', ctx);
    const scannerCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'ScannerProject.js'), 'utf8');
    vm.runInContext(scannerCode + '; this.ScannerProject = ScannerProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.resources = {
      colony: {
        metal: { value: 1000, modifyRate: jest.fn(), decrease(){}, updateStorageCap(){} },
        electronics: { value: 1000, modifyRate: jest.fn(), decrease(){}, updateStorageCap(){} },
        energy: { value: 3000000, modifyRate: jest.fn(), decrease(){}, updateStorageCap(){} },
        workers: { cap: 100000 }
      }
    };
    global.resources = ctx.resources;

    const config = ctx.projectParameters.satellite;
    const project = new ctx.ScannerProject(config, 'sat');
    project.unlocked = true;
    project.buildCount = 5;
    project.start(ctx.resources);
    project.autoStart = true;

    project.estimateCostAndGain();

    const rate = 1000 / config.duration;
    const expectedMetal = -50 * 5 * rate;
    const expectedElectronics = -10 * 5 * rate;
    const expectedEnergy = -500000 * 5 * rate;
    expect(ctx.resources.colony.metal.modifyRate).toHaveBeenCalled();
    expect(ctx.resources.colony.electronics.modifyRate).toHaveBeenCalled();
    expect(ctx.resources.colony.energy.modifyRate).toHaveBeenCalled();
    const mArgs = ctx.resources.colony.metal.modifyRate.mock.calls[0];
    const eArgs = ctx.resources.colony.electronics.modifyRate.mock.calls[0];
    const enArgs = ctx.resources.colony.energy.modifyRate.mock.calls[0];
    expect(mArgs[0]).toBeCloseTo(expectedMetal);
    expect(eArgs[0]).toBeCloseTo(expectedElectronics);
    expect(enArgs[0]).toBeCloseTo(expectedEnergy);
    expect(mArgs[1]).toBe('Ore satellite');
    expect(eArgs[1]).toBe('Ore satellite');
    expect(enArgs[1]).toBe('Ore satellite');
    expect(mArgs[2]).toBe('project');
    expect(eArgs[2]).toBe('project');
    expect(enArgs[2]).toBe('project');
  });
});
