const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Space export assigned ships display', () => {
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
      uiCode +
        '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;',
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

  test('Assigned display shows current and max ships', () => {
    const ctx = setupContext();
    ctx.resources = {
      colony: { metal: { displayName: 'Metal', value: 0, increase() {}, decrease() {} } },
      special: { spaceships: { value: 1000 } },
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

    project.assignSpaceships(150);
    ctx.updateProjectUI('export');

    const assignedText = ctx.projectElements.export.assignedSpaceshipsDisplay.textContent;
    const maxShips = project.getMaxAssignableShips();
    expect(assignedText).toBe(`${150}/${maxShips}`);
  });
});

