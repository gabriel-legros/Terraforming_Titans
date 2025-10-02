const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Solis artifact donation UI', () => {
  test('displays owned artifacts from special resources', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="wrapper"><div id="solis-donation-items"></div></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.solisManager = {
      isBooleanFlagSet: () => true,
      solisPoints: 0,
      rewardMultiplier: 1,
      currentQuest: null,
      refreshCooldown: 0,
      lastRefreshTime: 0,
      postCompletionCooldownUntil: 0,
      questInterval: 0,
      shopUpgrades: {},
      getUpgradeCost: () => 0,
      donateArtifacts: n => { ctx.resources.special.alienArtifact.value -= n; }
    };
    ctx.resources = { special: { alienArtifact: { value: 4 } } };

    const numbersCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'numbers.js'), 'utf8');
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'solisUI.js'), 'utf8');
    vm.runInContext(numbersCode + '\n' + uiCode, ctx);

    ctx.initializeSolisUI();
    ctx.updateSolisUI();

    const count = dom.window.document.getElementById('solis-donation-count').textContent;
    expect(count).toBe('4.00');
  });

  test('shows scaled points per artifact', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="wrapper"><div id="solis-donation-items"></div></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.solisManager = {
      isBooleanFlagSet: () => true,
      solisPoints: 0,
      rewardMultiplier: 5,
      getTerraformedWorldBonus: () => 2,
      currentQuest: null,
      refreshCooldown: 0,
      lastRefreshTime: 0,
      postCompletionCooldownUntil: 0,
      questInterval: 0,
      shopUpgrades: {},
      getUpgradeCost: () => 0,
      donateArtifacts: () => {}
    };
    ctx.resources = { special: { alienArtifact: { value: 0 } } };

    const numbersCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'numbers.js'), 'utf8');
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'solisUI.js'), 'utf8');
    vm.runInContext(numbersCode + '\n' + uiCode, ctx);

    ctx.initializeSolisUI();
    ctx.updateSolisUI();

    const label = dom.window.document.getElementById('solis-donation-label').textContent;
    expect(label).toBe('Donate artifacts for 20.00 Solis points each');
  });
});
