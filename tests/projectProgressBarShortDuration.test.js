const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

// Ensure progress bars with very short durations don't show a flashing gradient

describe('short duration progress bar', () => {
  test('active project under one second uses solid color', () => {
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
    ctx.SpaceMiningProject = function(){};
    ctx.SpaceExportBaseProject = function(){};
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', ctx);

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;', ctx);

    ctx.projectManager = new ctx.ProjectManager();
    const config = {
      name: 'test',
      category: 'resources',
      cost: {},
      duration: 500,
      description: '',
      repeatable: false,
      maxRepeatCount: 1,
      unlocked: true,
      attributes: {}
    };
    const project = new ctx.Project(config, 'test');
    ctx.projectManager.projects.test = project;

    ctx.initializeProjectsUI();
    ctx.createProjectItem(project);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.isActive = true;
    project.startingDuration = 500;
    project.remainingTime = 250;

    ctx.updateProjectUI('test');
    const btn = ctx.projectElements.test.progressButton;
    expect(btn.style.background.includes('linear-gradient')).toBe(false);
    expect(btn.style.background).toBe('rgb(76, 175, 80)');
    expect(btn.textContent.includes('%')).toBe(false);
  });
});
