const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');
const EffectableEntity = require('../src/js/effectable-entity.js');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
const thrusterCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PlanetaryThrustersProject.js'), 'utf8');
const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');

describe('Planetary Thrusters energy tracking', () => {
  test('tracks spin energy and resets motion energy after escape', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    ctx.terraforming = { celestialParameters: { mass: 1e22, radius: 1000, rotationPeriod: 10, parentBody: { name: 'Planet', mass: 5e24, orbitRadius: 1000, distanceFromSun: 1 } } };
    ctx.resources = { colony: { energy: { value: 1e40, decrease(v){ this.value -= v; }, updateStorageCap(){} } } };

    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    vm.runInContext(thrusterCode + '; this.PlanetaryThrustersProject = PlanetaryThrustersProject;', ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.planetaryThruster;
    const project = new ctx.PlanetaryThrustersProject(config, 'thruster');
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    project.complete();

    // spin energy
    project.power = 1;
    project.spinInvest = true;
    project.prepareJob();
    project.update(1000);
    expect(project.energySpentSpin).toBeGreaterThan(0);

    // motion energy and escape reset
    project.spinInvest = false;
    project.motionInvest = true;
    project.prepareJob();
    project.power = 1e21; // lower power so escape takes multiple ticks

    let hadEnergy = false;
    for(let i=0;i<200;i++){
      project.update(1_000_000); // sizeable timestep
      if(ctx.terraforming.celestialParameters.parentBody){
        if(project.energySpentMotion > 0) hadEnergy = true;
      } else {
        break;
      }
    }
    expect(hadEnergy).toBe(true);
    expect(ctx.terraforming.celestialParameters.parentBody).toBeUndefined();
    expect(project.energySpentMotion).toBe(0);
  });
});
