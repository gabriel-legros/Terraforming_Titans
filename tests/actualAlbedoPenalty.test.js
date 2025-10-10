describe('actual albedo penalty', () => {
  global.EffectableEntity = class {};
  const Terraforming = require('../src/js/terraforming/terraforming.js');

  test('equals the difference between actual and surface albedo', () => {
    const original = global.calculateActualAlbedoPhysics;
    global.calculateActualAlbedoPhysics = () => ({
      albedo: 0.85,
      components: { A_surf: 0.3, dA_ch4: 0.4, dA_calcite: 0.2, dA_cloud: 0.2 }
    });

    try {
      const stub = {
        calculateSurfaceAlbedo: () => 0.3,
        calculateTotalPressure: () => 100,
        calculateAtmosphericComposition: () => ({ composition: {} }),
        celestialParameters: { gravity: 9.81, radius: 1 },
        resources: { atmospheric: {} }
      };

      const result = Terraforming.prototype.calculateActualAlbedo.call(stub);

      expect(result.albedo).toBeCloseTo(0.85, 10);
      expect(result.penalty).toBeCloseTo(0.55, 10);
      expect(result.albedo).toBeCloseTo(stub.calculateSurfaceAlbedo() + result.penalty, 10);
    } finally {
      global.calculateActualAlbedoPhysics = original;
    }
  });
});
