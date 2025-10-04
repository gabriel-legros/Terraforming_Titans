const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceshipProject continuous progress UI', () => {
  test('displays Continuous or Stopped without progress bar', () => {
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
    ctx.resources = { colony: {}, special: {} };
    ctx.EffectableEntity = EffectableEntity;
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;', ctx);

    class DummySpaceshipProject extends ctx.Project {
      isContinuous() { return true; }
    }
    ctx.SpaceshipProject = DummySpaceshipProject;

    const config = {
      name: 'test',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: false,
      maxRepeatCount: 1,
      unlocked: true,
      attributes: {}
    };
    const project = new ctx.SpaceshipProject(config, 'test');

    ctx.projectManager = {
      projects: { test: project },
      isBooleanFlagSet: () => false,
      getProjectStatuses: () => Object.values({ test: project })
    };

    ctx.initializeProjectsUI();
    ctx.createProjectItem(project);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.autoStart = true;
    project.isActive = true;
    ctx.updateProjectUI('test');
    let btn = ctx.projectElements.test.progressButton;
    expect(btn.textContent).toBe('Continuous');
    expect(btn.style.background).toBe('rgb(76, 175, 80)');

    project.autoStart = false;
    project.isActive = true;
    ctx.updateProjectUI('test');
    btn = ctx.projectElements.test.progressButton;
    expect(btn.textContent).toBe('Stopped');
    expect(btn.style.background).toBe('rgb(244, 67, 54)');
  });
});
