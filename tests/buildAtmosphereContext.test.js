global.EffectableEntity = class {};
const physics = require('../src/js/physics.js');
const { buildAtmosphereContext } = require('../src/js/terraforming/terraforming.js');

describe('buildAtmosphereContext', () => {
  test('returns total and keyed pressures with availability', () => {
    const resources = {
      atmosphericWater: { value: 1 },
      carbonDioxide: { value: 2 },
      atmosphericMethane: { value: 3 },
    };
    const gravity = 10;
    const radius = 1;
    const context = buildAtmosphereContext(resources, gravity, radius);
    const waterP = physics.calculateAtmosphericPressure(1, gravity, radius);
    const co2P = physics.calculateAtmosphericPressure(2, gravity, radius);
    const methaneP = physics.calculateAtmosphericPressure(3, gravity, radius);
    expect(context.totalPressure).toBeCloseTo(waterP + co2P + methaneP);
    expect(context.pressureByKey.atmosphericWater).toBeCloseTo(waterP);
    expect(context.pressureByKey.carbonDioxide).toBeCloseTo(co2P);
    expect(context.availableByKey.atmosphericMethane).toBe(3);
  });
});
