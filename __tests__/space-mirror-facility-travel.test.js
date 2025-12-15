const EffectableEntity = require('../src/js/effectable-entity');

describe('SpaceMirrorFacilityProject travel state', () => {
  let Project;
  let SpaceMirrorFacilityProject;

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

  const createProject = () => new SpaceMirrorFacilityProject(
    createProjectConfig(),
    'spaceMirrorFacility'
  );

  beforeEach(() => {
    jest.resetModules();
    global.EffectableEntity = EffectableEntity;
    ({ Project } = require('../src/js/projects.js'));
    global.Project = Project;
    global.updateMirrorOversightUI = jest.fn();
    ({ SpaceMirrorFacilityProject } = require('../src/js/projects/SpaceMirrorFacilityProject.js'));
  });

  afterEach(() => {
    delete global.Project;
    delete global.ProjectManager;
    delete global.projectManager;
    delete global.EffectableEntity;
    delete global.updateMirrorOversightUI;
    delete global.mirrorOversightSettings;
    jest.resetModules();
  });

  it('keeps advanced oversight targets and timing when travelling', () => {
    const project = createProject();
    project.enableReversal();

    const settings = project.mirrorOversightSettings;
    settings.advancedOversight = true;
    settings.targets.tropical = 310;
    settings.targets.temperate = 280;
    settings.targets.polar = 260;
    settings.targets.water = 5000;
    settings.waterMultiplier = 1_000_000;
    settings.tempMode.tropical = 'day';
    settings.tempMode.temperate = 'night';
    settings.tempMode.polar = 'average';
    settings.priority.focus = 2;
    settings.applyToLantern = true;
    settings.assignments.reversalMode.polar = true;

    const travelState = project.saveTravelState();

    const afterTravel = createProject();
    afterTravel.loadTravelState(travelState);

    const restored = afterTravel.mirrorOversightSettings;
    expect(restored.targets.tropical).toBe(310);
    expect(restored.targets.temperate).toBe(280);
    expect(restored.targets.polar).toBe(260);
    expect(restored.targets.water).toBe(5000);
    expect(restored.waterMultiplier).toBe(1000);
    expect(restored.tempMode.tropical).toBe('day');
    expect(restored.tempMode.temperate).toBe('night');
    expect(restored.tempMode.polar).toBe('average');
    expect(restored.priority.focus).toBe(2);
    expect(restored.applyToLantern).toBe(true);
    expect(restored.assignments.reversalMode.polar).toBe(false);
    expect(afterTravel.reversalAvailable).toBe(false);
    expect(afterTravel.mirrorOversightSettings.advancedOversight).toBe(false);
  });
});
