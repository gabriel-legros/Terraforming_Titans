const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('ScannerProject scanning effect', () => {
  test('satellite projects use ScannerProject type', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.projectParameters = projectParameters;', ctx);
    expect(ctx.projectParameters.satellite.type).toBe('ScannerProject');
    expect(ctx.projectParameters.geo_satellite.type).toBe('ScannerProject');
  });

  test('applyScannerEffect increases strength and starts scan', () => {
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    const scannerCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'ScannerProject.js'), 'utf8');
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    vm.runInContext(scannerCode + '; this.ScannerProject = ScannerProject;', ctx);



    const config = {
      name: 'scan',
      category: 'infra',
      cost: {},
      duration: 1,
      description: '',
      repeatable: false,
      unlocked: true,
      attributes: { scanner: { canSearchForDeposits: true, searchValue: 0.5, depositType: 'ore' } }
    };

    const project = new ctx.ScannerProject(config, 'scan');
    project.initializeScanner({ resources: { underground: { ore: { initialValue: 0, maxDeposits: 1, areaTotal: 100 } } } });
    project.complete();

    expect(project.scanData.ore.currentScanningStrength).toBeCloseTo(0.5);
    expect(project.scanData.ore.remainingTime).toBeGreaterThan(0);
  });
});
