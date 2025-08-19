const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Space export and disposal continuous total export UI', () => {
  function setupContext() {
    const dom = new JSDOM(`<!DOCTYPE html><div class="projects-subtab-content-wrapper"><div id="resources-projects-list" class="projects-list"></div></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
    ctx.formatNumber = n => n.toString();
    ctx.formatBigInteger = n => n.toString();
    ctx.projectElements = {};
    ctx.shipEfficiency = 1;
    ctx.EffectableEntity = EffectableEntity;
    ctx.toDisplayTemperature = x => x;
    ctx.getTemperatureUnit = () => 'K';
    ctx.gameSettings = { useCelsius: false };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const exportBase = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceExportBaseProject.js'), 'utf8');
    vm.runInContext(exportBase + '; this.SpaceExportBaseProject = SpaceExportBaseProject;', ctx);
    return ctx;
  }

  test('SpaceDisposalProject shows per-second total export', () => {
    const ctx = setupContext();
    ctx.resources = {
      surface: { liquidWater: { displayName: 'Water', value: 0, increase() {}, decrease() {} } },
      colony: { metal: { value: 0, increase() {}, decrease() {} } },
      special: { spaceships: { value: 200 } },
      atmospheric: {}
    };
    const disposalSubclass = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceDisposalProject.js'), 'utf8');
    vm.runInContext(disposalSubclass + '; this.SpaceDisposalProject = SpaceDisposalProject;', ctx);

    const config = {
      name: 'dispose',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: false,
      maxRepeatCount: 1,
      unlocked: true,
      attributes: {
        spaceExport: true,
        disposalAmount: 1000,
        disposable: { surface: ['liquidWater'] },
        defaultDisposal: { category: 'surface', resource: 'liquidWater' }
      }
    };
    const project = new ctx.SpaceDisposalProject(config, 'dispose');
    ctx.projectManager = { projects: { dispose: project }, isBooleanFlagSet: () => false, getProjectStatuses: () => Object.values({ dispose: project }) };
    ctx.initializeProjectsUI();
    ctx.createProjectItem(project);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.assignSpaceships(150);
    ctx.updateProjectUI('dispose');
    const text = ctx.projectElements.dispose.totalDisposalElement.textContent;
    expect(text).toBe('Total Export: 150000/s');
  });

  test('SpaceExportProject shows per-second total export', () => {
    const ctx = setupContext();
    ctx.resources = {
      colony: { metal: { displayName: 'Metal', value: 0, increase() {}, decrease() {} } },
      special: { spaceships: { value: 200 } }
    };
    const exportSubclass = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceExportProject.js'), 'utf8');
    vm.runInContext(exportSubclass + '; this.SpaceExportProject = SpaceExportProject;', ctx);

    const config = {
      name: 'export',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: false,
      maxRepeatCount: 1,
      unlocked: true,
      attributes: {
        spaceExport: true,
        disposalAmount: 1000,
        disposable: { colony: ['metal'] },
        defaultDisposal: { category: 'colony', resource: 'metal' }
      }
    };
    const project = new ctx.SpaceExportProject(config, 'export');
    ctx.projectManager = { projects: { export: project }, isBooleanFlagSet: () => false, getProjectStatuses: () => Object.values({ export: project }) };
    ctx.initializeProjectsUI();
    ctx.createProjectItem(project);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.assignSpaceships(150);
    ctx.updateProjectUI('export');
    const text = ctx.projectElements.export.totalDisposalElement.textContent;
    expect(text).toBe('Total Export: 150000/s');
  });
});
