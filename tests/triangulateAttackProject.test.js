const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Triangulate Attack Origin project', () => {
  test('generated from progress data', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const progressCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress-data.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(paramsCode + progressCode + '; this.projectParameters = projectParameters;', ctx);
    const project = ctx.projectParameters.triangulate_attack;
    expect(project).toBeDefined();
    expect(project.repeatable).toBe(true);
    expect(project.maxRepeatCount).toBe(5);
    expect(project.attributes.storySteps).toBeDefined();
    expect(project.attributes.storySteps.length).toBe(5);
  });
});
