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
    project.updateUI();

    expect(project.el.rotDv.textContent).not.toBe('—');
    expect(project.el.rotE.textContent).not.toBe('—');
    expect(project.el.distDv.textContent).not.toBe('—');
    expect(project.el.distE.textContent).not.toBe('—');
    expect(project.el.spinSpent.textContent).toBe('0');
    expect(project.el.motionSpent.textContent).toBe('0');
  });

  test('uses defaults when targets cleared', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.projectElements = {};
    ctx.terraforming = { celestialParameters: { mass: 6e24, radius: 6000, rotationPeriod: 30, distanceFromSun: 1.5 } };
    ctx.resources = { colony: { energy: { value: 0, decrease(){}, updateStorageCap(){} } } };

    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    vm.runInContext(thrusterCode + '; this.PlanetaryThrustersProject = PlanetaryThrustersProject;', ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.planetaryThruster;
    const project = new ctx.PlanetaryThrustersProject(config, 'thruster');
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    project.el.rotTarget.value = '';
    project.el.distTarget.value = '';
    project.updateUI();

    expect(project.tgtDays).toBe(1);
    expect(project.tgtAU).toBe(1);
    expect(project.el.rotDv.textContent).not.toBe('—');
    expect(project.el.distDv.textContent).not.toBe('—');
  });

  test('displays exhaust velocity and thrust to power ratio with tooltip', () => {
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
    const expectedTP = (2 / 1e5).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 }) + '\u202FN/W';
    expect(project.el.tpVal.textContent).toBe(expectedTP);
    const icons = project.el.pwrCard.querySelectorAll('.info-tooltip-icon');
    expect(icons.length).toBe(2);
    expect(icons[0].getAttribute('title')).toMatch(/Specific Impulse/i);
    expect(icons[1].getAttribute('title')).toMatch(/thrust-to-power ratio/i);
    const grid = project.el.pwrCard.querySelector('.stats-grid.four-col');
    expect(grid).not.toBeNull();
    expect(grid.children.length).toBe(4);
    const controlsCol = grid.children[1];
    expect(controlsCol.classList.contains('thruster-power-controls')).toBe(true);
    expect(grid.children[0].querySelector('.thruster-power-controls')).toBeNull();
  });

  test('hides target and spiral delta v when moon bound', () => {
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
    project.updateUI();

    expect(project.el.distTargetRow.style.display).toBe('none');
    expect(project.el.distDvRow.style.display).toBe('none');
    expect(project.el.escRow.style.display).toBe('block');
    expect(project.tgtAU).toBe(1);
  });
});
