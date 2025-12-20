const { JSDOM } = require('jsdom');

class EffectableEntity {
  constructor() {
    this.activeEffects = [];
    this.booleanFlags = new Set();
  }

  isBooleanFlagSet(flag) {
    return this.booleanFlags.has(flag);
  }
}

class Project extends EffectableEntity {
  constructor(config, name) {
    super(config);
    this.initializeFromConfig(config, name);
    this.isCompleted = false;
    this.autoStart = false;
  }

  initializeFromConfig(config, name) {
    this.name = name;
    this.displayName = config?.name;
    this.attributes = config?.attributes || {};
    this.unlocked = config?.unlocked;
  }

  update() {}
  saveState() { return {}; }
  loadState() {}
  isVisible() { return true; }
}

global.EffectableEntity = EffectableEntity;
global.Project = Project;
global.formatNumber = (value) => String(value);
global.makeCollapsibleCard = () => {};
global.rotationPeriodToDuration = () => ({ duration: 1000, direction: 1 });
global.dayNightCycle = {
  dayDuration: 1000,
  elapsedTime: 0,
  getDayProgress() { return 0; },
  setDayProgress() {}
};

global.resources = {
  colony: {
    energy: {
      value: 1e9,
      decrease(amount) { this.value -= amount; }
    }
  }
};

global.terraforming = {
  celestialParameters: {
    distanceFromSun: 1,
    mass: 5.97e24,
    radius: 6371,
    rotationPeriod: 24
  }
};

global.currentPlanetParameters = {
  star: { massSolar: 1 }
};

const PlanetaryThrustersProject = require('../src/js/projects/PlanetaryThrustersProject.js');

test('reinvesting after target change recomputes motion job', () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;

  const project = new PlanetaryThrustersProject({ name: 'Thrusters', description: '', cost: {}, duration: 0 }, 'thrusters');
  project.isCompleted = true;
  project.power = 1;

  const container = document.createElement('div');
  project.renderUI(container);

  project.el.distTarget.value = 1.5;
  project.el.distTarget.oninput();
  project.el.distCb.checked = true;
  project.el.distCb.onchange();

  project.applyCostAndGain(1000, null, 1);

  project.el.distCb.checked = false;
  project.el.distCb.onchange();

  project.el.distTarget.value = 0.9;
  project.el.distTarget.oninput();

  project.dVdone = project.dVreq + 1;

  project.el.distCb.checked = true;
  project.el.distCb.onchange();

  expect(project.dVdone).toBe(0);
  expect(project.dVreq).toBeGreaterThan(0);

  project.applyCostAndGain(1000, null, 1);

  expect(terraforming.celestialParameters.distanceFromSun).toBeGreaterThan(0.9);
});
