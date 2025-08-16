const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Orbital Ring project parameters', () => {
  test('defined correctly', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);
    const project = ctx.projectParameters.orbitalRing;
    expect(project).toBeDefined();
    expect(project.type).toBe('OrbitalRingProject');
    expect(project.category).toBe('mega');
    expect(project.cost.colony.metal).toBe(1_000_000_000_000_000);
    expect(project.duration).toBe(1800000);
    expect(project.repeatable).toBe(true);
    expect(project.attributes.canUseSpaceStorage).toBe(true);
  });
});
