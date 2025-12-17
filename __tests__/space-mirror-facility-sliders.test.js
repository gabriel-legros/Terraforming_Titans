const EffectableEntity = require('../src/js/effectable-entity');

describe('SpaceMirrorFacilityProject slider rebalance', () => {
  let Project;
  let SpaceMirrorFacilityProject;
  let setMirrorDistribution;

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

  const anyShare = (dist) => {
    const sum =
      (dist.tropical || 0) +
      (dist.temperate || 0) +
      (dist.polar || 0) +
      (dist.focus || 0) +
      (dist.unassigned || 0);
    return 1 - sum;
  };

  beforeEach(() => {
    jest.resetModules();
    global.EffectableEntity = EffectableEntity;
    ({ Project } = require('../src/js/projects.js'));
    global.Project = Project;
    global.updateMirrorOversightUI = jest.fn();
    ({ SpaceMirrorFacilityProject, setMirrorDistribution } = require('../src/js/projects/SpaceMirrorFacilityProject.js'));
  });

  afterEach(() => {
    delete global.Project;
    delete global.EffectableEntity;
    delete global.updateMirrorOversightUI;
    delete global.mirrorOversightSettings;
    jest.resetModules();
  });

  it('returns slack to Any Zone when lowering a zone', () => {
    const project = createProject();
    const dist = project.mirrorOversightSettings.distribution;
    dist.tropical = 0.4;
    dist.temperate = 0.3;
    dist.polar = 0.0;
    dist.focus = 0.0;
    dist.unassigned = 0.2;

    const beforeUnassigned = dist.unassigned;
    const beforeAny = anyShare(dist);

    setMirrorDistribution('tropical', 30);

    expect(dist.unassigned).toBe(beforeUnassigned);
    expect(anyShare(dist)).toBeCloseTo(beforeAny + 0.1, 10);
  });

  it('steals from Unassigned first when raising a zone beyond 100%', () => {
    const project = createProject();
    const dist = project.mirrorOversightSettings.distribution;
    dist.tropical = 0.3;
    dist.temperate = 0.5;
    dist.polar = 0.0;
    dist.focus = 0.0;
    dist.unassigned = 0.2;

    setMirrorDistribution('tropical', 40);

    expect(dist.tropical).toBeCloseTo(0.4, 10);
    expect(dist.unassigned).toBeCloseTo(0.1, 10);
    expect(dist.temperate).toBeCloseTo(0.5, 10);
    expect(anyShare(dist)).toBeCloseTo(0, 10);
  });

  it('increasing Any Zone reclaims Unassigned before other allocations', () => {
    const project = createProject();
    const dist = project.mirrorOversightSettings.distribution;
    dist.tropical = 0.8;
    dist.temperate = 0.0;
    dist.polar = 0.0;
    dist.focus = 0.0;
    dist.unassigned = 0.2;

    setMirrorDistribution('any', 10);

    expect(anyShare(dist)).toBeCloseTo(0.1, 10);
    expect(dist.unassigned).toBeCloseTo(0.1, 10);
    expect(dist.tropical).toBeCloseTo(0.8, 10);
  });

  it('increasing Any Zone reclaims Focus before zonal allocations', () => {
    const project = createProject();
    const dist = project.mirrorOversightSettings.distribution;
    dist.tropical = 0.8;
    dist.temperate = 0.0;
    dist.polar = 0.0;
    dist.focus = 0.2;
    dist.unassigned = 0.0;

    setMirrorDistribution('any', 10);

    expect(anyShare(dist)).toBeCloseTo(0.1, 10);
    expect(dist.focus).toBeCloseTo(0.1, 10);
    expect(dist.tropical).toBeCloseTo(0.8, 10);
  });

  it('decreasing Any Zone boosts committed shares proportionally (leaves Unassigned)', () => {
    const project = createProject();
    const dist = project.mirrorOversightSettings.distribution;
    dist.tropical = 0.2;
    dist.temperate = 0.1;
    dist.polar = 0.0;
    dist.focus = 0.0;
    dist.unassigned = 0.1;

    setMirrorDistribution('any', 50);

    expect(anyShare(dist)).toBeCloseTo(0.5, 10);
    expect(dist.unassigned).toBeCloseTo(0.1, 10);
    expect(dist.tropical).toBeCloseTo(0.2666666667, 6);
    expect(dist.temperate).toBeCloseTo(0.1333333333, 6);
  });
});

