const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const numbers = require('../src/js/numbers.js');
const physics = require('../src/js/physics.js');
const { planetParameters } = require('../src/js/planet-parameters.js');
global.EffectableEntity = require('../src/js/effectable-entity.js');
const SpaceManager = require('../src/js/space.js');

// minimal globals for rwgUI
global.document = { addEventListener: () => {} };
global.formatNumber = numbers.formatNumber;
global.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
global.dayNightTemperaturesModel = () => ({ mean: 300, day: 310, night: 290 });

const { renderWorldDetail } = require('../src/js/rwgUI.js');

describe('rwgUI temperature display', () => {
  test('uses global Celsius setting', () => {
    global.gameSettings = { useCelsius: true };
    global.toDisplayTemperature = numbers.toDisplayTemperature;
    global.getTemperatureUnit = numbers.getTemperatureUnit;

    const sm = new SpaceManager(planetParameters);
    const res = sm.getCurrentWorldOriginal();
    const html = renderWorldDetail(res);
    const dom = new JSDOM(html);
    const chips = Array.from(dom.window.document.querySelectorAll('.rwg-chip'));
    const meanChip = chips.find(ch => ch.querySelector('.label')?.textContent === 'Mean T');
    expect(meanChip).toBeTruthy();
    expect(meanChip.querySelector('.value').textContent).toMatch(/°C/);
  });
});

