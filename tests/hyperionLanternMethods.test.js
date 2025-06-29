const EffectableEntity = require('../src/js/effectable-entity.js');

global.EffectableEntity = EffectableEntity;
global.lifeParameters = {};

// Stub Project base class for requiring HyperionLanternProject
const OriginalProject = global.Project;
class StubProject extends EffectableEntity {
  constructor(config, name){
    super(config);
    this.name = name;
    this.attributes = config.attributes || {};
  }
}

global.Project = StubProject;
const HyperionLanternProject = require('../src/js/projects/HyperionLanternProject.js');
if (OriginalProject === undefined) delete global.Project; else global.Project = OriginalProject;

describe('HyperionLanternProject calculations', () => {
  test('calculates flux and energy usage', () => {
    const project = new HyperionLanternProject({ attributes: { powerPerInvestment: 100 } }, 'lantern');
    project.isCompleted = true;
    project.active = 2;
    const area = 50;
    expect(project.calculateEnergyUsage()).toBe(200);
    expect(project.calculateFlux({ crossSectionArea: area })).toBeCloseTo(200 / area);
  });
});

const Terraforming = require('../src/js/terraforming.js');
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};

describe('Terraforming integration with Hyperion Lantern', () => {
  test('uses project methods for flux and energy', () => {
    const OriginalProject2 = global.Project;
    global.Project = StubProject;
    const HyperionLanternProject2 = require('../src/js/projects/HyperionLanternProject.js');
    if (OriginalProject2 === undefined) delete global.Project; else global.Project = OriginalProject2;

    const project = new HyperionLanternProject2({ attributes: { powerPerInvestment: 20 } }, 'hyperionLantern');
    project.isCompleted = true;
    project.active = 3;
    project.calculateEnergyUsage = jest.fn(() => 60);
    project.calculateFlux = jest.fn(() => 6);

    global.projectManager = { projects: { hyperionLantern: project }, isBooleanFlagSet: () => false };
    let modifyArgs = null;
    global.resources = { atmospheric: {}, special: { albedoUpgrades: { value: 0 } }, colony: { energy: { modifyRate: (...args) => { modifyArgs = args; } } } };
    global.buildings = { spaceMirror: { active: 0 } };
    global.colonies = {};
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.lifeDesigner = {};
    global.lifeManager = {};
    global.oreScanner = {};
    global.addEffect = () => {};

    const terra = new Terraforming(global.resources, { distanceFromSun: 1, radius: 1, gravity: 1, albedo: 0 });
    terra.calculateTotalPressure = () => 0;

    terra.applyTerraformingEffects();
    expect(project.calculateEnergyUsage).toHaveBeenCalled();
    expect(modifyArgs).toEqual([-60, 'Hyperion Lantern', 'terraforming']);

    const flux = terra.calculateLanternFlux();
    expect(project.calculateFlux).toHaveBeenCalledWith(terra.celestialParameters);
    expect(flux).toBe(6);
  });
});
