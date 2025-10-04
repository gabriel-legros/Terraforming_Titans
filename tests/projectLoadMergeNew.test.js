const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('ProjectManager loadState adds new projects', () => {
  test('new projects appear after loading old save', () => {
    const ctx = { console, EffectableEntity, addEffect: () => {}, initializeProjectsUI: () => {}, renderProjects: () => {}, initializeProjectAlerts: () => {} };
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', ctx);

    const initialParams = { A: { name: 'A', category: 'resources', cost: {}, duration: 1, description: '', unlocked: true } };
    const manager1 = new ctx.ProjectManager();
    manager1.initializeProjects(initialParams);
    const saved = manager1.saveState();

    const newParams = { ...initialParams, B: { name: 'B', category: 'resources', cost: {}, duration: 1, description: '', unlocked: true } };
    const manager2 = new ctx.ProjectManager();
    manager2.initializeProjects(newParams);
    manager2.loadState(saved);

    expect(manager2.projectOrder).toEqual(['A', 'B']);
  });
});
