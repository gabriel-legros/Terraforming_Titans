const EffectableEntity = require('../src/js/effectable-entity');

describe('LiftersProject', () => {
  let LiftersProject;

  const loadProject = () => {
    global.EffectableEntity = EffectableEntity;
    const { Project } = require('../src/js/projects.js');
    global.Project = Project;
    const TerraformingDurationProject = require('../src/js/projects/TerraformingDurationProject.js');
    global.TerraformingDurationProject = TerraformingDurationProject;
    LiftersProject = require('../src/js/projects/LiftersProject.js');
  };

  const createProject = () => new LiftersProject({
    name: 'Lifters',
    category: 'mega',
    cost: { colony: { superalloys: 1 } },
    duration: 600000,
    description: '',
    repeatable: true,
    unlocked: true,
    attributes: { canUseSpaceStorage: true },
  }, 'lifters');

  beforeEach(() => {
    jest.resetModules();
    loadProject();
  });

  afterEach(() => {
    delete global.Project;
    delete global.EffectableEntity;
    delete global.TerraformingDurationProject;
    delete global.spaceManager;
    jest.resetModules();
  });

  it('divides build duration by terraformed worlds', () => {
    global.spaceManager = {
      getTerraformedPlanetCountIncludingCurrent: () => 3,
    };
    const project = createProject();
    expect(project.getBaseDuration()).toBe(200000);
  });

  it('persists repeat count and active progress across travel', () => {
    const project = createProject();
    project.repeatCount = 7;
    project.isActive = true;
    project.remainingTime = 120000;
    project.startingDuration = 180000;

    const state = project.saveTravelState();

    expect(state).toEqual({
      repeatCount: 7,
      isActive: true,
      remainingTime: 120000,
      startingDuration: 180000,
    });

    loadProject();
    const restored = createProject();
    restored.loadTravelState(state);

    expect(restored.repeatCount).toBe(7);
    expect(restored.isActive).toBe(true);
    expect(restored.remainingTime).toBe(120000);
    expect(restored.startingDuration).toBe(180000);
  });

  it('resets timers when no active build persists', () => {
    global.spaceManager = {
      getTerraformedPlanetCountIncludingCurrent: () => 2,
    };
    const project = createProject();
    const expectedDuration = project.getEffectiveDuration();

    const restored = createProject();
    restored.loadTravelState({ repeatCount: 4 });

    expect(restored.repeatCount).toBe(4);
    expect(restored.isActive).toBe(false);
    expect(restored.remainingTime).toBe(expectedDuration);
    expect(restored.startingDuration).toBe(expectedDuration);
  });
});
