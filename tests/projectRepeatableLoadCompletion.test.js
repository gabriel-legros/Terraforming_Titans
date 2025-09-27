const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Project loadState repeatable completion handling', () => {
  test('clears completed flag if repeats remain', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);

    const config = { name: 'Test', category: 'resources', cost: {}, duration: 1, description: '', repeatable: true, maxRepeatCount: 3, unlocked: true };
    const project = new ctx.Project(config, 'test');

    project.loadState({ isActive: false, isPaused: false, isCompleted: true, remainingTime: 0, startingDuration: 1, repeatCount: 1, pendingResourceGains: [] });

    expect(project.isCompleted).toBe(false);
  });

  test('keeps completed flag when max repeats reached', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);

    const config = { name: 'Test', category: 'resources', cost: {}, duration: 1, description: '', repeatable: true, maxRepeatCount: 2, unlocked: true };
    const project = new ctx.Project(config, 'test');

    project.loadState({ isActive: false, isPaused: false, isCompleted: true, remainingTime: 0, startingDuration: 1, repeatCount: 2, pendingResourceGains: [] });

    expect(project.isCompleted).toBe(true);
  });
});
