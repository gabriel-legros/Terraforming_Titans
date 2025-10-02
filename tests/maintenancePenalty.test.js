const EffectableEntity = require('../src/js/effectable-entity.js');
// Minimal globals expected by terraforming module
global.EffectableEntity = EffectableEntity;
global.lifeParameters = {};

const Terraforming = require('../src/js/terraforming.js');
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};
Terraforming.prototype.updateSurfaceRadiation = function(){};

describe('calculateMaintenancePenalty', () => {
  test('returns 1 at or below 373.15K', () => {
    const tf = { temperature: { value: 373.15 } };
    const penalty = Terraforming.prototype.calculateMaintenancePenalty.call(tf);
    expect(penalty).toBe(1);
  });

  test('increases by 1% per degree above threshold', () => {
    const tf = { temperature: { value: 473.15 } };
    const penalty = Terraforming.prototype.calculateMaintenancePenalty.call(tf);
    expect(penalty).toBeCloseTo(2);
  });
});
