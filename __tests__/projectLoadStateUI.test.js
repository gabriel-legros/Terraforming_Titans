const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('ProjectManager loadState', () => {
  test('clears and rerenders project UI', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="resources-projects-list" class="projects-list"></div><div id="infrastructure-projects-list" class="projects-list"></div><div id="special-projects-list" class="projects-list"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.initializeProjectsUI = function() {
      dom.window.document.querySelectorAll('.projects-list').forEach(el => { el.innerHTML = ''; });
      ctx.projectElements = {};
    };

    ctx.renderProjects = function() {
      Object.values(ctx.projectManager.projects).forEach(p => {
        const div = dom.window.document.createElement('div');
        div.className = 'project-item';
        dom.window.document.getElementById('resources-projects-list').appendChild(div);
        ctx.projectElements[p.name] = div;
      });
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'effectable-entity.js'), 'utf8');
    vm.runInContext(code + '; this.EffectableEntity = EffectableEntity;', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project; this.projectElements = projectElements;', ctx);

    ctx.projectManager = new ctx.ProjectManager();
    const params = { test: { name: 'Test', duration: 1, description: '', cost: {}, category: 'resources', unlocked: true } };
    ctx.projectManager.initializeProjects(params);

    ctx.initializeProjectsUI();
    ctx.renderProjects();
    const container = dom.window.document.getElementById('resources-projects-list');
    expect(container.children.length).toBe(1);

    const state = { test: { isActive: false, isCompleted: false, remainingTime: 1, startingDuration: 1, repeatCount: 0 } };
    ctx.projectManager.loadState(state);

    expect(container.children.length).toBe(1);
  });
});
