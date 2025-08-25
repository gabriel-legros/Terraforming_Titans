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
    ctx.resources = { colony: { metal: { displayName: 'Metal' } } };
    ctx.researchManager = { isBooleanFlagSet: () => false };

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'spaceStorageUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.renderSpaceStorageUI = renderSpaceStorageUI; this.updateSpaceStorageUI = updateSpaceStorageUI;', ctx);

    const metalCost = 1000000000000;
    const project = {
      name: 'spaceStorage',
      cost: { colony: { metal: metalCost } },
      getScaledCost() { return this.cost; },
      usedStorage: 0,
      maxStorage: 1000000000000,
      resourceUsage: {},
      selectedResources: [],
      shipOperationAutoStart: false,
      shipOperationRemainingTime: 0,
      shipOperationStartingDuration: 0,
      shipOperationIsActive: false,
      shipWithdrawMode: false,
      isShipOperationContinuous: () => false,
      getEffectiveDuration: () => 2000,
      getShipOperationDuration: () => 1000,
      canStartShipOperation: () => true,
      createSpaceshipAssignmentUI(container) {
        const doc = container.ownerDocument;
        const section = doc.createElement('div');
        section.classList.add('project-section-container');
        const title = doc.createElement('h4');
        title.classList.add('section-title');
        title.textContent = 'Assignment';
        section.appendChild(title);
        container.appendChild(section);
      },
      createProjectDetailsGridUI(container) {
        const doc = container.ownerDocument;
        const section = doc.createElement('div');
        section.classList.add('project-section-container');
        const title = doc.createElement('h4');
        title.classList.add('section-title');
        title.textContent = 'Cost & Gain';
        section.appendChild(title);
        container.appendChild(section);
      },
      toggleResourceSelection() {},
    };
    const container = dom.window.document.getElementById('container');
    ctx.renderSpaceStorageUI(project, container);
    ctx.updateSpaceStorageUI(project);

    const els = ctx.projectElements[project.name];
    expect(els.usedDisplay.textContent).toBe(String(numbers.formatNumber(0, false, 0)));
    expect(els.maxDisplay.textContent).toBe(String(numbers.formatNumber(1000000000000, false, 2)));
    expect(els.expansionCostDisplay.textContent).toBe(`Metal: ${numbers.formatNumber(metalCost, true)}`);
    const items = Array.from(els.resourceGrid.querySelectorAll('.storage-resource-item'));
    expect(items.length).toBe(10);
    const superItem = dom.window.document.getElementById('spaceStorage-res-superalloys').parentElement;
    expect(superItem.style.display).toBe('none');
    const visibleItems = items.filter(i => i.style.display !== 'none');
    expect(visibleItems.length).toBe(9);
    const firstItem = visibleItems[0];
    const label = firstItem.children[1];
    const fullIcon = label.querySelector('.storage-full-icon');
    expect(fullIcon).toBeDefined();
    expect(fullIcon.style.display).toBe('none');
    expect(firstItem.children[2].textContent).toBe(String(numbers.formatNumber(0, false, 0)));
    expect(els.shipProgressButton).toBeDefined();
    expect(els.withdrawButton).toBeDefined();
    expect(els.storeButton).toBeDefined();
    expect(els.shipProgressButton.textContent).toBe('Start ship transfers (Duration: 1.00 seconds)');

    expect(els.storeButton.classList.contains('selected')).toBe(true);
    project.shipWithdrawMode = true;
    ctx.updateSpaceStorageUI(project);
    expect(els.withdrawButton.classList.contains('selected')).toBe(true);

    project.resourceUsage = { metal: 500 };
    project.usedStorage = 500;
    ctx.updateSpaceStorageUI(project);
    const updatedItems = Array.from(els.resourceGrid.querySelectorAll('.storage-resource-item'));
    const updatedVisible = updatedItems.filter(i => i.style.display !== 'none');
    expect(updatedVisible.length).toBe(9);
    const metalItem = updatedVisible[0];
    expect(metalItem.children[2].textContent).toBe(String(numbers.formatNumber(500, false, 2)));

    const topSection = container.querySelector('.project-top-section');
    const titles = Array.from(topSection.querySelectorAll('.section-title')).map(e => e.textContent);
    expect(titles).toEqual(expect.arrayContaining(['Assignment', 'Cost & Gain', 'Expansion']));
  });

  test('shows full icon when withdrawing to full colony storage', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.projectElements = {};
    ctx.formatNumber = numbers.formatNumber;
    ctx.resources = { colony: { metal: { displayName: 'Metal', hasCap: true, value: 10, cap: 10 } } };
    ctx.researchManager = { isBooleanFlagSet: () => false };

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
      toggleResourceSelection() {},
    };
    const container = dom.window.document.getElementById('container');
    ctx.renderSpaceStorageUI(project, container);
    ctx.updateSpaceStorageUI(project);

    const els = ctx.projectElements[project.name];
    const icon = els.resourceGrid.querySelector('.storage-resource-item .storage-full-icon');
    expect(icon.style.display).toBe('none');

    project.shipWithdrawMode = true;
    ctx.updateSpaceStorageUI(project);
    expect(icon.style.display).toBe('inline');
    expect(icon.title).toBe('Colony storage full');
  });

  test('water destination dropdown toggles with withdraw mode and updates project', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.projectElements = {};
    ctx.formatNumber = numbers.formatNumber;
    ctx.resources = {
      colony: { water: { hasCap: true, value: 0, cap: 10 } },
      surface: { liquidWater: { hasCap: true, value: 0, cap: 10 } }
    };
    ctx.researchManager = { isBooleanFlagSet: () => false };

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'spaceStorageUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.renderSpaceStorageUI = renderSpaceStorageUI; this.updateSpaceStorageUI = updateSpaceStorageUI;', ctx);

    const project = {
      name: 'spaceStorage',
      cost: {},
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
      waterWithdrawTarget: 'colony',
      isShipOperationContinuous: () => false,
      getEffectiveDuration: () => 1000,
      getShipOperationDuration: () => 1000,
      canStartShipOperation: () => true,
      createSpaceshipAssignmentUI() {},
      createProjectDetailsGridUI() {},
      toggleResourceSelection() {},
    };

    const container = dom.window.document.getElementById('container');
    ctx.renderSpaceStorageUI(project, container);
    ctx.updateSpaceStorageUI(project);

    const select = dom.window.document.getElementById('spaceStorage-water-destination');
    expect(select.style.display).toBe('none');

    project.shipWithdrawMode = true;
    ctx.updateSpaceStorageUI(project);
    expect(select.style.display).toBe('');
    expect(select.value).toBe('colony');

    select.value = 'surface';
    select.dispatchEvent(new dom.window.Event('change'));
    expect(project.waterWithdrawTarget).toBe('surface');

    project.shipWithdrawMode = false;
    ctx.updateSpaceStorageUI(project);
    expect(select.style.display).toBe('none');
  });
});
