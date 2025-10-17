const resetGlobals = () => {
  delete global.Project;
  delete global.terraforming;
  delete global.resources;
};

describe('PlanetaryThrustersProject spin inversion', () => {
  let PlanetaryThrustersProject;

  beforeEach(() => {
    jest.resetModules();
    global.Project = class {
      constructor() {
        this.isCompleted = true;
        this.autoStart = false;
      }
      saveState() { return {}; }
      loadState() {}
    };

    global.terraforming = {
      celestialParameters: {
        rotationPeriod: 24,
        radius: 1000,
        mass: 1e16,
      },
    };

    global.resources = {
      colony: {
        energy: {
          value: 1e12,
          decrease(amount) {
            this.value -= amount;
          },
        },
      },
    };

    PlanetaryThrustersProject = require('../src/js/projects/PlanetaryThrustersProject.js');
  });

  afterEach(() => {
    resetGlobals();
  });

  test('slows rotation before reversing direction when targeting retrograde spin', () => {
    const project = new PlanetaryThrustersProject({}, 'Planetary Thrusters');
    project.isCompleted = true;
    project.power = 1e7;
    project.spinInvest = true;
    project.tgtDays = -1;
    project.activeMode = 'spin';
    project.updateUI = () => {};
    project.prepareJob(true, true);

    const initialPeriod = terraforming.celestialParameters.rotationPeriod;
    project.applyCostAndGain(1000, null, 1);
    const updatedPeriod = terraforming.celestialParameters.rotationPeriod;

    expect(Math.abs(updatedPeriod)).toBeGreaterThan(Math.abs(initialPeriod));
    expect(updatedPeriod).toBeGreaterThan(0);
  });
});
