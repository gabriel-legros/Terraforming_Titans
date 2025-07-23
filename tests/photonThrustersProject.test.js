const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Photon Thrusters project', () => {
  test('parameters define correct costs', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);
    const project = ctx.projectParameters.photonThrusters;
    expect(project).toBeDefined();
    expect(project.type).toBe('PhotonThrustersProject');
    expect(project.cost.colony.metal).toBe(500000);
    expect(project.cost.colony.components).toBe(100000);
    expect(project.cost.colony.electronics).toBe(15000);
  });

  test('class extends Project', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PhotonThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PhotonThrustersProject = PhotonThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);
    const config = ctx.projectParameters.photonThrusters;
    const proj = new ctx.PhotonThrustersProject(config, 'photonThrusters');
    expect(proj instanceof ctx.Project).toBe(true);
  });
});
