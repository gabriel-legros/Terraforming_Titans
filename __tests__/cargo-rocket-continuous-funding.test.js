const path = require('path');

const EffectableEntity = require(path.join('..', 'src/js/effectable-entity.js'));
const { Project } = require(path.join('..', 'src/js/projects.js'));

global.EffectableEntity = EffectableEntity;
global.Project = Project;
const CargoRocketProject = require(path.join('..', 'src/js/projects/CargoRocketProject.js'));

describe('CargoRocketProject continuous funding scaling', () => {
  beforeEach(() => {
    global.resources = {
      colony: {
        funding: { value: 5 },
        metal: { value: 0 }
      }
    };
  });

  afterEach(() => {
    delete global.resources;
  });

  test('scales displayed gains when funding is short', () => {
    const config = {
      name: 'Cargo Rocket',
      duration: 0,
      attributes: {
        resourceChoiceGainCost: {
          colony: {
            metal: 2
          }
        }
      }
    };

    const project = new CargoRocketProject(config, 'cargo_rocket');
    project.booleanFlags.add('continuousTrading');
    project.isActive = true;
    project.autoStart = true;
    project.selectedResources = [{ category: 'colony', resource: 'metal', quantity: 10 }];

    const totals = project.estimateCostAndGain(1000, false, 1);

    expect(totals.cost.colony.funding).toBeCloseTo(20, 5);
    expect(totals.gain.colony.metal).toBeCloseTo(2.5, 5);
  });
});
