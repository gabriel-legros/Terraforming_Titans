const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

function stubResource(value) {
  return {
    value,
    decrease(amount) { this.value = Math.max(this.value - amount, 0); },
    increase(amount) { this.value += amount; },
    modifyRate: () => {},
    displayName: '',
    unlocked: true
  };
}

describe('Cargo rocket continuous total cost display', () => {
  test('turns red only after failed consumption', () => {
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
        funding: stubResource(0),
        metal: stubResource(0),
        glass: stubResource(0),
        water: stubResource(0),
        food: stubResource(0),
        components: stubResource(0),
        electronics: stubResource(0),
        androids: stubResource(0)
      },
      special: {
        spaceships: stubResource(0)
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

    const project = ctx.projectManager.projects.cargo_rocket;
    project.addEffect({ type: 'booleanFlag', flagId: 'continuousTrading', value: true });

    const elements = ctx.projectElements.cargo_rocket;
    const metalInput = elements.resourceSelectionContainer.querySelector('.resource-selection-cargo_rocket[data-resource="metal"]');
    metalInput.value = 1;
    ctx.updateProjectUI('cargo_rocket');

    project.start(ctx.resources);
    project.autoStart = true;
    const value = elements.totalCostValue;
    expect(value.style.color).toBe('');

    project.applyCostAndGain(1000);
    ctx.updateProjectUI('cargo_rocket');
    expect(value.style.color).toBe('red');

    ctx.resources.colony.funding.value = 100;
    project.applyCostAndGain(1000);
    ctx.updateProjectUI('cargo_rocket');
    expect(value.style.color).toBe('');
  });
});
