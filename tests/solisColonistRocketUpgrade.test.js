const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');

describe('Solis colonist rocket upgrade', () => {
  class DummyProject extends EffectableEntity {
    constructor() {
      super({ description: 'import' });
    }
  }

  test('adds increaseResourceGain effect with each purchase', () => {
    const project = new DummyProject();
    global.projectManager = { projects: { import_colonists_1: project } };
    global.addEffect = (effect) => project.addAndReplace(effect);

    const manager = new SolisManager();
    manager.solisPoints = 3;

    manager.purchaseUpgrade('colonistRocket');
    expect(project.activeEffects[0].value).toBe(1);

    manager.purchaseUpgrade('colonistRocket');
    expect(project.activeEffects.length).toBe(1);
    expect(project.activeEffects[0].value).toBe(2);
  });
});
