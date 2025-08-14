const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('overflow excluded from totals', () => {
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
    r.modifyRate(-5, 'Overflow', 'overflow');
    r.recalculateTotalRates();
    expect(r.consumptionRate).toBe(0);
    expect(r.consumptionRateBySource.Overflow).toBe(5);
  });

  test('production overflow not counted', () => {
    const ctx = loadResource();
    const r = new ctx.Resource({ name: 'ice', displayName: 'Ice', category: 'surface', hasCap: false, baseCap: 0, unlocked: true });
    r.modifyRate(3, 'Overflow', 'overflow');
    r.recalculateTotalRates();
    expect(r.productionRate).toBe(0);
    expect(r.productionRateBySource.Overflow).toBe(3);
  });
});
