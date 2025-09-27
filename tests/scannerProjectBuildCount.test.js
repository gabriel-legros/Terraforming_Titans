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
        workers: { cap: 100000 }
      }
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
    project.initializeScanner({ resources: { underground: { ore: { initialValue: 0, maxDeposits: 1, areaTotal: 100 } } } });
    project.buildCount = 5;
    expect(project.getScaledCost().colony.metal).toBe(250);
    project.start(ctx.resources);
    expect(ctx.resources.colony.metal.value).toBe(750);
    project.complete();
    project.update(0);
    expect(project.repeatCount).toBe(5);
    expect(project.scanData.ore.currentScanningStrength).toBeCloseTo(0.5);
  });

  test('build count cropped by worker cap and remaining repeats', () => {
    const ctx = createContext();
    ctx.resources.colony.workers.cap = 5000; // limit 1
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
    project.initializeScanner({ resources: { underground: { ore: { initialValue: 0, maxDeposits: 1, areaTotal: 100 } } } });
    project.repeatCount = 2;
    project.buildCount = 5;
    expect(project.getScaledCost().colony.metal).toBe(50); // only one allowed
    project.start(ctx.resources);
    project.complete();
    project.update(0);
    expect(project.repeatCount).toBe(3);
    // Strength scales with repeat count regardless of worker cap
    expect(project.scanData.ore.currentScanningStrength).toBeCloseTo(0.3);
  });

  test('worker cap limit capped by max repeat count', () => {
    const ctx = createContext();
    ctx.resources.colony.workers.cap = 20000000; // would allow 4000
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
    expect(project.getWorkerCapLimit()).toBe(1000);
  });
});
