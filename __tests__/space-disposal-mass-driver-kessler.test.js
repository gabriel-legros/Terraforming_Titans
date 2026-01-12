const EffectableEntity = require('../src/js/effectable-entity');

describe('Space disposal mass driver Kessler handling', () => {
  afterEach(() => {
    delete global.EffectableEntity;
    delete global.Project;
    delete global.shipEfficiency;
    delete global.hazardManager;
    delete global.resources;
    delete global.buildings;
    jest.resetModules();
  });

  test('mass driver-only disposal does not add Kessler debris', () => {
    global.EffectableEntity = EffectableEntity;
    global.shipEfficiency = 1;
    const addDebris = jest.fn();
    global.hazardManager = {
      kesslerHazard: {
        getSuccessChance: jest.fn(() => 0.4),
        addDebris,
      },
      parameters: {},
    };
    global.resources = {
      colony: {
        metal: {
          value: 10000,
          decrease: jest.fn(function (value) { this.value -= value; }),
        },
        energy: {
          value: 10000,
          decrease: jest.fn(function (value) { this.value -= value; }),
        },
        water: {
          value: 500,
          decrease: jest.fn(function (value) { this.value -= value; }),
        },
      },
      special: {
        spaceships: {
          value: 0,
        },
      },
    };
    global.buildings = {
      massDriver: {
        active: 20,
        count: 20,
      },
    };

    const { Project } = require('../src/js/projects.js');
    global.Project = Project;
    const SpaceshipProject = require('../src/js/projects/SpaceshipProject.js');
    global.SpaceshipProject = SpaceshipProject;
    const SpaceExportBaseProject = require('../src/js/projects/SpaceExportBaseProject.js');
    global.SpaceExportBaseProject = SpaceExportBaseProject;
    const SpaceDisposalProject = require('../src/js/projects/SpaceDisposalProject.js');

    const project = new SpaceDisposalProject(
      {
        name: 'Resource Disposal',
        category: 'resources',
        cost: {},
        duration: 100000,
        description: '',
        repeatable: true,
        maxRepeatCount: Infinity,
        unlocked: true,
        kesslerDebrisSize: 'large',
        attributes: {
          spaceExport: true,
          continuousAsBuilding: true,
          costPerShip: { colony: { metal: 100, energy: 10 } },
          massDriverShipEquivalency: 10,
          disposalAmount: 100,
          disposable: { colony: ['water'] },
        },
      },
      'disposeResources'
    );

    project.booleanFlags.add('massDriverEnabled');
    project.assignedSpaceships = 0;
    project.isActive = true;
    project.selectedDisposalResource = { category: 'colony', resource: 'water' };

    project.applyCostAndGain(1000);

    expect(addDebris).not.toHaveBeenCalled();
    expect(global.resources.colony.water.value).toBe(300);
  });
});
