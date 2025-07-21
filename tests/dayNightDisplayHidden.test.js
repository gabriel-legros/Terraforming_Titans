const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const { updateDayNightDisplay } = require('../src/js/day-night-cycle.js');

describe('day-night display hidden', () => {
  test('progress bar hidden when setting disabled', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="day-night-progress-bar-container"><span id="progress-text"></span><div id="day-night-progress-bar"></div></div>', { runScripts: 'outside-only' });
    global.document = dom.window.document;
    global.dayNightCycle = { isDay: () => true, getDayProgress: () => 0 };
    global.gameSettings = { disableDayNightCycle: true };

    updateDayNightDisplay();
    const container = dom.window.document.querySelector('.day-night-progress-bar-container');
    expect(container.style.display).toBe('none');
  });
});
