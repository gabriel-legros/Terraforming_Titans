const originalProject = global.Project;

class StubProject {
  constructor(config = {}, name = '') {
    this.name = name;
    this.displayName = config.name || name;
    this.attributes = config.attributes || {};
    this.activeEffects = [];
    this.autoStart = false;
    this.isCompleted = true;
  }

  update() {}
  saveState() { return {}; }
  loadState() {}
  isBooleanFlagSet() { return false; }
}

global.Project = StubProject;

const PlanetaryThrustersProject = require('../src/js/projects/PlanetaryThrustersProject.js');

afterAll(() => {
  if (typeof originalProject === 'undefined') {
    delete global.Project;
  } else {
    global.Project = originalProject;
  }
});

describe('PlanetaryThrustersProject spin handling', () => {
  let originalFormatNumber;
  let originalTerraforming;
  let originalResources;

  beforeEach(() => {
    originalFormatNumber = global.formatNumber;
    originalTerraforming = global.terraforming;
    originalResources = global.resources;

    global.formatNumber = (value) => (typeof value === 'number' ? value : Number(value || 0));
    global.terraforming = {
      celestialParameters: {
        radius: 1000,
        mass: 1,
        rotationPeriod: 24,
      },
    };
    global.resources = {
      colony: {
        energy: {
          value: 1e9,
          decrease(amount) {
            this.value -= amount;
          },
        },
      },
    };
  });

  afterEach(() => {
    if (typeof originalFormatNumber === 'undefined') {
      delete global.formatNumber;
    } else {
      global.formatNumber = originalFormatNumber;
    }
    if (typeof originalTerraforming === 'undefined') {
      delete global.terraforming;
    } else {
      global.terraforming = originalTerraforming;
    }
    if (typeof originalResources === 'undefined') {
      delete global.resources;
    } else {
      global.resources = originalResources;
    }
  });

  it('slows and reverses spin when targeting retrograde rotation', () => {
    const project = new PlanetaryThrustersProject({}, 'thrusters');
    project.updateUI = () => {};
    project.isCompleted = true;
    project.spinInvest = true;
    project.tgtDays = -1;
    project.power = 10;
    project.prepareJob(true, true);

    const planet = global.terraforming.celestialParameters;
    const initialPeriod = planet.rotationPeriod;

    project.applyCostAndGain(1000);
    const firstTickPeriod = planet.rotationPeriod;
    expect(firstTickPeriod).toBeGreaterThan(initialPeriod);

    let guard = 0;
    while (project.spinInvest && guard < 32) {
      project.applyCostAndGain(1000);
      guard += 1;
    }

    expect(project.spinInvest).toBe(false);
    expect(planet.rotationDirection).toBe(-1);
    expect(planet.rotationPeriod).toBeCloseTo(24, 6);
  });
});
