const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

function spinEnergyCost(mass, radius, currentHours, targetHours) {
  const I = 0.4 * mass * Math.pow(radius * 1000, 2);
  const w1 = (2 * Math.PI) / (currentHours * 3600);
  const w2 = (2 * Math.PI) / (targetHours * 3600);
  const deltaE = 0.5 * I * (w2 * w2 - w1 * w1);
  return Math.abs(deltaE) / 86400;
}

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

  test('rendered subcards display motion data', () => {
    const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = require('../src/js/numbers.js').formatNumber;
    ctx.projectElements = {};
    ctx.terraforming = { celestialParameters: { distanceFromSun: 1, rotationPeriod: 24.6, radius: 3389.5, mass: 6.417e23, parentBody: { name: 'Mars', orbitRadius: 50000 } } };
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
      const moonWarning = ctx.projectElements.photonThrusters.motion.moonWarning;
      expect(moonWarning.style.display).toBe("block");
      expect(moonWarning.textContent.trim()).toBe("Moons must first their parent's gravity well before distance to the sun can be changed");
    expect(spinCard.style.display).toBe('block');
    expect(motionCard.style.display).toBe('block');
    expect(spin.orbitalPeriod.textContent).toContain('365.25');
    expect(spin.target.value).toBe('1');
    const expectedCost = ctx.formatNumber(
      spinEnergyCost(6.417e23, 3389.5, 24.6, 24),
      false,
      2
    ) + ' W-day';
    expect(spin.energyCost.textContent).toBe(expectedCost);
    const inputs = container.querySelectorAll('#spin-target');
    expect(inputs.length).toBe(1);
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
    ctx.terraforming = { celestialParameters: { distanceFromSun: 2, rotationPeriod: 24.6, radius: 3389.5, mass: 6.417e23 } };
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
      const moonWarning = ctx.projectElements.photonThrusters.motion.moonWarning;
      expect(moonWarning.style.display).toBe("none");
    expect(motion.distanceSun.textContent).toBe('2.00 AU');
    expect(motion.parentContainer.style.display).toBe('none');
    const spin = ctx.projectElements.photonThrusters.spin;
    const expectedCost = ctx.formatNumber(
      spinEnergyCost(6.417e23, 3389.5, 24.6, 24),
      false,
      2
    ) + ' W-day';
    expect(spin.energyCost.textContent).toBe(expectedCost);
  });

  test('subcards hidden until project complete', () => {
    const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = require('../src/js/numbers.js').formatNumber;
    ctx.projectElements = {};
    ctx.terraforming = { celestialParameters: { distanceFromSun: 1, rotationPeriod: 24.6, radius: 3389.5, mass: 6.417e23 } };
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

  test('rotation period uses provided value', () => {
    const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = require('../src/js/numbers.js').formatNumber;
    ctx.projectElements = {};
    ctx.terraforming = { celestialParameters: { rotationPeriod: 400.8, distanceFromSun: 5.2, radius: 2410.3, mass: 1.076e23 } };
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
    const value = parseFloat(spin.rotationPeriod.textContent);
    expect(value).toBeCloseTo(16.7, 1);
    const expectedCost = ctx.formatNumber(
      spinEnergyCost(1.076e23, 2410.3, 400.8, 24),
      false,
      2
    ) + ' W-day';
    expect(spin.energyCost.textContent).toBe(expectedCost);
  });
});
