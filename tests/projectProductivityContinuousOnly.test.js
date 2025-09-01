const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { calculateProjectProductivities } = require('../src/js/resource.js');

describe('project productivity continuous filter', () => {
  test('ignores non-continuous projects when calculating productivity', () => {
    const resources = { colony: { energy: { value: 100 } } };
    const changes = { colony: { energy: 0 } };
    const projectData = {
      continuous: {
        project: { isContinuous: () => true },
        cost: { colony: { energy: 200 } },
        gain: {},
      },
      discrete: {
        project: { isContinuous: () => false },
        cost: { colony: { energy: 200 } },
        gain: {},
      },
    };
    const productivities = calculateProjectProductivities(resources, changes, projectData);
    expect(productivities.continuous).toBeCloseTo(0.5);
    expect(productivities.discrete).toBeUndefined();
  });
});

