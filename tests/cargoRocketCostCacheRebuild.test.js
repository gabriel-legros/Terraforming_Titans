const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

function setup() {
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

  return { ctx };
}

describe('Cargo Rocket total cost cache rebuild', () => {
  test('repopulates selectionInputs when empty before cost update', () => {
    const { ctx } = setup();
    const project = ctx.projectManager.projects.cargo_rocket;
    const elements = ctx.projectElements.cargo_rocket;
    const metalInput = elements.selectionInputs.find(i => i.dataset.resource === 'metal');
    metalInput.value = 2;

    elements.selectionInputs = [];
    ctx.updateProjectUI('cargo_rocket');

    expect(elements.totalCostValue.textContent).toBe(numbers.formatNumber(4, true));
    expect(elements.selectionInputs.length).toBeGreaterThan(0);
  });
});
