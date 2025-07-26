const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('ScannerProject persistence', () => {
  test('saveState and loadState preserve build count', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const scannerCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'ScannerProject.js'), 'utf8');
    vm.runInContext(scannerCode + '; this.ScannerProject = ScannerProject;', ctx);

    const config = { name: 'scan', category: 'infra', cost: {}, duration: 1, description: '', repeatable: true, maxRepeatCount: 100, unlocked: true };
    const project = new ctx.ScannerProject(config, 'scan');
    project.buildCount = 5;
    project.step = 10;
    project.activeBuildCount = 3;

    const saved = project.saveState();
    const loaded = new ctx.ScannerProject(config, 'scan');
    loaded.loadState(saved);

    expect(loaded.buildCount).toBe(5);
    expect(loaded.step).toBe(10);
    expect(loaded.activeBuildCount).toBe(3);
  });
});
