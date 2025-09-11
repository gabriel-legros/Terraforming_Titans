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

describe('Planetary Thrusters target clamping', () => {
  test('spin and motion do not overshoot their targets', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    ctx.currentPlanetParameters = { celestialParameters: { mass: 1e22, radius: 1000, rotationPeriod: 24, distanceFromSun: 1 } };
    global.currentPlanetParameters = ctx.currentPlanetParameters;
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

    // ---- spin ----
    project.el.rotTarget.value = 0.5; // 12 hour day
    project.calcSpinCost();
    project.power = 0; // ensure power computed after dVreq
    project.spinInvest = true;
    project.prepareJob(true, true);
    project.activeMode = 'spin';

    const p = ctx.currentPlanetParameters.celestialParameters;
    const requiredPower = project.dVreq * p.mass / (project.getThrustPowerRatio() * 86400);
    project.power = requiredPower * 2; // overshoot in one tick
    project.update(1000);
    project.applyCostAndGain(1000, null, 1);
    expect(p.rotationPeriod).toBeCloseTo(project.tgtDays * 24, 10);
    expect(project.spinInvest).toBe(false);

    // reset energy for motion section
    project.power = 0;
    project.motionInvest = true;
    project.spinInvest = false;
    project.el.distTarget.value = 2;
    project.calcMotionCost();
    project.prepareJob(true, true);
    project.activeMode = 'motion';

    const requiredPowerM = project.dVreq * p.mass / (project.getThrustPowerRatio() * 86400);
    project.power = requiredPowerM * 2;
    project.update(1000);
    project.applyCostAndGain(1000, null, 1);
    expect(p.distanceFromSun).toBeCloseTo(project.tgtAU, 10);
    expect(project.motionInvest).toBe(false);
  });
});

