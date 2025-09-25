const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('colony need box cache', () => {
  test('caches child nodes and rebuilds on invalidation', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.updateUnhideButtons = () => {};
    ctx.resources = { colony: { energy: { displayName: 'Energy' }, electronics: { displayName: 'Electronics' } } };
    ctx.luxuryResources = { electronics: true };
    ctx.colonies = {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonyUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const structure = {
      name: 'colony1',
      happiness: 0.5,
      baseComfort: 0.6,
      filledNeeds: { energy: 0.8 },
      consumption: { colony: { energy: { amount: 1 } } },
      luxuryResourcesEnabled: { electronics: true },
      getComfort() {
        return this.baseComfort;
      },
      getConsumption() {
        const clone = {};
        for (const category in this.consumption || {}) {
          clone[category] = { ...this.consumption[category] };
        }
        return clone;
      },
      getConsumptionResource(category, resource) {
        return this.consumption?.[category]?.[resource] || { amount: 0 };
      }
    };

    const row = dom.window.document.createElement('div');
    const details = ctx.createColonyDetails(structure);
    row.appendChild(details);

    expect(structure.needBoxCache.energy).toBeDefined();
    const cached = structure.needBoxCache.energy;
    expect(cached.fill.style.width).toBe('80%');

    structure.filledNeeds.energy = 0.4;
    ctx.updateColonyDetailsDisplay(row, structure);
    expect(cached.fill.style.width).toBe('40%');

    structure.filledNeeds.electronics = 1;
    structure.consumption.colony.electronics = { amount: 1 };
    ctx.updateColonyDetailsDisplay(row, structure);
    expect(structure.needBoxCache.electronics).toBeDefined();
    expect(structure.needBoxCache.energy.fill.style.width).toBe('40%');
    expect(row.textContent).toContain('Electronics');
  });
});
