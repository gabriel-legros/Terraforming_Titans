const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Project isContinuous default', () => {
  test('returns false for base Project', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(code + '; this.Project = Project;', ctx);
    const config = {
      name: 'Test',
      cost: {},
      duration: 1000,
      description: '',
      attributes: {},
      repeatable: false,
      unlocked: true,
      category: 'test',
    };
    const project = new ctx.Project(config, 'test');
    expect(typeof project.isContinuous).toBe('function');
    expect(project.isContinuous()).toBe(false);
  });
});
