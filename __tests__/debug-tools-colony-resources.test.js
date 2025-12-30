const { giveColonyResources } = require('../src/js/debug-tools.js');

test('giveColonyResources adds the amount to each colony resource', () => {
  const colonyResources = {
    metal: {
      value: 0,
      increase(amount, ignoreCap) {
        this.value += amount;
        this.ignoreCap = ignoreCap;
      }
    },
    energy: {
      value: 5,
      increase(amount, ignoreCap) {
        this.value += amount;
        this.ignoreCap = ignoreCap;
      }
    }
  };

  const amount = 1e4;
  giveColonyResources(amount, colonyResources);

  expect(colonyResources.metal.value).toBe(1e4);
  expect(colonyResources.energy.value).toBe(10005);
  expect(colonyResources.metal.ignoreCap).toBe(true);
  expect(colonyResources.energy.ignoreCap).toBe(true);
});
