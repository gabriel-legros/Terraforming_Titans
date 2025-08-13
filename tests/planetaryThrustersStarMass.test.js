const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
const thrusterCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PlanetaryThrustersProject.js'), 'utf8');
const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');

describe('Planetary Thrusters star mass', () => {
  test('heliocentric Δv uses current star mass', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};

    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    vm.runInContext(thrusterCode + '; this.PlanetaryThrustersProject = PlanetaryThrustersProject;', ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const G = 6.67430e-11;
    const AU_IN_METERS = 1.496e11;
    const starMass = 2 * 1.989e30;
    ctx.terraforming = {
      celestialParameters: { mass: 1e22, radius: 1000, rotationPeriod: 10, distanceFromSun: 1, starMass }
    };
    ctx.resources = { colony: { energy: { value: 1e40, decrease(v){ this.value -= v; }, updateStorageCap(){} } } };

    const config = ctx.projectParameters.planetaryThruster;
    const project = new ctx.PlanetaryThrustersProject(config, 'thruster');
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    project.complete();

    project.el.distTarget.value = 2;
    project.calcMotionCost();

    const dvText = project.el.distDv.textContent;
    const actual = parseFloat(dvText.replace(/[^\d.-]/g, ''));
    const expected = Math.abs(Math.sqrt(G*starMass/(1*AU_IN_METERS)) - Math.sqrt(G*starMass/(2*AU_IN_METERS)));

    expect(actual).toBeCloseTo(expected, 3);
  });
});

