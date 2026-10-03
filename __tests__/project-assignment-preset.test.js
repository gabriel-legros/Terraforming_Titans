const { createProjectAssignmentBase } = require('../src/js/projects/ProjectAssignmentBase.js');

class AssignmentProject extends createProjectAssignmentBase(class {}) {
  constructor() {
    super();
    this.repeatCount = 12n;
    this.assignments = {};
    this.initializeAssignmentState({ assignmentStateKey: 'assignments' });
  }

  getAssignmentKeys() {
    return ['hydrogen', 'methane', 'stripAtmosphere'];
  }

  shouldPreserveAssignmentsDuringNormalization() {
    return false;
  }
}

describe('Project assignment presets', () => {
  it('preserves other recipe assignments when applying a partial preset', () => {
    const project = new AssignmentProject();
    project.repeatCount = 91226279n;
    project.loadAssignmentSettings({ assignments: { methane: 90872914 } }, { isPresetApplication: true });
    project.loadAssignmentSettings({ assignments: { hydrogen: 0 } }, { isPresetApplication: true });

    expect(project.assignments.methane).toBe(90872914n);
    expect(project.assignments.hydrogen).toBe(0n);
  });

  it('updates only the automatic assignment flags included in a preset', () => {
    const project = new AssignmentProject();
    project.autoAssignFlags = {
      hydrogen: true,
      methane: true,
      stripAtmosphere: false
    };

    project.loadAssignmentSettings({
      autoAssignFlags: {
        stripAtmosphere: true
      },
      autoAssignWeights: {
        stripAtmosphere: 100
      }
    }, { isPresetApplication: true });

    expect(project.autoAssignFlags).toEqual({
      idleUnassigned: false,
      hydrogen: true,
      methane: true,
      stripAtmosphere: true
    });
  });

  it('continues replacing automatic assignment flags when loading saved state', () => {
    const project = new AssignmentProject();
    project.autoAssignFlags = {
      hydrogen: true,
      methane: true,
      stripAtmosphere: false
    };

    project.loadAssignmentSettings({
      autoAssignFlags: {
        stripAtmosphere: true
      }
    });

    expect(project.autoAssignFlags).toEqual({
      idleUnassigned: false,
      hydrogen: false,
      methane: false,
      stripAtmosphere: true
    });
  });
});
