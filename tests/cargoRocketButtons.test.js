const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('Cargo rocket quantity buttons', () => {
  test('adjust resource input values', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div class="projects-subtab-content-wrapper"><div id="resources-projects-list" class="projects-list"></div></div>`, { runScripts: 'outside-only' });
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
    const cargoCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'CargoRocketProject.js'), 'utf8');
    vm.runInContext(cargoCode + '; this.CargoRocketProject = CargoRocketProject;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements; this.updateTotalCostDisplay = updateTotalCostDisplay;', ctx);
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
    const row = elements.resourceSelectionContainer.querySelector('#cargo_rocket-colony-metal-row');
    const input = row.querySelector('input');
    const buttons = Array.from(row.querySelectorAll('button'));
    const zeroBtn = buttons.find(b => b.textContent === '0');
    const minusBtn = buttons.find(b => b.textContent === '-1');
    const plusBtn = buttons.find(b => b.textContent === '+1');
    const divBtn = buttons.find(b => b.textContent === '/10');
    const mulBtn = buttons.find(b => b.textContent === 'x10');

    input.value = 5;
    zeroBtn.click();
    expect(input.value).toBe('0');

    input.value = 5;
    minusBtn.click();
    expect(input.value).toBe('4');

    input.value = 0;
    minusBtn.click();
    expect(input.value).toBe('0');

    input.value = 5;
    plusBtn.click();
    expect(input.value).toBe('6');

    input.value = 50;
    divBtn.click();
    expect(input.value).toBe('5');

    input.value = 7;
    mulBtn.click();
    expect(input.value).toBe('70');
  });
});
