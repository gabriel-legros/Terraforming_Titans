const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('Cargo Rocket project UI', () => {
  test('creates resource shop elements on render', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="projects-subtab-content-wrapper">
        <div id="resources-projects-list" class="projects-list"></div>
      </div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatBigInteger = numbers.formatBigInteger;
    ctx.projectElements = {};
    ctx.resources = {
      colony: {
        funding: { value: 0, displayName: 'Funding', unlocked: true },
        metal: { value: 0, displayName: 'Metal', unlocked: true },
        glass: { value: 0, displayName: 'Glass', unlocked: true },
        water: { value: 0, displayName: 'Water', unlocked: true },
        food: { value: 0, displayName: 'Food', unlocked: true },
        components: { value: 0, displayName: 'Components', unlocked: true },
        electronics: { value: 0, displayName: 'Electronics', unlocked: true },
        androids: { value: 0, displayName: 'Androids', unlocked: true }
      },
      special: {
        spaceships: { value: 0, displayName: 'Spaceships', unlocked: true }
      }
    };
    ctx.buildings = {};
    ctx.terraforming = {};

    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'CargoRocketProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.CargoRocketProject = CargoRocketProject;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.projectManager = new ctx.ProjectManager();
    ctx.projectManager.initializeProjects({ cargo_rocket: ctx.projectParameters.cargo_rocket });
    ctx.projectManager.isBooleanFlagSet = () => false;

    ctx.initializeProjectsUI();
    ctx.projectElements = vm.runInContext('projectElements', ctx);
    ctx.createProjectItem(ctx.projectManager.projects.cargo_rocket);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    const elements = ctx.projectElements.cargo_rocket;
    expect(elements.resourceSelectionContainer).toBeDefined();
    const display = elements.resourceSelectionContainer.querySelector('#cargo_rocket-total-cost-display');
    expect(display).not.toBeNull();
    const value = display.querySelector('#cargo_rocket-total-cost-display-value');
    expect(value).not.toBeNull();

    const metalInput = elements.resourceSelectionContainer.querySelector('.resource-selection-cargo_rocket[data-resource="metal"]');
    metalInput.value = 2;
    ctx.updateProjectUI('cargo_rocket');
    expect(value.textContent).toBe(numbers.formatNumber(4, true));
    expect(value.style.color).toBe('red');
    ctx.resources.colony.funding.value = 100;
    ctx.updateProjectUI('cargo_rocket');
    expect(value.style.color).toBe('');
  });

  test('unparsable input defaults to zero', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="projects-subtab-content-wrapper">
        <div id="resources-projects-list" class="projects-list"></div>
      </div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatBigInteger = numbers.formatBigInteger;
    ctx.projectElements = {};
    ctx.resources = {
      colony: {
        funding: { value: 100, displayName: 'Funding', unlocked: true },
        metal: { value: 0, displayName: 'Metal', unlocked: true },
        glass: { value: 0, displayName: 'Glass', unlocked: true },
        water: { value: 0, displayName: 'Water', unlocked: true },
        food: { value: 0, displayName: 'Food', unlocked: true },
        components: { value: 0, displayName: 'Components', unlocked: true },
        electronics: { value: 0, displayName: 'Electronics', unlocked: true },
        androids: { value: 0, displayName: 'Androids', unlocked: true }
      },
      special: {
        spaceships: { value: 0, displayName: 'Spaceships', unlocked: true }
      }
    };
    ctx.buildings = {};
    ctx.terraforming = {};

    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'CargoRocketProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.CargoRocketProject = CargoRocketProject;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.projectManager = new ctx.ProjectManager();
    ctx.projectManager.initializeProjects({ cargo_rocket: ctx.projectParameters.cargo_rocket });
    ctx.projectManager.isBooleanFlagSet = () => false;

    ctx.initializeProjectsUI();
    ctx.projectElements = vm.runInContext('projectElements', ctx);
    ctx.createProjectItem(ctx.projectManager.projects.cargo_rocket);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    const elements = ctx.projectElements.cargo_rocket;
    const valueNode = elements.resourceSelectionContainer
      .querySelector('#cargo_rocket-total-cost-display-value');
    const metalInput = elements.resourceSelectionContainer
      .querySelector('.resource-selection-cargo_rocket[data-resource="metal"]');

    metalInput.value = 'abc';
    ctx.updateProjectUI('cargo_rocket');

    expect(ctx.projectManager.projects.cargo_rocket.selectedResources).toEqual([]);
    expect(valueNode.textContent).toBe(numbers.formatNumber(0, true).toString());
    expect(valueNode.style.color).toBe('');
  });

  test('spaceship tooltip icon sits immediately after text', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <head></head>
      <body>
        <div class="projects-subtab-content-wrapper">
          <div id="resources-projects-list" class="projects-list"></div>
        </div>
      </body>`, { runScripts: 'outside-only' });
    const style = dom.window.document.createElement('style');
    style.textContent = fs.readFileSync(path.join(__dirname, '..', 'src/css', 'projects.css'), 'utf8');
    dom.window.document.head.appendChild(style);

    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatBigInteger = numbers.formatBigInteger;
    ctx.projectElements = {};
    ctx.resources = {
      colony: {
        funding: { value: 0, displayName: 'Funding', unlocked: true },
        metal: { value: 0, displayName: 'Metal', unlocked: true },
        glass: { value: 0, displayName: 'Glass', unlocked: true },
        water: { value: 0, displayName: 'Water', unlocked: true },
        food: { value: 0, displayName: 'Food', unlocked: true },
        components: { value: 0, displayName: 'Components', unlocked: true },
        electronics: { value: 0, displayName: 'Electronics', unlocked: true },
        androids: { value: 0, displayName: 'Androids', unlocked: true }
      },
      special: { spaceships: { value: 0, displayName: 'Spaceships', unlocked: true } }
    };
    ctx.buildings = {};
    ctx.terraforming = {};

    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'CargoRocketProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.CargoRocketProject = CargoRocketProject;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.projectManager = new ctx.ProjectManager();
    ctx.projectManager.initializeProjects({ cargo_rocket: ctx.projectParameters.cargo_rocket });
    ctx.projectManager.isBooleanFlagSet = () => false;

    ctx.initializeProjectsUI();
    ctx.projectElements = vm.runInContext('projectElements', ctx);
    ctx.createProjectItem(ctx.projectManager.projects.cargo_rocket);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    const label = ctx.projectElements.cargo_rocket.resourceSelectionContainer
      .querySelector('#cargo_rocket-special-spaceships-row .cargo-resource-label');
    const icon = label.querySelector('.info-tooltip-icon');
    expect(icon).not.toBeNull();
    const computed = dom.window.getComputedStyle(label);
    expect(computed.display).toBe('flex');
    expect(label.firstChild.textContent.trim()).toBe('Spaceships');
    expect(label.lastElementChild).toBe(icon);
  });
});
