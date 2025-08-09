const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');

describe('Solis research upgrade', () => {
  const order = [
    'launch_pads',
    'colony_sliders',
    'construction_office',
    'space_mirror_oversight',
    'terraforming_bureau',
    'atmospheric_monitoring'
  ];
  let manager;

  beforeEach(() => {
    manager = new SolisManager();
    global.researchManager = {
      completed: [],
      completeResearchInstant(id) {
        if (!this.completed.includes(id)) {
          this.completed.push(id);
        }
      }
    };
    global.resources = { colony: { alienArtifact: { value: 0, decrease(n) { this.value -= n; } } } };
    global.globalGameIsLoadingFromSave = false;
  });

  test('auto research upgrade cost and order', () => {
    manager.solisPoints = 3000;
    order.forEach((id, idx) => {
      expect(manager.getUpgradeCost('researchUpgrade')).toBe(100 * (idx + 1));
      expect(manager.purchaseUpgrade('researchUpgrade')).toBe(true);
      expect(researchManager.completed[idx]).toBe(id);
    });
    expect(manager.purchaseUpgrade('researchUpgrade')).toBe(false);
  });

  test('reapplyEffects triggers research based on purchases', () => {
    manager.shopUpgrades.researchUpgrade.purchases = 3;
    researchManager.completed = [];
    manager.reapplyEffects();
    expect(researchManager.completed).toEqual(order.slice(0, 3));
  });

  test('donating artifacts grants points', () => {
    resources.colony.alienArtifact.value = 5;
    expect(manager.donateArtifacts(2)).toBe(true);
    expect(manager.solisPoints).toBe(200);
    expect(resources.colony.alienArtifact.value).toBe(3);
    expect(manager.donateArtifacts(10)).toBe(false);
  });
});

