const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('growth temperature tolerance display', () => {
  test('converted value has no unit', () => {
    const ctx = { EffectableEntity: class {} };
    const lifeCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'life.js'), 'utf8');
    vm.runInNewContext(lifeCode + '; this.LifeAttribute = LifeAttribute;', ctx);
    const attr = new ctx.LifeAttribute('growthTemperatureTolerance', 6, '', '', 40);
    expect(attr.getConvertedValue()).toBe('4.00');
  });

  test('growth multiplier uses base tolerance', () => {
    const ctx = {
      EffectableEntity: class {},
      formatNumber: value => value.toString(),
      toDisplayTemperature: value => value,
      getTemperatureUnit: () => 'K',
      terraforming: {
        temperature: {
          zones: {
            tropical: { day: 293.15 },
            temperate: { day: 293.15 },
            polar: { day: 293.15 }
          }
        }
      }
    };

    const lifeCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'life.js'), 'utf8');
    vm.runInNewContext(lifeCode + '; this.LifeDesign = LifeDesign;', ctx);

    const design = new ctx.LifeDesign(0, 0, 0, 0, 0, 0, 0, 0);

    expect(design.temperatureGrowthMultiplierZone('tropical')).toBeCloseTo(1, 6);

    ctx.terraforming.temperature.zones.tropical.day = 294.15;

    expect(design.temperatureGrowthMultiplierZone('tropical')).toBeCloseTo(Math.exp(-0.5), 6);
  });
});
