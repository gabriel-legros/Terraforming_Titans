const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('Solis points display', () => {
  test('shows two decimal places', () => {
    const dom = new JSDOM('<!DOCTYPE html><span id="solis-points-value"></span>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.solisManager = {
      solisPoints: 1.2345,
      isBooleanFlagSet: () => false,
      getCurrentReward: () => 0,
      refreshCooldown: 0,
      lastRefreshTime: 0,
      postCompletionCooldownUntil: 0,
      questInterval: 0,
      currentQuest: null,
      shopUpgrades: {},
      getUpgradeCost: () => 0,
    };
    ctx.resources = { special: { alienArtifact: { value: 0 } }, colony: {} };
    ctx.formatNumber = numbers.formatNumber;

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'solisUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    ctx.updateSolisUI();
    expect(dom.window.document.getElementById('solis-points-value').textContent).toBe('1.23');
  });
});
