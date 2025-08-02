const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('Space Storage UI', () => {
  test('shows storage stats and table with ship controls', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.projectElements = {};
    ctx.formatNumber = numbers.formatNumber;

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'spaceStorageUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.renderSpaceStorageUI = renderSpaceStorageUI; this.updateSpaceStorageUI = updateSpaceStorageUI;', ctx);

    const project = { name: 'spaceStorage', usedStorage: 0, maxStorage: 1000000000000, resourceUsage: {}, selectedResources: [], shipOperationAutoStart: false, shipOperationRemainingTime: 0, shipOperationStartingDuration: 0, shipOperationIsActive: false, shipWithdrawMode: false, prioritizeMegaProjects: false, getEffectiveDuration: () => 1000 };
    const container = dom.window.document.getElementById('container');
    ctx.renderSpaceStorageUI(project, container);
    ctx.updateSpaceStorageUI(project);

    const els = ctx.projectElements[project.name];
    expect(els.usedDisplay.textContent).toBe(String(numbers.formatNumber(0, false, 0)));
    expect(els.maxDisplay.textContent).toBe(String(numbers.formatNumber(1000000000000, false, 0)));
    expect(els.usageBody.querySelectorAll('tr').length).toBe(8);
    expect(els.usageBody.querySelector('tr:first-child td:nth-child(3)').textContent).toBe(String(numbers.formatNumber(0, false, 0)));
    expect(els.shipProgressButton).toBeDefined();
    expect(els.shipAutoStartCheckbox).toBeDefined();
    expect(els.prioritizeMegaCheckbox).toBeDefined();
    expect(els.withdrawButton).toBeDefined();
    expect(els.storeButton).toBeDefined();

    expect(els.storeButton.classList.contains('selected')).toBe(true);
    project.shipWithdrawMode = true;
    ctx.updateSpaceStorageUI(project);
    expect(els.withdrawButton.classList.contains('selected')).toBe(true);

    project.resourceUsage = { metal: 500 };
    project.usedStorage = 500;
    ctx.updateSpaceStorageUI(project);
    expect(els.usageBody.querySelectorAll('tr').length).toBe(8);
    const metalRow = Array.from(els.usageBody.querySelectorAll('tr')).find(r => r.children[1].textContent === 'Metal');
    expect(metalRow.children[2].textContent).toBe(String(numbers.formatNumber(500, false, 0)));

    els.prioritizeMegaCheckbox.checked = true;
    els.prioritizeMegaCheckbox.dispatchEvent(new dom.window.Event('change'));
    expect(project.prioritizeMegaProjects).toBe(true);
    project.prioritizeMegaProjects = false;
    ctx.updateSpaceStorageUI(project);
    expect(els.prioritizeMegaCheckbox.checked).toBe(false);
  });
});
