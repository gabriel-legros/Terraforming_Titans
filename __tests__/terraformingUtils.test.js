const { getZonePercentage } = require('../zones.js');
// Provide global function required by terraforming.js
global.getZonePercentage = getZonePercentage;
const EffectableEntity = require('../effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const lifeParameters = require('../life-parameters.js');
global.lifeParameters = lifeParameters;
const Terraforming = require('../terraforming.js');

// Disable expensive updates that rely on global resources
Terraforming.prototype.updateLuminosity = function() {};
Terraforming.prototype.updateSurfaceTemperature = function() {};

describe('Terraforming _calculateZonalCoverage', () => {
  test('handles missing zonal data gracefully', () => {
    const terra = new Terraforming({}, { radius: 10 });
    terra.zonalWater = {}; // no data for zones
    terra.zonalSurface = {};
    expect(() => terra._calculateZonalCoverage('tropical', 'liquidWater')).not.toThrow();
    expect(terra._calculateZonalCoverage('tropical', 'liquidWater')).toBe(0);
  });

  test('computes surface area from radius during initialization', () => {
    const terra = new Terraforming({}, { radius: 10 });
    const expected = 4 * Math.PI * Math.pow(10 * 1000, 2);
    expect(terra.celestialParameters.surfaceArea).toBeCloseTo(expected, 5);
  });
});
