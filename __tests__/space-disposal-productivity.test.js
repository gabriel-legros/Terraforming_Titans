const EffectableEntity = require('../src/js/effectable-entity');

describe('Space disposal productivity', () => {
  afterEach(() => {
    delete global.EffectableEntity;
    delete global.Project;
    delete global.SpaceshipProject;
    delete global.SpaceExportBaseProject;
    delete global.resources;
    jest.resetModules();
  });

  test('ignores selected disposal resource when calculating productivity', () => {
    global.EffectableEntity = EffectableEntity;

    const { Project } = require('../src/js/projects.js');
    global.Project = Project;
    const SpaceshipProject = require('../src/js/projects/SpaceshipProject.js');
    global.SpaceshipProject = SpaceshipProject;
    const SpaceExportBaseProject = require('../src/js/projects/SpaceExportBaseProject.js');
    global.SpaceExportBaseProject = SpaceExportBaseProject;
    const SpaceDisposalProject = require('../src/js/projects/SpaceDisposalProject.js');
    const { Resource, calculateProjectProductivities } = require('../src/js/resource.js');

    global.resources = {
      colony: {
        water: new Resource({ name: 'water', category: 'colony', initialValue: 0 }),
        energy: new Resource({ name: 'energy', category: 'colony', initialValue: 1000 }),
      },
    };

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
        attributes: {
          spaceExport: true,
          continuousAsBuilding: true,
          costPerShip: { colony: { metal: 100, energy: 10 } },
          disposalAmount: 100,
          disposable: { colony: ['water'] },
        },
      },
      'disposeResources'
    );

    project.assignedSpaceships = 101;
    project.selectedDisposalResource = { category: 'colony', resource: 'water' };

    const projectData = {
      disposeResources: {
        project,
        cost: { colony: { water: 100, energy: 10 } },
        gain: {},
      },
    };
    const productivityRates = { colony: { water: 0, energy: 0 } };

    const productivityMap = calculateProjectProductivities(
      global.resources,
      productivityRates,
      1000,
      projectData
    );

    expect(productivityMap.disposeResources).toBe(1);
  });
});
