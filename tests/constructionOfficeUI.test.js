const { initializeConstructionOfficeUI, constructionOfficeState, updateConstructionOfficeUI } = require('../src/js/autobuild.js');

describe('Construction Office UI', () => {
  test('initializes card and controls', () => {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(`<!DOCTYPE html><div id="colony-controls-container"><div id="colony-sliders-container"></div><div id="construction-office-container" class="invisible"></div></div>`, { runScripts: 'outside-only' });
    global.document = dom.window.document;
    global.globalEffects = { isBooleanFlagSet: () => false };

    initializeConstructionOfficeUI();

    const container = document.getElementById('construction-office-container');
    expect(container).toBeTruthy();
    expect(container.classList.contains('invisible')).toBe(true);
    const title = container.querySelector('.card-title');
    expect(title && title.textContent).toBe('Construction Office');

    const status = document.getElementById('autobuilder-status');
    const pauseBtn = document.getElementById('autobuilder-pause-btn');
    const reserveInput = document.getElementById('strategic-reserve-input');
    const reserveLabel = reserveInput.previousSibling;
    const reserveIcon = reserveLabel.querySelector('.info-tooltip-icon');

    expect(status.textContent).toBe('active');
    expect(pauseBtn.textContent).toBe('Pause');
    expect(reserveInput.value).toBe('0');
    expect(reserveInput.nextSibling.textContent).toBe('%');
    expect(reserveIcon).toBeTruthy();
    expect(reserveIcon.getAttribute('title')).toBe('Prevents the Construction Office from using resources from storage if spending them would drop any resource below the specified percentage of its capacity.');

    pauseBtn.click();
    expect(status.textContent).toBe('disabled');
    expect(pauseBtn.textContent).toBe('Resume');
    expect(constructionOfficeState.autobuilderActive).toBe(false);

    pauseBtn.click();
    expect(status.textContent).toBe('active');
    expect(constructionOfficeState.autobuilderActive).toBe(true);

    // simulate research unlock via global flag
    global.globalEffects.isBooleanFlagSet = flag => flag === 'automateConstruction';
    updateConstructionOfficeUI();
    expect(container.classList.contains('invisible')).toBe(false);

    // simulate losing research
    global.globalEffects.isBooleanFlagSet = () => false;
    updateConstructionOfficeUI();
    expect(container.classList.contains('invisible')).toBe(true);

    // ensure the container is positioned after the sliders box
    const parentChildren = Array.from(container.parentElement.children);
    expect(parentChildren[parentChildren.length - 1]).toBe(container);
  });
});
