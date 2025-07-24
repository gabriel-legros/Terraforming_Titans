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

const G = 6.67430e-11;
const SOLAR_MASS = 1.989e30;
const AU_IN_METERS = 1.496e11;

function escapeEnergyCost(bodyMass, parentMass, orbitRadiusKm) {
  const r = orbitRadiusKm * 1000;
  const ve = Math.sqrt(2 * G * parentMass / r);
  const vo = Math.sqrt(G * parentMass / r);
  const deltaE = 0.5 * bodyMass * (ve * ve - vo * vo);
  return Math.abs(deltaE) / 86400;
}

function orbitalEnergyCost(mass, currentAU, targetAU) {
  const r1 = currentAU * AU_IN_METERS;
  const r2 = targetAU * AU_IN_METERS;
  const e1 = -G * SOLAR_MASS * mass / (2 * r1);
  const e2 = -G * SOLAR_MASS * mass / (2 * r2);
  return Math.abs(e2 - e1) / 86400;
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
    ctx.terraforming = { celestialParameters: { distanceFromSun: 1, rotationPeriod: 24.6, radius: 3389.5, mass: 6.417e23, parentBody: { name: 'Mars', orbitRadius: 50000, mass: 5.683e26 } } };
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
    expect(moonWarning.style.display).toBe('block');
    expect(moonWarning.textContent).toContain('Escape parent body');
    expect(moonWarning.textContent).toContain('\u26A0');
    expect(spinCard.style.display).toBe('block');
    expect(motionCard.style.display).toBe('block');
    const rotValue = parseFloat(spin.rotationPeriod.textContent);
    expect(rotValue).toBeCloseTo(1.03, 2);
    expect(spin.target.value).toBe('1');
    expect(motion.distanceSun.textContent).toBe('1.00 AU');
    expect(motion.parentContainer.style.display).toBe('block');
    expect(motion.parentName.textContent).toBe('Mars');
    expect(motion.escapeContainer.style.display).toBe('block');
    const expectedEscape = ctx.formatNumber(
      escapeEnergyCost(6.417e23, 5.683e26, 50000),
      false,
      2
    ) + ' W-day';
    expect(motion.escapeEnergy.textContent).toBe(expectedEscape);
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
    expect(motion.escapeContainer.style.display).toBe('none');
    expect(motion.targetContainer.style.display).toBe('block');
    expect(motion.energyContainer.style.display).toBe('block');
    expect(motion.target.value).toBe('1');
    const spin = ctx.projectElements.photonThrusters.spin;
    const expectedSpinCost = ctx.formatNumber(
      spinEnergyCost(6.417e23, 3389.5, 24.6, 24),
      false,
      2
    ) + ' W-day';
    expect(spin.energyCost.textContent).toBe(expectedSpinCost);
    const expectedOrbitalCost = ctx.formatNumber(
      orbitalEnergyCost(6.417e23, 2, 1),
      false,
      2
    ) + ' W-day';
    expect(motion.energyCost.textContent).toBe(expectedOrbitalCost);
  });

  test('motion card hides moon warning when parent is Star', () => {
    const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = require('../src/js/numbers.js').formatNumber;
    ctx.projectElements = {};
    ctx.terraforming = { celestialParameters: { distanceFromSun: 2, rotationPeriod: 24.6, radius: 3389.5, mass: 6.417e23, parentBody: 'Star' } };
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
    expect(moonWarning.style.display).toBe('none');
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

  test('spin and motion invest checkboxes are exclusive', () => {
    const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = require('../src/js/numbers.js').formatNumber;
    ctx.projectElements = {};
    ctx.terraforming = { celestialParameters: { distanceFromSun: 1, rotationPeriod: 24, radius: 3390, mass: 6.4e23 } };
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

    const spinCheck = ctx.projectElements.photonThrusters.spin.investCheckbox;
    const motionCheck = ctx.projectElements.photonThrusters.motion.investCheckbox;
    spinCheck.checked = true;
    spinCheck.dispatchEvent(new dom.window.Event('change'));
    expect(project.spinInvest).toBe(true);
    expect(project.motionInvest).toBe(false);
    motionCheck.checked = true;
    motionCheck.dispatchEvent(new dom.window.Event('change'));
    expect(project.spinInvest).toBe(false);
    expect(project.motionInvest).toBe(true);
  });

  test('energy investment consumes energy each update', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PhotonThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PhotonThrustersProject = PhotonThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.resources = { colony: { energy: { value: 1000, decrease(v){ this.value -= v; }, updateStorageCap: () => {}, modifyRate: jest.fn() } } };
    global.resources = ctx.resources;
    ctx.terraforming = { celestialParameters: {} };

    const config = ctx.projectParameters.photonThrusters;
    const project = new ctx.PhotonThrustersProject(config, 'photonThrusters');
    project.isCompleted = true;
    project.energyInvestment = 50;
    project.spinInvest = true;
    project.update(2000);
    expect(ctx.resources.colony.energy.value).toBeCloseTo(900);
    expect(ctx.resources.colony.energy.modifyRate).toHaveBeenCalledWith(-50, 'Photon Thrusters', 'project');
  });

  test('spin investment reduces rotation period', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PhotonThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PhotonThrustersProject = PhotonThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.resources = { colony: { energy: { value: 1000, decrease(v){ this.value -= v; }, updateStorageCap: () => {}, modifyRate(){ } } } };
    global.resources = ctx.resources;
    ctx.terraforming = { celestialParameters: { mass: 1e10, radius: 1, rotationPeriod: 10 } };

    const config = ctx.projectParameters.photonThrusters;
    const project = new ctx.PhotonThrustersProject(config, 'photonThrusters');
    project.isCompleted = true;
    project.energyInvestment = 50;
    project.spinInvest = true;
    project.targetDays = 0.2;
    project.update(1000);
    expect(ctx.terraforming.celestialParameters.rotationPeriod).toBeLessThan(10);
  });

  test('motion investment increases orbital distance', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PhotonThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PhotonThrustersProject = PhotonThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.resources = { colony: { energy: { value: 1000, decrease(v){ this.value -= v; }, updateStorageCap: () => {}, modifyRate(){ } } } };
    global.resources = ctx.resources;
    ctx.terraforming = { celestialParameters: { mass: 1, radius: 1, distanceFromSun: 1 } };

    const config = ctx.projectParameters.photonThrusters;
    const project = new ctx.PhotonThrustersProject(config, 'photonThrusters');
    project.isCompleted = true;
    project.energyInvestment = 50;
    project.motionInvest = true;
    project.targetAU = 2;
    project.update(1000);
    expect(ctx.terraforming.celestialParameters.distanceFromSun).toBeGreaterThan(1);
  });

  test('moon investment expands orbit radius', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PhotonThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PhotonThrustersProject = PhotonThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.resources = { colony: { energy: { value: 1000, decrease(v){ this.value -= v; }, updateStorageCap: () => {}, modifyRate(){ } } } };
    global.resources = ctx.resources;
    ctx.terraforming = { celestialParameters: { mass: 1e12, radius: 1, parentBody: { mass: 1e15, orbitRadius: 1000 } } };

    const config = ctx.projectParameters.photonThrusters;
    const project = new ctx.PhotonThrustersProject(config, 'photonThrusters');
    project.isCompleted = true;
    project.energyInvestment = 50;
    project.motionInvest = true;
    project.update(1000);
    expect(ctx.terraforming.celestialParameters.parentBody.orbitRadius).toBeGreaterThan(1000);
  });

  test('moon escapes and parent becomes Star', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PhotonThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PhotonThrustersProject = PhotonThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.resources = { colony: { energy: { value: 2e6, decrease(v){ this.value-= v; }, updateStorageCap: () => {}, modifyRate(){ } } } };
    global.resources = ctx.resources;
    ctx.terraforming = { celestialParameters: { mass: 1e12, radius: 1, parentBody: { name: 'PlanetX', mass: 1e15, orbitRadius: 1000 } } };

    const config = ctx.projectParameters.photonThrusters;
    const project = new ctx.PhotonThrustersProject(config, 'photonThrusters');
    project.isCompleted = true;
    project.energyInvestment = 1e6;
    project.motionInvest = true;
    project.update(1000);
    expect(ctx.terraforming.celestialParameters.parentBody).toBe('Star');
  });

  test('saveState and loadState preserve investment settings', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PhotonThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PhotonThrustersProject = PhotonThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const config = ctx.projectParameters.photonThrusters;
    const project = new ctx.PhotonThrustersProject(config, 'photonThrusters');
    project.energyInvestment = 75;
    project.investmentMultiplier = 5;
    project.spinInvest = true;

    const saved = project.saveState();
    const loaded = new ctx.PhotonThrustersProject(config, 'photonThrusters');
    loaded.loadState(saved);

    expect(loaded.energyInvestment).toBe(75);
    expect(loaded.investmentMultiplier).toBe(5);
    expect(loaded.spinInvest).toBe(true);
    expect(loaded.motionInvest).toBe(false);
  });
});
