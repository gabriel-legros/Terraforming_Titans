const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { calculateProjectProductivity } = require('../src/js/resource.js');

describe('project productivity', () => {
  test('uses worst ratio and leaves cost-free projects unaffected', () => {
    const resources = {
      colony: {
        energy: { value: 100 },
        metal: { value: 50 }
      }
    };
    const changes = { colony: { energy: 10, metal: 0 } };

    const costA = { colony: { energy: 200, metal: 30 } };
    const gainA = { colony: { metal: 10 } };
    const prodA = calculateProjectProductivity(resources, changes, costA, gainA);
    expect(prodA).toBeCloseTo(110 / 200);
    changes.colony.energy -= costA.colony.energy * prodA;
    changes.colony.metal -= costA.colony.metal * prodA;
    changes.colony.metal += gainA.colony.metal * prodA;

    const gainB = { colony: { energy: 10 } };
    const prodB = calculateProjectProductivity(resources, changes, {}, gainB);
    expect(prodB).toBe(1);
    changes.colony.energy += gainB.colony.energy * prodB;

    const finalEnergy = resources.colony.energy.value + changes.colony.energy;
    const finalMetal = resources.colony.metal.value + changes.colony.metal;
    expect(finalEnergy).toBeCloseTo(10);
    expect(finalMetal).toBeCloseTo(39);
  });
});
