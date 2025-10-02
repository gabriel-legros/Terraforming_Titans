const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceshipProject continuous total gain UI', () => {
  test('shows per-second total gain', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div class="projects-subtab-content-wrapper"><div id="resources-projects-list" class="projects-list"></div></div>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
    ctx.formatNumber = n => n.toString();
    ctx.formatBigInteger = n => n.toString();
    ctx.projectElements = {};
    ctx.resources = {
      colony: {
        metal: { value: 0, increase() {}, decrease() {} },
      },
      special: { spaceships: { value: 101 } }
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
      attributes: { spaceMining: true, costPerShip: {}, resourceGainPerShip: { colony: { metal: 10000 } } }
    };
    const project = new ctx.SpaceshipProject(config, 'test');
    ctx.projectManager = { projects: { test: project }, isBooleanFlagSet: () => false, getProjectStatuses: () => Object.values({ test: project }) };

    ctx.initializeProjectsUI();
    ctx.createProjectItem(project);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.assignSpaceships(101);
    ctx.updateProjectUI('test');

    const text = ctx.projectElements.test.totalGainElement.textContent;
    expect(text).toBe('Total Gain: Metal: 1010000/s');
  });

  test('dynamic water import gain scales with ships', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div class="projects-subtab-content-wrapper"><div id="resources-projects-list" class="projects-list"></div></div>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
    ctx.formatNumber = n => n.toString();
    ctx.formatBigInteger = n => n.toString();
    ctx.projectElements = {};
    ctx.resources = {
      surface: {
        ice: { displayName: 'Ice', value: 0, increase() {}, decrease() {} }
      },
      special: { spaceships: { value: 200 } }
    };
    ctx.shipEfficiency = 1;
    ctx.terraforming = { temperature: { zones: { tropical: { value: 200 }, temperate: { value: 200 }, polar: { value: 200 } } }, zonalWater: { tropical: {}, temperate: {}, polar: {} } };
    ctx.EffectableEntity = EffectableEntity;
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const miningCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceMiningProject.js'), 'utf8');
    vm.runInContext(miningCode + '; this.SpaceMiningProject = SpaceMiningProject;', ctx);

    const config = {
      name: 'waterImport',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: false,
      maxRepeatCount: 1,
      unlocked: true,
      attributes: { spaceMining: true, dynamicWaterImport: true, costPerShip: {}, resourceGainPerShip: { surface: { ice: 10000 } } }
    };
    const project = new ctx.SpaceMiningProject(config, 'waterImport');
    ctx.projectManager = { projects: { waterImport: project }, isBooleanFlagSet: () => false, getProjectStatuses: () => Object.values({ waterImport: project }) };

    ctx.initializeProjectsUI();
    ctx.createProjectItem(project);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.assignSpaceships(200);
    ctx.updateProjectUI('waterImport');

    const text = ctx.projectElements.waterImport.totalGainElement.textContent;
    expect(text).toBe('Total Gain: Ice: 2000000/s');
  });
});
