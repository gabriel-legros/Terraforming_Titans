const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Cargo Rocket project', () => {
  test('parameters use CargoRocketProject type and have resource choices', () => {
    const paramsPath = path.join(__dirname, '..', 'src/js', 'project-parameters.js');
    const code = fs.readFileSync(paramsPath, 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.projectParameters = projectParameters;', ctx);
    const project = ctx.projectParameters.cargo_rocket;
    expect(project.type).toBe('CargoRocketProject');
    expect(project.repeatable).toBe(true);
    expect(project.attributes.resourceChoiceGainCost).toBeDefined();
  });
});
