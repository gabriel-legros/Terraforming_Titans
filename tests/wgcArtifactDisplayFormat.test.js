const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('WGC artifact display', () => {
  test('uses formatNumber with two decimals', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="wgc-stat-artifact"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);
    const numbersCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'numbers.js'), 'utf8');
    vm.runInContext(numbersCode, ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'wgcUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);
    ctx.warpGateCommand = { totalArtifacts: 1.2345, totalOperations: 0, highestDifficulty: 0, facilityCooldown: 0 };
    ctx.updateWGCUI();
    const artEl = dom.window.document.getElementById('wgc-stat-artifact');
    expect(artEl.textContent).toBe('Artifacts Collected: 1.23');
  });
});
