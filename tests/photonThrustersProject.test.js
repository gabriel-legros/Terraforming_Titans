const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Planetary Thrusters project', () => {
  test('class extends Project', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PlanetaryThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PlanetaryThrustersProject = PlanetaryThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);
    const config = ctx.projectParameters.planetaryThruster;
    const proj = new ctx.PlanetaryThrustersProject(config, 'planetaryThruster');
    expect(proj instanceof ctx.Project).toBe(true);
  });

  test('power investment consumes energy', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PlanetaryThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PlanetaryThrustersProject = PlanetaryThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.resources = { colony: { energy: { value: 1000, decrease(v){ this.value -= v; }, updateStorageCap(){ } } } };
    global.resources = ctx.resources;
    const celestial = { mass: 1, radius: 1, rotationPeriod: 10, starMass: 1.989e30 };
    ctx.currentPlanetParameters = { celestialParameters: celestial, star: { massSolar: 1 } };
    ctx.terraforming = { celestialParameters: celestial };
    global.currentPlanetParameters = ctx.currentPlanetParameters;
    global.terraforming = ctx.terraforming;

    const config = ctx.projectParameters.planetaryThruster;
    const project = new ctx.PlanetaryThrustersProject(config, 'planetaryThruster');
    project.isCompleted = true;
    project.power = 50;
    project.spinInvest = true;
    project.prepareJob();
    project.updateUI = () => {};
    project.update(2000);
    project.applyCostAndGain(2000, null, 1);
    expect(ctx.resources.colony.energy.value).toBeCloseTo(900);
  });

  test('consumes accumulated energy when provided', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PlanetaryThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PlanetaryThrustersProject = PlanetaryThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.resources = { colony: { energy: { value: 0, decrease(v){ this.value -= v; }, updateStorageCap(){ } } } };
    global.resources = ctx.resources;
    const celestial = { mass: 1, radius: 1, rotationPeriod: 10, starMass: 1.989e30 };
    ctx.currentPlanetParameters = { celestialParameters: celestial, star: { massSolar: 1 } };
    ctx.terraforming = { celestialParameters: celestial };
    global.currentPlanetParameters = ctx.currentPlanetParameters;
    global.terraforming = ctx.terraforming;

    const config = ctx.projectParameters.planetaryThruster;
    const project = new ctx.PlanetaryThrustersProject(config, 'planetaryThruster');
    project.isCompleted = true;
    project.power = 50;
    project.spinInvest = true;
    project.prepareJob();
    project.updateUI = () => {};
    project.update(2000);
    const changes = { colony: { energy: 200 } };
    project.applyCostAndGain(2000, changes, 1);
    expect(changes.colony.energy).toBeCloseTo(100);
    expect(ctx.resources.colony.energy.value).toBe(0);
  });

  test('estimateCostAndGain adds energy rate', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PlanetaryThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PlanetaryThrustersProject = PlanetaryThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.resources = { colony: { energy: { modifyRate: jest.fn(), value: 100, decrease(){}, updateStorageCap(){} } } };
    global.resources = ctx.resources;
    const celestial = { mass: 1, radius: 1, rotationPeriod: 10, starMass: 1.989e30 };
    ctx.currentPlanetParameters = { celestialParameters: celestial, star: { massSolar: 1 } };
    ctx.terraforming = { celestialParameters: celestial };
    global.currentPlanetParameters = ctx.currentPlanetParameters;
    global.terraforming = ctx.terraforming;

    const config = ctx.projectParameters.planetaryThruster;
    const project = new ctx.PlanetaryThrustersProject(config, 'pt');
    project.isCompleted = true;
    project.power = 20;
    project.spinInvest = true;
    project.prepareJob();
    project.update(1000);
    project.estimateCostAndGain(1000, true, 1);
    expect(ctx.resources.colony.energy.modifyRate).toHaveBeenCalledWith(-20, 'Planetary Thrusters', 'project');
  });

  test('applyCostAndGain adds energy rate when autoStart disabled', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PlanetaryThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PlanetaryThrustersProject = PlanetaryThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.resources = { colony: { energy: { modifyRate: jest.fn(), value: 100, decrease(){}, updateStorageCap(){} } } };
    global.resources = ctx.resources;
    const celestial = { mass: 1, radius: 1, rotationPeriod: 10, starMass: 1.989e30 };
    ctx.currentPlanetParameters = { celestialParameters: celestial, star: { massSolar: 1 } };
    ctx.terraforming = { celestialParameters: celestial };
    global.currentPlanetParameters = ctx.currentPlanetParameters;
    global.terraforming = ctx.terraforming;

    const config = ctx.projectParameters.planetaryThruster;
    const project = new ctx.PlanetaryThrustersProject(config, 'pt');
    project.isCompleted = true;
    project.power = 20;
    project.spinInvest = true;
    project.prepareJob();
    project.autoStart = false;
    project.update(1000);
    project.updateUI = () => {};
    project.applyCostAndGain(1000, null, 1);
    expect(ctx.resources.colony.energy.modifyRate).toHaveBeenCalledWith(-20, 'Planetary Thrusters', 'project');
  });

  test('saveState and loadState preserve settings', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'PlanetaryThrustersProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.PlanetaryThrustersProject = PlanetaryThrustersProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    const celestial = { mass: 1, radius: 1, rotationPeriod: 10, starMass: 1.989e30 };
    ctx.currentPlanetParameters = { celestialParameters: celestial, star: { massSolar: 1 } };
    ctx.terraforming = { celestialParameters: celestial };
    global.currentPlanetParameters = ctx.currentPlanetParameters;
    global.terraforming = ctx.terraforming;

    const config = ctx.projectParameters.planetaryThruster;
    const project = new ctx.PlanetaryThrustersProject(config, 'planetaryThruster');
    project.power = 75;
    project.step = 5;
    project.spinInvest = true;

    const saved = project.saveState();
    const loaded = new ctx.PlanetaryThrustersProject(config, 'planetaryThruster');
    loaded.loadState(saved);

    expect(loaded.power).toBe(75);
    expect(loaded.step).toBe(5);
    expect(loaded.spinInvest).toBe(true);
    expect(loaded.motionInvest).toBe(false);
  });
  afterEach(() => {
    delete global.resources;
    delete global.currentPlanetParameters;
    delete global.terraforming;
  });
});
