const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');
const EffectableEntity = require('../src/js/effectable-entity.js');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
const workerBatchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'WorkerCapacityBatchProject.js'), 'utf8');
const scannerCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'ScannerProject.js'), 'utf8');
const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');

describe('ScannerProject UI update', () => {
  test('shows build count, cap and button steps', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="c"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    ctx.resources = {
      colony: {
        workers: { cap: 15000, displayName: 'Workers' },
        metal:{value:0,decrease(){},updateStorageCap(){}},
        electronics:{value:0,decrease(){},updateStorageCap(){}},
        energy:{value:0,decrease(){},updateStorageCap(){}}
      },
      underground: { ore: { value: 0, addDeposit(){} } }
    };
    ctx.oreScanner = { scanData:{ ore:{ currentScanningStrength:0 } }, adjustScanningStrength(){}, startScan(){} };

    vm.createContext(ctx);
    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    vm.runInContext(workerBatchCode + '; this.WorkerCapacityBatchProject = WorkerCapacityBatchProject;', ctx);
    vm.runInContext(scannerCode + '; this.ScannerProject = ScannerProject;', ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const project = new ctx.ScannerProject(ctx.projectParameters.satellite, 'sat');
    project.initializeScanner({ resources: { underground: { ore: { initialValue: 0, maxDeposits: 10, areaTotal: 100 } } } });
    const container = ctx.document.getElementById('c');
    project.renderUI(container);
    project.updateUI();

    expect(project.el.val.textContent).toBe('1');
    expect(project.el.max.textContent).toBe('2');
    expect(project.el.dVal.textContent).toBe('0');
    expect(project.el.dMax.textContent).toBe('10');
    expect(project.el.bPlus.textContent).toBe('+1');
    expect(project.el.bMinus.textContent).toBe('-1');

    project.el.bMul.click();
    project.updateUI();
    expect(project.el.bPlus.textContent).toBe('+10');
    expect(project.el.bMinus.textContent).toBe('-10');
  });
});
