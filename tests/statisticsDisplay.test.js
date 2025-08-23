const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('updateStatisticsDisplay', () => {
  test('formats total play time', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="total-playtime-display"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatPlayTime = numbers.formatPlayTime;
    ctx.totalPlayTimeSeconds = 730;
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'save.js'), 'utf8');
    vm.runInContext(code, ctx);
    ctx.updateStatisticsDisplay();
    const text = dom.window.document.getElementById('total-playtime-display').textContent;
    expect(text).toBe('2 years 0 days');
  });
});
