const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('growth temperature tolerance display', () => {
  test('converted value has no unit', () => {
    const ctx = { EffectableEntity: class {} };
    const lifeCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'life.js'), 'utf8');
    vm.runInNewContext(lifeCode + '; this.LifeAttribute = LifeAttribute;', ctx);
    const attr = new ctx.LifeAttribute('growthTemperatureTolerance', 6, '', '', 40);
    expect(attr.getConvertedValue()).toBe('3.00');
  });
});
