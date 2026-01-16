describe('Planet parameter effects for spaceship costs', () => {
  let EffectableEntity;
  let Project;
  let ProjectManager;
  let SpaceshipProject;
  let applyPlanetParameterEffects;

  beforeEach(() => {
    jest.resetModules();
    EffectableEntity = require('../src/js/effectable-entity');
    applyPlanetParameterEffects = EffectableEntity.applyPlanetParameterEffects;
    global.EffectableEntity = EffectableEntity;
    ({ Project, ProjectManager } = require('../src/js/projects.js'));
    global.Project = Project;
    SpaceshipProject = require('../src/js/projects/SpaceshipProject.js');
    global.SpaceshipProject = SpaceshipProject;
    global.fundingModule = null;
    global.populationModule = null;
    global.tabManager = null;
    global.globalEffects = new EffectableEntity({ description: 'global' });
    global.terraforming = null;
    global.lifeDesigner = null;
    global.lifeManager = null;
    global.oreScanner = null;
    global.researchManager = null;
    global.solisManager = null;
    global.spaceManager = null;
    global.automationManager = null;
    global.warpGateCommand = null;
    global.warpGateNetworkManager = null;
    global.rwgManager = null;
    global.nanotechManager = null;
    global.galaxyManager = null;
    global.artificialManager = null;
    global.colonySliderSettings = null;
    global.patienceManager = null;
    global.buildings = {};
    global.colonies = {};
    global.resources = { colony: {}, special: {} };
  });

  afterEach(() => {
    delete global.EffectableEntity;
    delete global.Project;
    delete global.SpaceshipProject;
    delete global.projectManager;
    delete global.currentPlanetParameters;
    delete global.defaultPlanetParameters;
    delete global.fundingModule;
    delete global.populationModule;
    delete global.tabManager;
    delete global.globalEffects;
    delete global.terraforming;
    delete global.lifeDesigner;
    delete global.lifeManager;
    delete global.oreScanner;
    delete global.researchManager;
    delete global.solisManager;
    delete global.spaceManager;
    delete global.automationManager;
    delete global.warpGateCommand;
    delete global.warpGateNetworkManager;
    delete global.rwgManager;
    delete global.nanotechManager;
    delete global.galaxyManager;
    delete global.artificialManager;
    delete global.colonySliderSettings;
    delete global.patienceManager;
    delete global.buildings;
    delete global.colonies;
    delete global.resources;
  });

  it('applies planet spaceship energy multipliers to spaceship projects', () => {
    const projectManager = new ProjectManager();
    global.projectManager = projectManager;
    const shipProject = new SpaceshipProject({
      name: 'Export',
      category: 'resources',
      cost: {},
      duration: 10,
      description: '',
      repeatable: true,
      unlocked: true,
      attributes: {
        spaceExport: true,
        costPerShip: { colony: { energy: 10 } }
      }
    }, 'exportResources');
    const otherProject = new Project({
      name: 'Other',
      category: 'resources',
      cost: {},
      duration: 10,
      description: '',
      repeatable: true,
      unlocked: true,
      attributes: {}
    }, 'otherProject');
    projectManager.projects = {
      exportResources: shipProject,
      otherProject
    };

    global.currentPlanetParameters = {
      effects: [
        {
          target: 'projectManager',
          type: 'spaceshipCostMultiplier',
          resourceCategory: 'colony',
          resourceId: 'energy',
          value: 5,
          effectId: 'planet-ship-energy'
        }
      ]
    };

    applyPlanetParameterEffects();
    const cost = shipProject.calculateSpaceshipCost();
    expect(cost.colony.energy).toBe(50);
    expect(otherProject.activeEffects.length).toBe(0);
  });

  it('sets artificial world spaceship multipliers from radius', () => {
    const { defaultPlanetParameters } = require('../src/js/planet-parameters.js');
    global.defaultPlanetParameters = {
      ...defaultPlanetParameters,
      resources: defaultPlanetParameters.resources,
      zonalSurface: defaultPlanetParameters.zonalSurface,
      celestialParameters: defaultPlanetParameters.celestialParameters,
    };
    global.currentPlanetParameters = {
      celestialParameters: { sector: 'R5-07' }
    };

    const { ArtificialManager } = require('../src/js/space/artificial.js');
    const manager = new ArtificialManager();
    const override = manager.buildOverride({
      name: 'Shellworld',
      type: 'shell',
      core: 'super-earth',
      radiusEarth: 5,
      landHa: 1000,
      stockpile: { metal: 0, silicon: 0 },
      sector: 'R5-07'
    });

    expect(override.effects[0].value).toBe(5);
    expect(override.effects[0].resourceId).toBe('energy');
  });
});
