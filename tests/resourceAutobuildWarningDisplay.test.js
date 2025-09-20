const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('resource autobuild warning display', () => {
  function setup() {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = n => String(n);
    ctx.formatBigInteger = n => String(n);
    ctx.formatBuildingCount = n => String(n);
    ctx.formatResourceDetails = () => '';
    ctx.formatStorageDetails = () => '';
    ctx.updateColonyDetailsDisplay = () => {};
    ctx.updateUnhideButtons = () => {};
    ctx.globalEffects = { isBooleanFlagSet: () => false };
    ctx.dayNightCycle = { isNight: () => false, isDay: () => true };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    return { dom, ctx };
  }

  test('toggles exclamation mark when autobuild shortage changes', () => {
    const { dom, ctx } = setup();
    const metal = {
      name: 'metal',
      displayName: 'Metal',
      category: 'colony',
      value: 10,
      cap: 100,
      hasCap: true,
      unlocked: true,
      hideWhenSmall: false,
      hideRate: false,
      productionRate: 0,
      consumptionRate: 0,
      productionRateByType: {},
      consumptionRateByType: {},
      isBooleanFlagSet: () => false,
      autobuildShortage: true,
    };
    const resourceMap = { colony: { metal } };

    ctx.createResourceDisplay(resourceMap);
    ctx.resources = resourceMap;
    ctx.updateResourceDisplay(resourceMap);

    const warning = dom.window.document.getElementById('metal-autobuild-warning');
    expect(warning.textContent).toBe('!');
    expect(warning.style.display).toBe('inline');

    metal.autobuildShortage = false;
    ctx.updateResourceDisplay(resourceMap);

    expect(warning.textContent).toBe('');
    expect(warning.style.display).toBe('none');
  });
});
