const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('updatePlayTimeDisplay', () => {
  test('formats play time as years and days', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="play-time-display"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatPlayTime = numbers.formatPlayTime;
    ctx.playTimeSeconds = 730;
    ctx.DEFAULT_SURFACE_ALBEDO = require('../src/js/physics.js').DEFAULT_SURFACE_ALBEDO;
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    ctx.updatePlayTimeDisplay();
    const text = dom.window.document.getElementById('play-time-display').textContent;
    expect(text).toBe('Time since awakening : 2 years 0 days');
  });

  test('handles less than one year', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="play-time-display"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatPlayTime = numbers.formatPlayTime;
    ctx.playTimeSeconds = 40;
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    ctx.updatePlayTimeDisplay();
    const text = dom.window.document.getElementById('play-time-display').textContent;
    expect(text).toBe('Time since awakening : 40 days');
  });
});
