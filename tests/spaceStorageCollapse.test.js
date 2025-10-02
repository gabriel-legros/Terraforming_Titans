const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('space storage collapse', () => {
  test('mode and progress bar reside inside card body', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.projectElements = {};

    ctx.makeCollapsibleCard = (card) => {
      const arrow = ctx.document.createElement('span');
      arrow.classList.add('collapse-arrow');
      card.querySelector('.card-header').prepend(arrow);
      arrow.addEventListener('click', () => {
        card.classList.toggle('collapsed');
      });
    };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects/spaceStorageUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const container = dom.window.document.getElementById('root');
    const project = {
      name: 'test',
      shipWithdrawMode: false,
      isShipOperationContinuous: () => false,
      shipOperationIsPaused: false,
      shipOperationIsActive: false,
      startShipOperation: () => {},
      resumeShipOperation: () => {},
      toggleResourceSelection: () => {}
    };

    ctx.renderSpaceStorageUI(project, container);

    const card = container.querySelector('.space-storage-card');
    const cardBody = card.querySelector('.card-body');
    const shipFooter = card.querySelector('.card-footer');

    expect(cardBody.contains(shipFooter)).toBe(true);
    expect(shipFooter.querySelector('.progress-button')).not.toBeNull();
    expect(shipFooter.querySelector('.mode-selection')).not.toBeNull();

    const arrow = card.querySelector('.collapse-arrow');
    arrow.dispatchEvent(new dom.window.Event('click'));
    expect(card.classList.contains('collapsed')).toBe(true);
  });
});
