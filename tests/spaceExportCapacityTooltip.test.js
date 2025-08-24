const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Space export max capacity tooltip', () => {
  function setupContext() {
    const dom = new JSDOM(
      `<!DOCTYPE html><div class="projects-subtab-content-wrapper"><div id="resources-projects-list" class="projects-list"></div></div>`,
      { runScripts: 'outside-only' }
    );
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
    ctx.formatNumber = n => n.toString();
    ctx.formatBigInteger = n => n.toString();
    ctx.toDisplayTemperature = x => x;
    ctx.getTemperatureUnit = () => 'K';
    ctx.gameSettings = { useCelsius: false };
    ctx.projectElements = {};
    ctx.shipEfficiency = 1;
    ctx.EffectableEntity = EffectableEntity;
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(
      uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;',
      ctx
    );

    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const exportBase = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceExportBaseProject.js'), 'utf8');
    vm.runInContext(exportBase + '; this.SpaceExportBaseProject = SpaceExportBaseProject;', ctx);
    const exportCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceExportProject.js'), 'utf8');
    vm.runInContext(exportCode + '; this.SpaceExportProject = SpaceExportProject;', ctx);
    return ctx;
  }

  test('Max export capacity line includes tooltip', () => {
    const ctx = setupContext();
    ctx.resources = {
      colony: { metal: { displayName: 'Metal', value: 0, increase() {}, decrease() {} } },
      special: { spaceships: { value: 0 } },
    };

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
        defaultDisposal: { category: 'colony', resource: 'metal' },
      },
    };

    const project = new ctx.SpaceExportProject(config, 'export');
    ctx.projectManager = {
      projects: { export: project },
      isBooleanFlagSet: () => false,
      getProjectStatuses: () => Object.values({ export: project }),
    };

    ctx.initializeProjectsUI();
    ctx.createProjectItem(project);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    ctx.updateProjectUI('export');
    const element = ctx.projectElements.export.maxDisposalElement;
    const tooltip = element.querySelector('.info-tooltip-icon');
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toBe('\u24D8');
    expect(tooltip.getAttribute('title')).toBe(
      'Earth is not interested in purchasing more metal than about 2 order of magnitude its 2025 yearly metal production.  This value may change as you progress further into the game.'
    );
    const textSpan = element.querySelector('span:not(.info-tooltip-icon)');
    expect(textSpan).not.toBeNull();
    expect(textSpan.textContent).toBe('Max Export Capacity: 1000000000 /s');
    expect(element.children[1]).toBe(tooltip);
  });
});
