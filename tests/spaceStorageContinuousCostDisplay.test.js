const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceStorageProject continuous total cost UI', () => {
  test('shows per-second total cost', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div class="projects-subtab-content-wrapper"><div id="mega-projects-list" class="projects-list"></div></div>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
    ctx.formatNumber = n => n.toString();
    ctx.formatBigInteger = n => n.toString();
    ctx.projectElements = {};
    ctx.resources = {
      colony: { energy: { displayName: 'Energy', value: 0, decrease() {}, increase() {} } },
      surface: {},
      atmospheric: {},
      special: { spaceships: { value: 101 } }
    };
    ctx.spaceManager = {
      getTerraformedPlanetCount: () => 0,
      getTerraformedPlanetCountIncludingCurrent: () => 1
    };
    ctx.EffectableEntity = EffectableEntity;
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);
    const storageUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'spaceStorageUI.js'), 'utf8');
    vm.runInContext(storageUICode + '; this.renderSpaceStorageUI = renderSpaceStorageUI; this.updateSpaceStorageUI = updateSpaceStorageUI;', ctx);

    const attrs = { spaceStorage: true, costPerShip: { colony: { energy: 10 } }, transportPerShip: 1 };
    const params = { name: 'spaceStorage', category: 'mega', cost: {}, duration: 1000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    ctx.projectManager = { projects: { spaceStorage: project }, isBooleanFlagSet: () => false, getProjectStatuses: () => Object.values({ spaceStorage: project }) };

    ctx.initializeProjectsUI();
    ctx.createProjectItem(project);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.assignSpaceships(101);
    ctx.updateProjectUI('spaceStorage');

    const text = ctx.projectElements.spaceStorage.totalCostElement.textContent;
    expect(text).toBe('Total Cost: Energy: 1010/s');
  });
});
