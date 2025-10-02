const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('CargoRocketProject continuous progress UI', () => {
  test('shows Continuous or Stopped and Run label', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="projects-subtab-content-wrapper">
        <div id="resources-projects-list" class="projects-list"></div>
      </div>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
    ctx.formatNumber = () => '';
    ctx.formatBigInteger = () => '';
    ctx.projectElements = {};
    ctx.resources = {
      colony: {
        funding: { value: 0 },
        metal: { value: 0, displayName: 'Metal', unlocked: true },
      },
      special: { spaceships: { value: 0, unlocked: true } },
    };
    ctx.EffectableEntity = EffectableEntity;
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const cargoCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'CargoRocketProject.js'), 'utf8');
    vm.runInContext(cargoCode + '; this.CargoRocketProject = CargoRocketProject;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;', ctx);

    const config = {
      name: 'cargo',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      maxRepeatCount: 1,
      unlocked: true,
      attributes: { resourceChoiceGainCost: { colony: { metal: 1 } } }
    };
    const project = new ctx.CargoRocketProject(config, 'cargo');

    ctx.projectManager = {
      projects: { cargo: project },
      isBooleanFlagSet: () => false,
      getProjectStatuses: () => Object.values({ cargo: project })
    };

    ctx.initializeProjectsUI();
    ctx.createProjectItem(project);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.addEffect({ type: 'booleanFlag', flagId: 'continuousTrading', value: true });
    project.autoStart = true;
    project.isActive = true;
    ctx.updateProjectUI('cargo');

    const elements = ctx.projectElements.cargo;
    expect(elements.autoStartLabel.textContent).toBe('Run');
    expect(elements.progressButton.textContent).toBe('Continuous');
    expect(elements.progressButton.style.background).toBe('rgb(76, 175, 80)');

    project.autoStart = false;
    ctx.updateProjectUI('cargo');
    expect(elements.progressButton.textContent).toBe('Stopped');
    expect(elements.progressButton.style.background).toBe('rgb(244, 67, 54)');
  });
});
