const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const { updateDayNightDisplay, resetDayNightContainerCache } = require('../src/js/day-night-cycle.js');

describe('day-night display container caching', () => {
  test('uses cached container until reset', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="day-night-progress-bar-container"><span id="progress-text"></span><div id="day-night-progress-bar"></div></div>', { runScripts: 'outside-only' });
    global.document = dom.window.document;
    global.dayNightCycle = { isDay: () => true, getDayProgress: () => 0 };
    global.gameSettings = {};

    updateDayNightDisplay();
    const first = dom.window.document.querySelector('.day-night-progress-bar-container');
    first.remove();
    dom.window.document.body.innerHTML += '<div class="day-night-progress-bar-container" style="display:none"><span id="progress-text"></span><div id="day-night-progress-bar"></div></div>';
    const second = dom.window.document.querySelector('.day-night-progress-bar-container');

    updateDayNightDisplay();
    expect(second.style.display).toBe('none');

    resetDayNightContainerCache();
    updateDayNightDisplay();
    expect(second.style.display).toBe('block');

    delete global.document;
    delete global.dayNightCycle;
    delete global.gameSettings;
  });
});

