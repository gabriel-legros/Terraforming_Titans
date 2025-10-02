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

describe('Planetary Thrusters orientation', () => {
  test('applies delta v toward the target', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    const celestial = { mass: 1e22, radius: 1000, rotationPeriod: 24, distanceFromSun: 1, starMass: 1.989e30 };
    ctx.currentPlanetParameters = { celestialParameters: celestial, star: { massSolar: 1 } };
    ctx.terraforming = { celestialParameters: celestial };
    ctx.resources = { colony: { energy: { value: 1e40, decrease(v){ this.value -= v; }, updateStorageCap(){} } } };
    global.currentPlanetParameters = ctx.currentPlanetParameters;
    global.terraforming = ctx.terraforming;
    global.resources = ctx.resources;

    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    vm.runInContext(thrusterCode + '; this.PlanetaryThrustersProject = PlanetaryThrustersProject;', ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const project = new ctx.PlanetaryThrustersProject(ctx.projectParameters.planetaryThruster, 'thruster');
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    project.complete();
    const p = ctx.currentPlanetParameters.celestialParameters;

    // spin orientation
    project.el.rotTarget.value = 0.5; // 12 hour day
    project.calcSpinCost();
    project.spinInvest = true;
    project.prepareJob(true, true);
    project.activeMode = 'spin';
    p.rotationPeriod = 6; // overshoot to 6 hours before update
    const requiredPower = project.dVreq * p.mass / (project.getThrustPowerRatio() * 86400);
    project.power = requiredPower / 10;
    project.update(1000);
    project.applyCostAndGain(1000, null, 1);
    expect(p.rotationPeriod).toBeGreaterThan(6);

    // motion orientation
    project.power = 0;
    project.motionInvest = true;
    project.spinInvest = false;
    project.el.distTarget.value = 2; // target higher orbit
    project.calcMotionCost();
    project.prepareJob(true, true);
    project.activeMode = 'motion';
    project.startAU = 3; // flip orientation if using startAU
    const requiredPowerM = project.dVreq * p.mass / (project.getThrustPowerRatio() * 86400);
    project.power = requiredPowerM / 10;
    project.update(1000);
    project.applyCostAndGain(1000, null, 1);
    expect(p.distanceFromSun).toBeGreaterThan(1);
  });

  afterEach(() => {
    delete global.resources;
    delete global.currentPlanetParameters;
    delete global.terraforming;
  });
});
