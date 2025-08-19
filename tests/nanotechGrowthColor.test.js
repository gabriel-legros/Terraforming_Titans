const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Resource } = require('../src/js/resource.js');

describe('nanotech growth rate color', () => {
  test('shows orange when growth below optimal', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="colony-buildings-buttons"></div>', { runScripts: 'outside-only' });
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
    manager.growthSlider = 10;
    manager.siliconSlider = 10;
    const dt = 1000;
    const required = manager.nanobots * 1e-12 * (dt / 1000);
    const accumulated = { colony: { energy: required / 2, silicon: 0, glass: 0 } };
    manager.produceResources(dt, accumulated);
    const doc = dom.window.document;
    expect(doc.getElementById('nanobot-growth-rate').style.color).toBe('orange');
    expect(doc.getElementById('nanotech-growth-impact').style.color).toBe('orange');
    expect(doc.getElementById('nanotech-silicon-impact').style.color).toBe('orange');
  });
});
