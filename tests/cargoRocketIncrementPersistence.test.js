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
  vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;', ctx);
  const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
  vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

  ctx.projectManager = new ctx.ProjectManager();
  ctx.projectManager.initializeProjects({ cargo_rocket: ctx.projectParameters.cargo_rocket });
  ctx.projectManager.isBooleanFlagSet = () => false;

  ctx.initializeProjectsUI();
  ctx.projectElements = vm.runInContext('projectElements', ctx);
  return { dom, ctx };
}

describe('CargoRocketProject increment persistence', () => {
  test('saves and loads increment count', () => {
    const { ctx: ctx1 } = setup();
    const project1 = ctx1.projectManager.projects.cargo_rocket;
    ctx1.createProjectItem(project1);
    ctx1.projectElements = vm.runInContext('projectElements', ctx1);
    const headerButtons = Array.from(ctx1.projectElements.cargo_rocket.resourceSelectionContainer.querySelector('.cargo-grid-header').querySelectorAll('button'));
    const mulBtn = headerButtons.find(b => b.textContent === 'x10');
    mulBtn.click();
    expect(project1.selectionIncrement).toBe(10);
    const saved = project1.saveState();

    const { ctx: ctx2 } = setup();
    const project2 = ctx2.projectManager.projects.cargo_rocket;
    project2.loadState(saved);
    ctx2.createProjectItem(project2);
    ctx2.projectElements = vm.runInContext('projectElements', ctx2);
    const row = ctx2.projectElements.cargo_rocket.resourceSelectionContainer.querySelector('#cargo_rocket-colony-metal-row');
    const buttons = Array.from(row.querySelectorAll('button'));
    const minusBtn = buttons.find(b => b.textContent.startsWith('-'));
    const plusBtn = buttons.find(b => b.textContent.startsWith('+'));
    expect(minusBtn.textContent).toBe('-10');
    expect(plusBtn.textContent).toBe('+10');
    expect(project2.selectionIncrement).toBe(10);
  });
});

