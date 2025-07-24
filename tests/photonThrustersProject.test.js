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

  test('rendered subcards display orbital data', () => {
    const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = require('../src/js/numbers.js').formatNumber;
    ctx.projectElements = {};
    ctx.terraforming = { celestialParameters: { distanceFromSun: 1, parentBody: { name: 'Mars', orbitRadius: 50000 } } };
    ctx.EffectableEntity = EffectableEntity;

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PhotonThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PhotonThrustersProject = PhotonThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.photonThrusters;
    const project = new ctx.PhotonThrustersProject(config, 'photonThrusters');
    project.isCompleted = true;
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.updateUI();

    const spin = ctx.projectElements.photonThrusters.spin;
    const motion = ctx.projectElements.photonThrusters.motion;
    const spinCard = ctx.projectElements.photonThrusters.spinCard;
    const motionCard = ctx.projectElements.photonThrusters.motionCard;
    expect(spinCard.style.display).toBe('block');
    expect(motionCard.style.display).toBe('block');
    expect(spin.orbitalPeriod.textContent).toContain('365.25');
    expect(spin.target.textContent).toBe('1 day');
    expect(motion.distanceSun.textContent).toBe('1.00 AU');
    expect(motion.parentContainer.style.display).toBe('block');
    expect(motion.parentName.textContent).toBe('Mars');
  });

  test('hides parent info when no parent body', () => {
    const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = require('../src/js/numbers.js').formatNumber;
    ctx.projectElements = {};
    ctx.terraforming = { celestialParameters: { distanceFromSun: 2 } };
    ctx.EffectableEntity = EffectableEntity;

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PhotonThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PhotonThrustersProject = PhotonThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.photonThrusters;
    const project = new ctx.PhotonThrustersProject(config, 'photonThrusters');
    project.isCompleted = true;
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.updateUI();

    const motion = ctx.projectElements.photonThrusters.motion;
    expect(motion.distanceSun.textContent).toBe('2.00 AU');
    expect(motion.parentContainer.style.display).toBe('none');
  });

  test('subcards hidden until project complete', () => {
    const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = require('../src/js/numbers.js').formatNumber;
    ctx.projectElements = {};
    ctx.terraforming = { celestialParameters: { distanceFromSun: 1 } };
    ctx.EffectableEntity = EffectableEntity;

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PhotonThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PhotonThrustersProject = PhotonThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.photonThrusters;
    const project = new ctx.PhotonThrustersProject(config, 'photonThrusters');
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.updateUI();

    const spinCard = ctx.projectElements.photonThrusters.spinCard;
    const motionCard = ctx.projectElements.photonThrusters.motionCard;
    expect(spinCard.style.display).toBe('none');
    expect(motionCard.style.display).toBe('none');

    project.isCompleted = true;
    project.updateUI();
    expect(spinCard.style.display).toBe('block');
    expect(motionCard.style.display).toBe('block');
  });

  test('orbital period uses parent mass for moons', () => {
    const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = require('../src/js/numbers.js').formatNumber;
    ctx.projectElements = {};
    ctx.terraforming = { celestialParameters: { distanceFromSun: 5.2, parentBody: { name: 'Jupiter', mass: 1.898e27, orbitRadius: 1882700 } } };
    ctx.EffectableEntity = EffectableEntity;

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PhotonThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PhotonThrustersProject = PhotonThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.photonThrusters;
    const project = new ctx.PhotonThrustersProject(config, 'photonThrusters');
    project.isCompleted = true;
    const container = dom.window.document.getElementById('container');
    project.renderUI(container);
    ctx.projectElements = vm.runInContext('projectElements', ctx);

    project.updateUI();

    const spin = ctx.projectElements.photonThrusters.spin;
    const value = parseFloat(spin.orbitalPeriod.textContent);
    expect(value).toBeCloseTo(16.7, 1);
  });
});
