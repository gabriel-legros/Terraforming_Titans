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

  test('CargoRocketProject defines resource choice methods', () => {
    const ctx = { console };
    vm.createContext(ctx);

    const effCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    vm.runInContext(effCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'CargoRocketProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.CargoRocketProject = CargoRocketProject;', ctx);

    expect(typeof ctx.CargoRocketProject.prototype.getResourceChoiceGainCost).toBe('function');
    expect(typeof ctx.CargoRocketProject.prototype.applyResourceChoiceGain).toBe('function');
  });
});
