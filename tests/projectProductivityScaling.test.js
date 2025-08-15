const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { calculateProjectProductivity } = require('../src/js/resource.js');

describe('global project productivity', () => {
  test('scales multiple project costs to available resources', () => {
    const resources = {
      colony: {
        energy: { value: 100 }
      }
    };
    const accumulatedChanges = { colony: { energy: 10 } };
    const totalCost = { colony: { energy: 200 } };
    const totalGain = {};
    const prod = calculateProjectProductivity(resources, accumulatedChanges, totalCost, totalGain);
    expect(prod.colony.energy).toBeCloseTo(110 / 200);
    const changes = { colony: { energy: 10 } };
    const projectA = (change, productivity) => {
      change.colony.energy -= 120 * productivity.colony.energy;
    };
    const projectB = (change, productivity) => {
      change.colony.energy -= 80 * productivity.colony.energy;
    };
    projectA(changes, prod);
    projectB(changes, prod);
    expect(changes.colony.energy).toBeCloseTo(10 - 200 * (110 / 200));
    resources.colony.energy.value += changes.colony.energy;
    expect(resources.colony.energy.value).toBeCloseTo(0);
  });
});
