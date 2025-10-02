const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Resource } = require('../src/js/resource.js');

describe('nanotech max color', () => {
  test('nanobot count and cap turn green when at max', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="colony-structures-section"><div id="colony-buildings-buttons"></div></div><div id="colony-controls-section"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.EffectableEntity = EffectableEntity;
    ctx.resources = {
      colony: {
        energy: new Resource({ name: 'energy', category: 'colony', initialValue: 0, hasCap: true, baseCap: 0 }),
        silicon: new Resource({ name: 'silicon', category: 'colony', initialValue: 0, hasCap: true, baseCap: 1 }),
        glass: new Resource({ name: 'glass', category: 'colony', initialValue: 0, hasCap: true, baseCap: 1 })
      },
      surface: { land: new Resource({ name: 'land', category: 'surface', initialValue: 1e9, hasCap: true, baseCap: 1e9 }) }
    };
    ctx.addEffect = () => {};
    ctx.removeEffect = () => {};
    ctx.structures = {};
    ctx.buildings = {};
    ctx.colonies = {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'nanotech.js'), 'utf8');
    vm.runInContext(code, ctx);
    const manager = ctx.nanotechManager;
    manager.enable();
    const max = manager.getMaxNanobots();
    manager.nanobots = max;
    manager.updateUI();
    const doc = dom.window.document;
    expect(doc.getElementById('nanobot-count').style.color).toBe('green');
    expect(doc.getElementById('nanobot-cap').style.color).toBe('green');
  });
});
