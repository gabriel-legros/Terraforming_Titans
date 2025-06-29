const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('Hyperion Lantern invest button', () => {
  test('shows glass cost and color reflects affordability', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="projects-subtab-content-wrapper">
        <div id="infrastructure-projects-list" class="projects-list"></div>
      </div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatBigInteger = numbers.formatBigInteger;
    ctx.projectElements = {};
    ctx.resources = { colony: { components: { value: 0 }, electronics: { value: 0 }, glass: { value: 0 } }, special: { spaceships: { value: 0 } } };
    ctx.buildings = { spaceMirror: { active: 0 } };
    ctx.terraforming = { calculateLanternFlux: () => 0 };

    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    const buildCountCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'buildCount.js'), 'utf8');
    vm.runInContext(buildCountCode + '; this.multiplyByTen = multiplyByTen; this.divideByTen = divideByTen;', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager;', ctx);
    const lanternSubclass = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'HyperionLanternProject.js'), 'utf8');
    vm.runInContext(lanternSubclass + '; this.HyperionLanternProject = HyperionLanternProject;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.projectManager = new ctx.ProjectManager();
    ctx.projectManager.initializeProjects({ hyperionLantern: ctx.projectParameters.hyperionLantern });
    ctx.projectManager.projects.hyperionLantern.isCompleted = true;
    ctx.projectManager.isBooleanFlagSet = () => false;

    ctx.initializeProjectsUI();
    ctx.projectElements = vm.runInContext('projectElements', ctx);
    ctx.createProjectItem(ctx.projectManager.projects.hyperionLantern);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    const investBtn = ctx.projectElements.hyperionLantern.lanternInvest;
    expect(investBtn.textContent).toMatch(/Glass/);
    expect(investBtn.style.color).toBe('red');

    ctx.resources.colony.components.value = 2e6;
    ctx.resources.colony.electronics.value = 2e6;
    ctx.resources.colony.glass.value = 2000;
    ctx.updateProjectUI('hyperionLantern');
    expect(investBtn.style.color).toBe('inherit');
  });
});
