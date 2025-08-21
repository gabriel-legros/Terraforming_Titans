const EffectableEntity = require('../src/js/effectable-entity.js');
// Minimal globals expected by terraforming module
global.EffectableEntity = EffectableEntity;
global.lifeParameters = {};

const Terraforming = require('../src/js/terraforming.js');
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};
Terraforming.prototype.updateSurfaceRadiation = function(){};

describe('calculateColonyEnergyPenalty', () => {
  test('returns 1 within 15°C to 20°C range', () => {
    const tf = { temperature: { zones: {
      tropical: { value: 290 },
      temperate: { value: 291 },
      polar: { value: 292 }
    } } };
    const penalty = Terraforming.prototype.calculateColonyEnergyPenalty.call(tf);
    expect(penalty).toBe(1);
  });

  test('scales with temperature above 20°C', () => {
    const temp = 300; // Kelvin
    const expected = 1 + (temp - 293.15) / 10;
    const tf = { temperature: { zones: {
      tropical: { value: temp },
      temperate: { value: temp },
      polar: { value: temp }
    } } };
    const penalty = Terraforming.prototype.calculateColonyEnergyPenalty.call(tf);
    expect(penalty).toBeCloseTo(expected);
  });

  test('scales with temperature below 15°C', () => {
    const temp = 280; // Kelvin
    const expected = 1 + (288.15 - temp) / 10;
    const tf = { temperature: { zones: {
      tropical: { value: temp },
      temperate: { value: temp },
      polar: { value: temp }
    } } };
    const penalty = Terraforming.prototype.calculateColonyEnergyPenalty.call(tf);
    expect(penalty).toBeCloseTo(expected);
  });
});
