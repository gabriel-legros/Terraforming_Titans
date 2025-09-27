const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { calculateProjectProductivities } = require('../src/js/resource.js');

describe('project productivity', () => {
  test('uses worst ratio and leaves cost-free projects unaffected', () => {
    const resources = {
      colony: {
        energy: { value: 100 },
        metal: { value: 50 }
      }
    };
    const changes = { colony: { energy: 10, metal: 0 } };

    const projectData = {
      A: { project: { isContinuous: () => true }, cost: { colony: { energy: 200, metal: 30 } }, gain: { colony: { metal: 10 } } },
      B: { project: { isContinuous: () => true }, cost: {}, gain: { colony: { energy: 10 } } },
    };
    const productivities = calculateProjectProductivities(resources, changes, projectData);
    expect(productivities.A).toBeCloseTo(110 / 200);
    expect(productivities.B).toBe(1);
    changes.colony.energy -= projectData.A.cost.colony.energy * productivities.A;
    changes.colony.metal -= projectData.A.cost.colony.metal * productivities.A;
    changes.colony.metal += projectData.A.gain.colony.metal * productivities.A;

    changes.colony.energy += projectData.B.gain.colony.energy * productivities.B;

    const finalEnergy = resources.colony.energy.value + changes.colony.energy;
    const finalMetal = resources.colony.metal.value + changes.colony.metal;
    expect(finalEnergy).toBeCloseTo(10);
    expect(finalMetal).toBeCloseTo(39);
  });
});
