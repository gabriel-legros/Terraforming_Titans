const { ProjectAutomation } = require('../src/js/automation/project-automation.js');
const { getAutomatableProjects } = require('../src/js/automation/automationProjectsUI.js');

function setGlobal(name, value, original) {
  if (!(name in original)) {
    original[name] = global[name];
  }
  global[name] = value;
}

function createProjectManager(coreHeatFlux) {
  const artificialCrust = {
    name: 'artificialCrust',
    displayName: 'Artificial Crust',
    category: 'infrastructure',
    unlocked: true,
    automationRequiresEverEnabled: true,
    isPermanentlyDisabled() {
      return false;
    },
    isVisible() {
      return true;
    },
    isRelevantToCurrentPlanet() {
      return coreHeatFlux > 0;
    }
  };
  const cargoRocket = {
    name: 'cargo_rocket',
    displayName: 'Cargo Rocket',
    category: 'resources',
    unlocked: true,
    automationRequiresEverEnabled: false,
    isPermanentlyDisabled() {
      return false;
    },
    isVisible() {
      return true;
    }
  };

  return {
    projectOrder: ['cargo_rocket', 'artificialCrust'],
    projects: {
      cargo_rocket: cargoRocket,
      artificialCrust
    },
    isProjectRelevantToCurrentPlanet(project) {
      if (project.isRelevantToCurrentPlanet) {
        return project.isRelevantToCurrentPlanet();
      }
      return true;
    }
  };
}

function createSpaceStorageProject(selectedResources = []) {
  return {
    name: 'spaceStorage',
    displayName: 'Space Storage',
    category: 'mega',
    selectedResources: selectedResources.map(entry => ({ ...entry })),
    resourceTransferModes: {},
    resourceTransferWeights: {},
    resourceImportLimitRespects: {},
    resourceCaps: {},
    resourceStrategicReserves: {},
    waterWithdrawTarget: 'colony',
    hydrogenTransferTarget: 'atmospheric',
    saveAutomationSettings() {
      return {
        selectedResources: this.selectedResources.map(entry => ({ ...entry })),
        resourceTransferModes: { ...this.resourceTransferModes },
        resourceTransferWeights: { ...this.resourceTransferWeights },
        resourceImportLimitRespects: { ...this.resourceImportLimitRespects },
        resourceCaps: { ...this.resourceCaps },
        resourceStrategicReserves: { ...this.resourceStrategicReserves },
        waterWithdrawTarget: this.waterWithdrawTarget,
        hydrogenTransferTarget: this.hydrogenTransferTarget
      };
    },
    sanitizeTransferModes() {},
    sanitizeResourceCaps() {},
    sanitizeResourceStrategicReserves() {},
    setRespectImportProjectLimits(resourceKey, enabled) {
      if (enabled) {
        this.resourceImportLimitRespects[resourceKey] = true;
      } else {
        delete this.resourceImportLimitRespects[resourceKey];
      }
    }
  };
}

function createSpaceStorageProjectManager(spaceStorageProject) {
  return {
    projectOrder: ['spaceStorage'],
    projects: {
      spaceStorage: spaceStorageProject
    },
    isProjectRelevantToCurrentPlanet() {
      return true;
    }
  };
}

describe('Project automation visibility', () => {
  let originalGlobals;

  beforeEach(() => {
    originalGlobals = {};
  });

  afterEach(() => {
    Object.keys(originalGlobals).forEach((name) => {
      if (originalGlobals[name] === undefined) {
        delete global[name];
      } else {
        global[name] = originalGlobals[name];
      }
    });
  });

  it('keeps Artificial Crust in the project automation picker after visiting a molten world', () => {
    const automation = new ProjectAutomation();
    setGlobal('automationManager', { projectsAutomation: automation }, originalGlobals);

    setGlobal('projectManager', createProjectManager(0), originalGlobals);
    expect(getAutomatableProjects().map(project => project.name)).not.toContain('artificialCrust');

    global.projectManager = createProjectManager(250000);
    expect(getAutomatableProjects().map(project => project.name)).toContain('artificialCrust');

    global.projectManager = createProjectManager(0);
    expect(getAutomatableProjects().map(project => project.name)).toContain('artificialCrust');
  });

  it('normalizes legacy ever-enabled project names back to project ids', () => {
    const automation = new ProjectAutomation();
    setGlobal('automationManager', { projectsAutomation: automation }, originalGlobals);
    setGlobal('projectManager', createProjectManager(0), originalGlobals);

    automation.loadState({
      everEnabledProjects: ['Artificial Crust']
    });

    expect(getAutomatableProjects().map(project => project.name)).toContain('artificialCrust');
    expect(automation.hasEverEnabledProject('artificialCrust')).toBe(true);
  });

  it('keeps preset projects available in the picker even when they are not relevant on the current world', () => {
    const automation = new ProjectAutomation();
    automation.presets = [{
      id: 1,
      name: 'Molten preset',
      includeExpansion: true,
      includeOperations: true,
      scopeAll: false,
      projects: {
        artificialCrust: {
          operations: {
            autoStart: true
          }
        }
      }
    }];

    setGlobal('automationManager', { projectsAutomation: automation }, originalGlobals);
    setGlobal('projectManager', createProjectManager(0), originalGlobals);

    expect(automation.hasSeenProject('artificialCrust')).toBe(true);
    expect(getAutomatableProjects().map(project => project.name)).toContain('artificialCrust');
  });

  it('snapshots Space Storage single-resource checkbox state using the UI category/resource identity', () => {
    const automation = new ProjectAutomation();
    const spaceStorage = createSpaceStorageProject([
      { category: 'colony', resource: 'liquidWater' }
    ]);
    setGlobal('projectManager', createSpaceStorageProjectManager(spaceStorage), originalGlobals);

    const presetId = automation.addPreset('Water single resource', ['spaceStorageSingleResource:liquidWater'], {
      includeExpansion: true,
      includeOperations: true,
      scopeAll: false
    });

    const preset = automation.getPresetById(presetId);
    expect(preset.projects['spaceStorageSingleResource:liquidWater'].operations).toMatchObject({
      spaceStorageSingleResourceKey: 'liquidWater',
      category: 'surface',
      selected: false,
      waterWithdrawTarget: 'colony'
    });
  });

  it('applies Space Storage single-resource selected state to the actual checkbox entry', () => {
    const automation = new ProjectAutomation();
    const spaceStorage = createSpaceStorageProject([
      { category: 'colony', resource: 'liquidWater' }
    ]);
    setGlobal('projectManager', createSpaceStorageProjectManager(spaceStorage), originalGlobals);
    automation.presets = [{
      id: 1,
      name: 'Water single resource',
      includeExpansion: true,
      includeOperations: true,
      scopeAll: false,
      projects: {
        'spaceStorageSingleResource:liquidWater': {
          operations: {
            spaceStorageSingleResourceKey: 'liquidWater',
            mode: 'withdraw',
            selected: true
          }
        }
      }
    }];

    automation.applyPresetOnce(1);

    expect(spaceStorage.resourceTransferModes.liquidWater).toBe('withdraw');
    expect(spaceStorage.selectedResources).toEqual([
      { category: 'surface', resource: 'liquidWater' }
    ]);

    automation.presets[0].projects['spaceStorageSingleResource:liquidWater'].operations.selected = false;
    automation.applyPresetOnce(1);

    expect(spaceStorage.selectedResources).toEqual([]);
  });

  it('applies Space Storage single-resource water import target and import limit settings', () => {
    const automation = new ProjectAutomation();
    const spaceStorage = createSpaceStorageProject();
    setGlobal('projectManager', createSpaceStorageProjectManager(spaceStorage), originalGlobals);
    automation.presets = [{
      id: 1,
      name: 'Water single resource',
      includeExpansion: true,
      includeOperations: true,
      scopeAll: false,
      projects: {
        'spaceStorageSingleResource:liquidWater': {
          operations: {
            spaceStorageSingleResourceKey: 'liquidWater',
            resourceImportLimitRespects: {
              liquidWater: false
            },
            transferWeight: 1000,
            mode: null,
            selected: true,
            category: 'surface',
            waterWithdrawTarget: 'surface'
          }
        }
      }
    }];

    spaceStorage.resourceImportLimitRespects.liquidWater = true;
    automation.applyPresetOnce(1);

    expect(spaceStorage.waterWithdrawTarget).toBe('surface');
    expect(spaceStorage.resourceImportLimitRespects.liquidWater).toBeUndefined();
    expect(spaceStorage.resourceTransferWeights.liquidWater).toBe(1000);
    expect(spaceStorage.selectedResources).toEqual([
      { category: 'surface', resource: 'liquidWater' }
    ]);
  });
});
