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

describe('Planetary Thrusters UI', () => {
  test('shows default delta v and energy', () => {
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

    const config = ctx.projectParameters.planetaryThruster;
    const project = new ctx.PlanetaryThrustersProject(config, 'thruster');
    ctx.project = project;
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    ctx.projectElements = vm.runInContext('projectElements', ctx);
    vm.runInContext('project.calcSpinCost(); project.calcMotionCost();', ctx);
    project.updateUI();

    expect(project.el.rotDv.textContent).not.toBe('—');
    expect(project.el.rotE.textContent).not.toBe('—');
    expect(project.el.distDv.textContent).not.toBe('—');
    expect(project.el.distE.textContent).not.toBe('—');
  });

  test('displays exhaust velocity with tooltip', () => {
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

    const config = ctx.projectParameters.planetaryThruster;
    const project = new ctx.PlanetaryThrustersProject(config, 'thruster');
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    project.updateUI();

    const expectedVe = (1e5).toLocaleString() + '\u202Fm/s';
    expect(project.el.veVal.textContent).toBe(expectedVe);
    const icon = project.el.pwrCard.querySelector('.info-tooltip-icon');
    expect(icon).not.toBeNull();
    expect(icon.getAttribute('title')).toMatch(/Specific impulse/);
    const grid = project.el.pwrCard.querySelector('.stats-grid.two-col');
    expect(grid).not.toBeNull();
    expect(grid.children.length).toBe(2);
  });

  test('hides spiral delta v when moon bound', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    ctx.terraforming = { celestialParameters: { mass: 1e22, radius: 1000, rotationPeriod: 10, parentBody: { name: 'Planet', mass: 5e24, orbitRadius: 50000, distanceFromSun: 1 } } };
    ctx.resources = { colony: { energy: { value: 0, decrease(){}, updateStorageCap(){} } } };

    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    vm.runInContext(thrusterCode + '; this.PlanetaryThrustersProject = PlanetaryThrustersProject;', ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.planetaryThruster;
    const project = new ctx.PlanetaryThrustersProject(config, 'thrusterMoon');
    ctx.project = project;
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    ctx.projectElements = vm.runInContext('projectElements', ctx);
    vm.runInContext('project.calcMotionCost();', ctx);
    project.updateUI();

    expect(project.el.distDv.textContent).toBe('—');
    expect(project.el.escRow.style.display).toBe('block');
  });
});
