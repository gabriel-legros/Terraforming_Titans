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
      getEffectiveDuration: () => 1000,
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
    };
    const container = dom.window.document.getElementById('container');
    ctx.renderSpaceStorageUI(project, container);
    ctx.updateSpaceStorageUI(project);

    const els = ctx.projectElements[project.name];
    expect(els.usedDisplay.textContent).toBe(String(numbers.formatNumber(0, false, 0)));
    expect(els.maxDisplay.textContent).toBe(String(numbers.formatNumber(1000000000000, false, 0)));
    expect(els.expansionCostDisplay.textContent).toBe(`Metal: ${numbers.formatNumber(metalCost, true)}`);
    const items = els.resourceGrid.querySelectorAll('.storage-resource-item');
    expect(items.length).toBe(9);
    const firstItem = items[0];
    const fullIcon = firstItem.children[2];
    expect(fullIcon.classList.contains('info-tooltip-icon')).toBe(true);
    expect(fullIcon.style.display).toBe('none');
    expect(firstItem.children[3].textContent).toBe(String(numbers.formatNumber(0, false, 0)));
    expect(els.shipProgressButton).toBeDefined();
    expect(els.withdrawButton).toBeDefined();
    expect(els.storeButton).toBeDefined();

    expect(els.storeButton.classList.contains('selected')).toBe(true);
    project.shipWithdrawMode = true;
    ctx.updateSpaceStorageUI(project);
    expect(els.withdrawButton.classList.contains('selected')).toBe(true);

    project.resourceUsage = { metal: 500 };
    project.usedStorage = 500;
    ctx.updateSpaceStorageUI(project);
    const updatedItems = els.resourceGrid.querySelectorAll('.storage-resource-item');
    expect(updatedItems.length).toBe(9);
    const metalItem = updatedItems[0];
    expect(metalItem.children[3].textContent).toBe(String(numbers.formatNumber(500, false, 0)));

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
      createSpaceshipAssignmentUI() {},
      createProjectDetailsGridUI() {},
    };
    const container = dom.window.document.getElementById('container');
    ctx.renderSpaceStorageUI(project, container);
    ctx.updateSpaceStorageUI(project);

    const els = ctx.projectElements[project.name];
    const icon = els.resourceGrid.querySelector('.storage-resource-item .info-tooltip-icon');
    expect(icon.style.display).toBe('none');

    project.shipWithdrawMode = true;
    ctx.updateSpaceStorageUI(project);
    expect(icon.style.display).toBe('inline');
    expect(icon.title).toBe('Colony storage full');
  });
});
