const EffectableEntity = require('../src/js/effectable-entity');

describe('Companion Mirror advanced research', () => {
  afterEach(() => {
    delete global.EffectableEntity;
    jest.resetModules();
  });

  it('defines the research entry with the expected cost and effects', () => {
    const researchParameters = require('../src/js/research-parameters.js');
    const research = researchParameters.advanced.find((entry) => entry.id === 'companion_mirror');
    expect(research).toBeDefined();
    expect(research.cost).toEqual({ advancedResearch: 20000000 });
    expect(research.effects).toEqual([
      { target: 'project', targetId: 'spaceMirrorFacility', type: 'enable' },
      { target: 'project', targetId: 'spaceMirrorFacility', type: 'completeProject' },
    ]);
  });

  it('completes projects when the completeProject effect is applied', () => {
    global.EffectableEntity = EffectableEntity;
    const { Project } = require('../src/js/projects.js');
    const project = new Project(
      {
        name: 'Test Project',
        category: 'mega',
        cost: { colony: {} },
        duration: 1000,
        description: '',
        repeatable: false,
        unlocked: true,
        attributes: {},
      },
      'testProject'
    );

    project.addAndReplace({ type: 'completeProject' });
    expect(project.isCompleted).toBe(true);
  });
});
