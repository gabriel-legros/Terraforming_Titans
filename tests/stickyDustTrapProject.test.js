const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Sticky Dust Trap project', () => {
  test('generated from progress data', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const progressCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress-data.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(paramsCode + progressCode + '; this.projectParameters = projectParameters;', ctx);
    const project = ctx.projectParameters.sticky_dust_trap;
    expect(project).toBeDefined();
    expect(project.repeatable).toBe(true);
    expect(project.maxRepeatCount).toBe(1);
    expect(project.attributes.storySteps).toBeDefined();
    expect(project.attributes.storySteps.length).toBe(1);
  });
});
