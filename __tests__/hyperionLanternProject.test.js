const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectPath = path.join(__dirname, '..', 'project-parameters.js');
const code = fs.readFileSync(projectPath, 'utf8');

describe('Hyperion Lantern project', () => {
  test('defined with correct cost and duration', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.projectParameters = projectParameters;', ctx);
    const project = ctx.projectParameters.hyperionLantern;
    expect(project).toBeDefined();
    expect(project.duration).toBe(300000);
    expect(project.cost.colony.components).toBe(1e9);
    expect(project.cost.colony.electronics).toBe(1e9);
    expect(project.cost.colony.metal).toBe(1e9);
    expect(project.cost.colony.glass).toBe(1e9);
    expect(project.attributes.investmentCost.colony.components).toBe(1e9);
    expect(project.attributes.investmentCost.colony.electronics).toBe(1e9);
    expect(project.attributes.powerPerInvestment).toBe(1e15);
  });
});
