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
});
