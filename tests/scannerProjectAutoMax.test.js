const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('ScannerProject auto max', () => {
  const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
  const scannerCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'ScannerProject.js'), 'utf8');

  function createContext() {
    const ctx = { console, EffectableEntity };
    ctx.resources = {
      colony: {
        metal: { value: 0, decrease(){}, updateStorageCap(){} },
        electronics: { value: 0, decrease(){}, updateStorageCap(){} },
        energy: { value: 0, decrease(){}, updateStorageCap(){} },
        colonists: { value: 10000 }
      }
    };
    vm.createContext(ctx);
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    vm.runInContext(scannerCode + '; this.ScannerProject = ScannerProject;', ctx);
    global.resources = ctx.resources;
    return ctx;
  }

  test('build count follows colonist cap when auto max enabled', () => {
    const ctx = createContext();
    const config = {
      name: 'scan',
      category: 'infra',
      cost: {},
      duration: 1,
      description: '',
      repeatable: true,
      maxRepeatCount: 1000,
      unlocked: true,
      attributes: { scanner: {} }
    };
    const project = new ctx.ScannerProject(config, 'scan');
    project.update(0);
    expect(project.buildCount).toBe(1);
    ctx.resources.colony.colonists.value = 20000;
    project.update(0);
    expect(project.buildCount).toBe(2);
    project.autoMax = false;
    ctx.resources.colony.colonists.value = 30000;
    project.update(0);
    expect(project.buildCount).toBe(2);
  });
});

