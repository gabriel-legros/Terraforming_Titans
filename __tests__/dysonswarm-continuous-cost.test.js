describe('DysonSwarmReceiverProject continuous cost gating', () => {
  let DysonSwarmReceiverProject;
  let resources;

  const loadProject = () => {
    const EffectableEntity = require('../src/js/effectable-entity');
    global.EffectableEntity = EffectableEntity;
    const { Project } = require('../src/js/projects.js');
    global.Project = Project;
    const TerraformingDurationProject = require('../src/js/projects/TerraformingDurationProject.js');
    global.TerraformingDurationProject = TerraformingDurationProject;
    DysonSwarmReceiverProject = require('../src/js/projects/dysonswarm.js');
  };

  const createResource = (value = 0) => {
    const resource = {
      value,
      decrease: jest.fn((amount) => {
        resource.value = Math.max(0, resource.value - amount);
      }),
      modifyRate: jest.fn(),
    };
    return resource;
  };

  const createProject = () => new DysonSwarmReceiverProject({
    name: 'Dyson Swarm Receiver',
    category: 'mega',
    cost: { colony: { metal: 1 } },
    duration: 1000,
    description: '',
    repeatable: false,
    unlocked: true,
    attributes: { canUseSpaceStorage: false },
  }, 'dysonSwarmReceiver');

  beforeEach(() => {
    jest.resetModules();
    loadProject();
    resources = {
      colony: {
        metal: createResource(0),
        electronics: createResource(0),
        components: createResource(0),
        glass: createResource(0),
      },
    };
    global.resources = resources;
  });

  afterEach(() => {
    delete global.Project;
    delete global.DysonSwarmReceiverProject;
    delete global.TerraformingDurationProject;
    delete global.EffectableEntity;
    delete global.resources;
  });

  it('halts continuous collectors when the base cost is unavailable', () => {
    const project = createProject();
    project.baseCollectorDuration = 500;
    project.autoDeployCollectors = true;
    project.isCompleted = true;

    project.applyCostAndGain(1000, null, 1);

    expect(project.collectors).toBe(0);
    expect(project.fractionalCollectors).toBe(0);
    expect(project.collectorShortfallLastTick).toBe(true);
    expect(resources.colony.metal.decrease).not.toHaveBeenCalled();
  });
});
