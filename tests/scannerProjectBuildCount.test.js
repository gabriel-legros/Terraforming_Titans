const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('ScannerProject build count', () => {
  const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
  const scannerCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'ScannerProject.js'), 'utf8');

  function createContext() {
    const ctx = { console, EffectableEntity };
    ctx.resources = {
      colony: {
        metal: { value: 1000, decrease(v){ this.value -= v; }, updateStorageCap(){} },
        electronics: { value: 1000, decrease(){}, updateStorageCap(){} },
        energy: { value: 1000000, decrease(){}, updateStorageCap(){} },
        colonists: { value: 100000 }
      }
    };
    ctx.oreScanner = {
      scanData: { ore: { currentScanningStrength: 0 } },
      adjustScanningStrength: jest.fn((t,v)=>{ ctx.oreScanner.scanData[t].currentScanningStrength = v; }),
      startScan: jest.fn()
    };
    vm.createContext(ctx);
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    vm.runInContext(scannerCode + '; this.ScannerProject = ScannerProject;', ctx);
    global.resources = ctx.resources;
    global.oreScanner = ctx.oreScanner;
    return ctx;
  }

  test('cost scales with build count and completions increase', () => {
    const ctx = createContext();
    const config = {
      name: 'scan',
      category: 'infra',
      cost: { colony: { metal: 50 } },
      duration: 1,
      description: '',
      repeatable: true,
      maxRepeatCount: 1000,
      unlocked: true,
      attributes: { scanner: { canSearchForDeposits: true, searchValue: 0.1, depositType: 'ore' } }
    };
    const project = new ctx.ScannerProject(config, 'scan');
    project.buildCount = 5;
    expect(project.getScaledCost().colony.metal).toBe(250);
    project.start(ctx.resources);
    expect(ctx.resources.colony.metal.value).toBe(750);
    project.complete();
    expect(project.repeatCount).toBe(5);
    expect(ctx.oreScanner.adjustScanningStrength).toHaveBeenCalledTimes(5);
  });

  test('build count cropped by colonists and remaining repeats', () => {
    const ctx = createContext();
    ctx.resources.colony.colonists.value = 5000; // limit 1
    const config = {
      name: 'scan',
      category: 'infra',
      cost: { colony: { metal: 50 } },
      duration: 1,
      description: '',
      repeatable: true,
      maxRepeatCount: 3,
      unlocked: true,
      attributes: { scanner: { canSearchForDeposits: true, searchValue: 0.1, depositType: 'ore' } }
    };
    const project = new ctx.ScannerProject(config, 'scan');
    project.repeatCount = 2;
    project.buildCount = 5;
    expect(project.getScaledCost().colony.metal).toBe(50); // only one allowed
    project.start(ctx.resources);
    project.complete();
    expect(project.repeatCount).toBe(3);
    expect(ctx.oreScanner.adjustScanningStrength).toHaveBeenCalledTimes(1);
  });
});
