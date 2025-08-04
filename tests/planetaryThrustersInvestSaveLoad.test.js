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

describe('Planetary Thrusters invest persistence', () => {
  function setup(){
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    ctx.terraforming = { celestialParameters: { mass: 6e24, radius: 6000, rotationPeriod: 24, distanceFromSun: 1 } };
    ctx.resources = { colony: { energy: { value: 0, decrease(){}, updateStorageCap(){} } } };
    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    vm.runInContext(thrusterCode + '; this.PlanetaryThrustersProject = PlanetaryThrustersProject;', ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);
    return { dom, ctx, config: ctx.projectParameters.planetaryThruster };
  }

  test('restores spin invest and targets after loading', () => {
    const { dom, ctx, config } = setup();
    const project = new ctx.PlanetaryThrustersProject(config, 'thruster');
    project.isCompleted = true;
    project.spinInvest = true;
    project.tgtDays = 2;
    project.tgtAU = 1.5;
    const state = project.saveState();

    const loaded = new ctx.PlanetaryThrustersProject(config, 'thruster');
    loaded.loadState(state);
    const container = dom.window.document.getElementById('container');
    loaded.renderUI(container);

    expect(loaded.el.spinCard.style.display).toBe('block');
    expect(loaded.el.rotCb.checked).toBe(true);
    expect(loaded.el.distCb.checked).toBe(false);
    expect(parseFloat(loaded.el.rotTarget.value)).toBeCloseTo(2);
    expect(parseFloat(loaded.el.distTarget.value)).toBeCloseTo(1.5);
  });

  test('restores motion invest after loading', () => {
    const { dom, ctx, config } = setup();
    const project = new ctx.PlanetaryThrustersProject(config, 'thruster');
    project.isCompleted = true;
    project.motionInvest = true;
    project.tgtDays = 1.2;
    project.tgtAU = 3;
    const state = project.saveState();

    const loaded = new ctx.PlanetaryThrustersProject(config, 'thruster');
    loaded.loadState(state);
    const container = dom.window.document.getElementById('container');
    loaded.renderUI(container);

    expect(loaded.el.motCard.style.display).toBe('block');
    expect(loaded.el.distCb.checked).toBe(true);
    expect(loaded.el.rotCb.checked).toBe(false);
    expect(parseFloat(loaded.el.rotTarget.value)).toBeCloseTo(1.2);
    expect(parseFloat(loaded.el.distTarget.value)).toBeCloseTo(3);
  });
});
