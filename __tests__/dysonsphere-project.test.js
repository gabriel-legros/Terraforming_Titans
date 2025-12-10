describe('DysonSphereProject', () => {
  let DysonSphereProject;

  const loadProject = () => {
    const EffectableEntity = require('../src/js/effectable-entity');
    global.EffectableEntity = EffectableEntity;
    const { Project } = require('../src/js/projects.js');
    global.Project = Project;
    const TerraformingDurationProject = require('../src/js/projects/TerraformingDurationProject.js');
    global.TerraformingDurationProject = TerraformingDurationProject;
    const DysonSwarmReceiverProject = require('../src/js/projects/dysonswarm.js');
    global.DysonSwarmReceiverProject = DysonSwarmReceiverProject;
    DysonSphereProject = require('../src/js/projects/dysonsphere.js');
  };

  const createProject = () => new DysonSphereProject({
    name: 'Dyson Sphere',
    category: 'giga',
    cost: { colony: { metal: 1 } },
    duration: 1000,
    description: '',
    repeatable: false,
    unlocked: true,
    attributes: { canUseSpaceStorage: true, preserveProgressOnTravel: true },
  }, 'dysonSphere');

  beforeEach(() => {
    jest.resetModules();
    loadProject();
  });

  afterEach(() => {
    delete global.Project;
    delete global.DysonSwarmReceiverProject;
    delete global.DysonSphereProject;
    delete global.TerraformingDurationProject;
    delete global.EffectableEntity;
    delete global.projectManager;
  });

  it('runs collectors 100x faster than the swarm baseline', () => {
    const project = createProject();
    expect(project.baseCollectorDuration).toBe(600);
  });

  it('keeps the sphere frame complete across planet travel', () => {
    const project = createProject();
    project.isCompleted = true;
    project.collectors = 7;

    const saved = project.saveTravelState();
    const restored = createProject();
    restored.loadTravelState(saved);

    expect(restored.isCompleted).toBe(true);
    expect(restored.collectors).toBe(7);
  });

  it('preserves build progress across travel when enabled', () => {
    const project = createProject();
    project.isActive = true;
    project.remainingTime = 500;
    project.startingDuration = 1000;

    const saved = project.saveTravelState();
    const restored = createProject();
    restored.loadTravelState(saved);

    expect(restored.isActive).toBe(true);
    expect(restored.remainingTime).toBe(500);
    expect(restored.startingDuration).toBe(1000);
  });

  it('absorbs swarm collectors and disables the swarm on completion', () => {
    const project = createProject();
    global.projectManager = {
      projects: {
        dysonSwarmReceiver: {
          collectors: 5,
          applyPermanentProjectDisable(effect) {
            this.permanentlyDisabled = effect?.value !== false;
            this.isActive = false;
            this.isPaused = false;
          },
        },
      },
    };

    project.complete();

    expect(project.collectors).toBe(5);
    expect(global.projectManager.projects.dysonSwarmReceiver.collectors).toBe(0);
    expect(global.projectManager.projects.dysonSwarmReceiver.permanentlyDisabled).toBe(true);
  });
});
