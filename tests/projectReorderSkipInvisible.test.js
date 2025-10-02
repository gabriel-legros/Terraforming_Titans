const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('project reorder ignores invisible projects', () => {
  test('arrows disabled only based on visible projects', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div class="projects-subtab-content-wrapper"><div id="resources-projects-list" class="projects-list"></div></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.window = dom.window;
    ctx.console = console;
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
    ctx.formatNumber = () => '';
    ctx.EffectableEntity = EffectableEntity;
    ctx.SpaceMiningProject = function(){};
    ctx.SpaceExportBaseProject = function(){};
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(projectsCode + uiCode + '; this.EffectableEntity = EffectableEntity; this.ProjectManager = ProjectManager; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.projectElements = projectElements;', ctx);

    ctx.projectManager = new ctx.ProjectManager();
    const baseProject = () => ({
      description: '',
      category: 'resources',
      cost: {},
      attributes: {},
      isActive: false,
      isCompleted: false,
      isPaused: false,
      duration: 100,
      getEffectiveDuration() { return this.duration; },
      canStart() { return true; },
      getProgress() { return 0; },
      isContinuous() { return false; }
    });

    ctx.projectManager.projects = {
      A: { name: 'A', displayName: 'A', unlocked: true, ...baseProject() },
      B: { name: 'B', displayName: 'B', unlocked: false, isVisible: () => false, ...baseProject() },
      C: { name: 'C', displayName: 'C', unlocked: true, ...baseProject() }
    };
    ctx.projectManager.projectOrder = ['A', 'B', 'C'];

    ctx.createProjectItem(ctx.projectManager.projects.A);
    ctx.createProjectItem(ctx.projectManager.projects.B);
    ctx.createProjectItem(ctx.projectManager.projects.C);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    ctx.updateProjectUI('A');
    ctx.updateProjectUI('B');
    ctx.updateProjectUI('C');

    const upA = ctx.projectElements.A.upButton;
    const downC = ctx.projectElements.C.downButton;

    expect(upA.classList.contains('disabled')).toBe(true);
    expect(downC.classList.contains('disabled')).toBe(true);
  });
});
