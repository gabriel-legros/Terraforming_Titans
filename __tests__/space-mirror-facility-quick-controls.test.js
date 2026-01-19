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

describe('SpaceMirrorFacilityProject quick controls', () => {
  const createProjectConfig = () => ({
    name: 'Space mirror facility',
    category: 'mega',
    cost: { colony: { metal: 1 } },
    duration: 1000,
    description: '',
    repeatable: false,
    unlocked: true,
    attributes: {},
  });

  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.EffectableEntity = EffectableEntity;
    global.Project = Project;
    global.makeCollapsibleCard = () => {};
    global.initializeMirrorOversightUI = () => {};
    global.updateMirrorOversightUI = () => {};
    global.projectElements = {};
    global.selectedBuildCounts = { spaceMirror: 1, hyperionLantern: 1 };
    global.adjustStructureActivation = (structure, change) => {
      structure.active = Math.max(0, Math.min(structure.active + change, structure.count));
    };
    global.updateBuildingDisplay = jest.fn();
    global.buildings = {
      spaceMirror: { active: 4, count: 12, displayName: 'Space Mirror' },
      hyperionLantern: { active: 3, count: 9, displayName: 'Hyperion Lantern', unlocked: true },
    };
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.EffectableEntity;
    delete global.Project;
    delete global.makeCollapsibleCard;
    delete global.initializeMirrorOversightUI;
    delete global.updateMirrorOversightUI;
    delete global.projectElements;
    delete global.selectedBuildCounts;
    delete global.adjustStructureActivation;
    delete global.updateBuildingDisplay;
    delete global.buildings;
  });

  it('sets mirror and lantern active counts to zero or max', () => {
    const { SpaceMirrorFacilityProject } = require('../src/js/projects/SpaceMirrorFacilityProject.js');
    const project = new SpaceMirrorFacilityProject(createProjectConfig(), 'spaceMirrorFacility');
    project.updateUI = jest.fn();

    const container = document.createElement('div');
    project.renderUI(container);

    const quickBuild = projectElements.spaceMirrorFacility.quickBuild;

    quickBuild.mirror.max.click();
    expect(buildings.spaceMirror.active).toBe(12);

    quickBuild.mirror.zero.click();
    expect(buildings.spaceMirror.active).toBe(0);

    quickBuild.lantern.max.click();
    expect(buildings.hyperionLantern.active).toBe(9);

    quickBuild.lantern.zero.click();
    expect(buildings.hyperionLantern.active).toBe(0);
  });
});
