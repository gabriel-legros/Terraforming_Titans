const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Space Storage project', () => {
  test('defined in parameters', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);
    const project = ctx.projectParameters.spaceStorage;
    expect(project).toBeDefined();
    expect(project.type).toBe('SpaceStorageProject');
    expect(project.category).toBe('mega');
    expect(project.cost.colony.metal).toBe(5000000);
    expect(project.duration).toBe(300000);
  });
});
