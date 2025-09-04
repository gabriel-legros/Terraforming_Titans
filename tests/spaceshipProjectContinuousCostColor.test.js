const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

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

describe('Spaceship project continuous cost display', () => {
  test('turns red only after failed consumption', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div class="projects-subtab-content-wrapper"><div id="resources-projects-list" class="projects-list"></div></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = n => n.toString();
    ctx.formatBigInteger = n => n.toString();
    ctx.projectElements = {};
    ctx.resources = {
      colony: { energy: stubResource(2000) },
      special: { spaceships: stubResource(101) }
    };
    ctx.shipEfficiency = 1;
    ctx.EffectableEntity = EffectableEntity;
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);

    const config = {
      name: 'test',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: false,
      maxRepeatCount: 1,
      unlocked: true,
      attributes: { spaceMining: true, costPerShip: { colony: { energy: 10 } }, resourceGainPerShip: {} }
    };
    const project = new ctx.SpaceshipProject(config, 'test');
    ctx.projectManager = { projects: { test: project }, isBooleanFlagSet: () => false, getProjectStatuses: () => Object.values({ test: project }) };

    ctx.initializeProjectsUI();
    ctx.createProjectItem(project);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.assignSpaceships(101);
    project.start(ctx.resources);
    const element = ctx.projectElements.test.totalCostElement;

    project.update(1000);
    project.applyCostAndGain(1000);
    ctx.updateProjectUI('test');
    expect(element.innerHTML).not.toContain('<span style="color: red;">');

    ctx.resources.colony.energy.value = 0;
    project.update(1000);
    project.applyCostAndGain(1000);
    ctx.updateProjectUI('test');
    expect(element.innerHTML).toContain('<span style="color: red;">');
  });
});
