const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const { DayNightCycle, rotationPeriodToDuration } = require('../src/js/day-night-cycle.js');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
const thrusterCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PlanetaryThrustersProject.js'), 'utf8');
const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');

describe('Planetary Thrusters day-night cycle', () => {
  test('updates day-night cycle when spin changes', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    ctx.rotationPeriodToDuration = rotationPeriodToDuration;
    ctx.DayNightCycle = DayNightCycle;
    ctx.dayNightCycle = new DayNightCycle(rotationPeriodToDuration(20));
    ctx.dayNightCycle.elapsedTime = ctx.dayNightCycle.dayDuration * 5.25;
    ctx.dayNightCycle.update(0);
    const initialProgress = ctx.dayNightCycle.getDayProgress();
    ctx.terraforming = { celestialParameters: { mass: 1e22, radius: 1000, rotationPeriod: 20, distanceFromSun: 1 } };
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

    project.power = 1e20;
    project.el.rotTarget.value = 0.5;
    project.calcSpinCost();
    project.spinInvest = true;
    project.prepareJob(true, true);
    project.activeMode = 'spin';

    const initialDuration = ctx.dayNightCycle.dayDuration;
    project.update(10000000);
    project.applyCostAndGain(10000000, null, 1);
    const newPeriod = ctx.terraforming.celestialParameters.rotationPeriod;

    expect(newPeriod).not.toBe(20);
    expect(ctx.dayNightCycle.dayDuration).not.toBe(initialDuration);
    expect(ctx.dayNightCycle.dayDuration).toBeCloseTo(rotationPeriodToDuration(newPeriod), 5);
    expect(ctx.dayNightCycle.getDayProgress()).toBeCloseTo(initialProgress, 5);
  });
});

