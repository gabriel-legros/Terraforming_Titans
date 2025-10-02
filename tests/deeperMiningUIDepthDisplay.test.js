const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
const numbers = require('../src/js/numbers.js');

describe('Deeper mining depth display', () => {
  test('shows average depth and max depth', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div class="projects-subtab-content-wrapper"><div id="infrastructure-projects-list" class="projects-list"></div></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatBigInteger = numbers.formatBigInteger;
    ctx.projectElements = {};
    ctx.resources = { colony: { androids: { value: 0, displayName: 'Androids', unlocked: true } } };
    ctx.buildings = { oreMine: { count: 1 } };
    ctx.EffectableEntity = EffectableEntity;
    ctx.SpaceMiningProject = function(){};
    ctx.SpaceExportBaseProject = function(){};

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', ctx);
    const androidCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'AndroidProject.js'), 'utf8');
    vm.runInContext(androidCode + '; this.AndroidProject = AndroidProject;', ctx);
    const deeperCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'DeeperMiningProject.js'), 'utf8');
    vm.runInContext(deeperCode + '; this.DeeperMiningProject = DeeperMiningProject;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.initializeProjectsUI = initializeProjectsUI; this.projectElements = projectElements;', ctx);

    ctx.projectManager = new ctx.ProjectManager();
    const config = { name: 'deeperMining', category: 'infrastructure', cost: {}, duration: 1, description: '', repeatable: true, maxDepth: 5, unlocked: true, attributes: {} };
    const project = new ctx.DeeperMiningProject(config, 'deeperMining');
    ctx.projectManager.projects.deeperMining = project;

    ctx.initializeProjectsUI();
    ctx.createProjectItem(project);
    ctx.updateProjectUI('deeperMining');
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    expect(ctx.projectElements.deeperMining.repeatCountElement.textContent).toBe('Average depth: 1 / 5');
    project.averageDepth = 4;
    ctx.updateProjectUI('deeperMining');
    ctx.projectElements = vm.runInContext('projectElements', ctx);
    expect(ctx.projectElements.deeperMining.repeatCountElement.textContent).toBe('Average depth: 4 / 5');
  });
});
