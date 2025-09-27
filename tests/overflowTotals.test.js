const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('overflow totals handling', () => {
  function loadResource() {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resource.js'), 'utf8');
    const ctx = { EffectableEntity: class {}, unlockResource: () => {} };
    vm.createContext(ctx);
    vm.runInContext(code + '\nthis.Resource = Resource;', ctx);
    return ctx;
  }

  test('consumption overflow not counted', () => {
    const ctx = loadResource();
    const r = new ctx.Resource({ name: 'water', displayName: 'Water', category: 'colony', hasCap: true, baseCap: 100, unlocked: true });
    r.modifyRate(-5, 'Overflow (not summed)', 'overflow');
    r.recalculateTotalRates();
    expect(r.consumptionRate).toBe(0);
    expect(r.consumptionRateBySource['Overflow (not summed)']).toBe(5);
  });

  test('production overflow counted', () => {
    const ctx = loadResource();
    const r = new ctx.Resource({ name: 'ice', displayName: 'Ice', category: 'surface', hasCap: false, baseCap: 0, unlocked: true });
    r.modifyRate(3, 'Overflow', 'overflow');
    r.recalculateTotalRates();
    expect(r.productionRate).toBe(3);
    expect(r.productionRateBySource.Overflow).toBe(3);
  });
});
