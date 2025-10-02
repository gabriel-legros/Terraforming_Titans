const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('Space Storage superalloy option visibility', () => {
  test('option appears only after superalloy research', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.projectElements = {};
    ctx.formatNumber = numbers.formatNumber;
    ctx.resources = { colony: { metal: { displayName: 'Metal', value: 0 } } };
    ctx.researchManager = {
      unlocked: false,
      isBooleanFlagSet(flag) {
        return flag === 'superalloyResearchUnlocked' && this.unlocked;
      }
    };
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'spaceStorageUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.renderSpaceStorageUI = renderSpaceStorageUI; this.updateSpaceStorageUI = updateSpaceStorageUI;', ctx);
    const project = {
      name: 'spaceStorage',
      cost: { colony: { metal: 1 } },
      getScaledCost() { return this.cost; },
      usedStorage: 0,
      maxStorage: 100,
      resourceUsage: {},
      selectedResources: [],
      shipOperationAutoStart: false,
      shipOperationRemainingTime: 0,
      shipOperationStartingDuration: 0,
      shipOperationIsActive: false,
      shipWithdrawMode: false,
      isShipOperationContinuous: () => false,
      getEffectiveDuration: () => 1000,
      getShipOperationDuration: () => 1000,
      createSpaceshipAssignmentUI() {},
      createProjectDetailsGridUI() {},
      toggleResourceSelection() {}
    };
    const container = dom.window.document.getElementById('container');
    ctx.renderSpaceStorageUI(project, container);
    ctx.updateSpaceStorageUI(project);
    const item = dom.window.document.getElementById('spaceStorage-res-superalloys').parentElement;
    expect(item.style.display).toBe('none');
    ctx.researchManager.unlocked = true;
    ctx.updateSpaceStorageUI(project);
    expect(item.style.display).not.toBe('none');
  });
});
