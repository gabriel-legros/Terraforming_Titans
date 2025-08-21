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
  test('separate categories persist and reset only on target change', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    ctx.terraforming = { celestialParameters: { mass: 1e22, radius: 1000, rotationPeriod: 10, distanceFromSun: 1 } };
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

    // accumulate spin energy
    project.power = 1;
    project.spinInvest = true;
    project.prepareJob(true, true);
    project.activeMode = 'spin';
    project.update(1000);
    project.applyCostAndGain(1000, null, 1);
    const spinEnergy = project.energySpentSpin;

    // switch to motion without resetting spin energy
    project.spinInvest = false;
    project.motionInvest = true;
    project.prepareJob(true, false);
    project.activeMode = 'motion';
    expect(project.energySpentSpin).toBe(spinEnergy);

    // changing spin target resets only spin energy
    project.el.rotTarget.value = parseFloat(project.el.rotTarget.value) + 1;
    project.calcSpinCost();
    expect(project.energySpentSpin).toBe(0);

    // accumulate motion energy
    project.update(1000);
    project.applyCostAndGain(1000, null, 1);
    const motionEnergy = project.energySpentMotion;

    // switch to spin without resetting motion energy
    project.motionInvest = false;
    project.spinInvest = true;
    project.prepareJob(true, false);
    project.activeMode = 'spin';
    expect(project.energySpentMotion).toBe(motionEnergy);

    // changing motion target resets only motion energy
    project.el.distTarget.value = parseFloat(project.el.distTarget.value) + 1;
    project.calcMotionCost();
    expect(project.energySpentMotion).toBe(0);
  });
});

