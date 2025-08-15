const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Dyson Swarm Receiver project', () => {
  test('defined in parameters', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);
    const project = ctx.projectParameters.dysonSwarmReceiver;
    expect(project).toBeDefined();
    expect(project.type).toBe('DysonSwarmReceiverProject');
    expect(project.category).toBe('mega');
    expect(project.cost.colony.metal).toBe(10000000);
    expect(project.duration).toBe(300000);
    expect(project.treatAsBuilding).toBe(true);
  });
});
