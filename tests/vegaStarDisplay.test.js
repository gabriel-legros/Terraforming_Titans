const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const numbers = require('../src/js/numbers.js');

describe('Vega-2 star details', () => {
  beforeEach(() => {
    jest.resetModules();
    global.document = { addEventListener: () => {} };
    global.formatNumber = numbers.formatNumber;
    global.calculateAtmosphericPressure = () => 0;
    global.dayNightTemperaturesModel = () => ({ mean: 0, day: 0, night: 0 });
  });

  test('Space UI original includes Vega star info', () => {
    const { planetParameters } = require('../src/js/planet-parameters.js');
    const EffectableEntity = require('../src/js/effectable-entity.js');
    global.EffectableEntity = EffectableEntity;
    const SpaceManager = require('../src/js/space.js');
    const { renderWorldDetail } = require('../src/js/rwgUI.js');
    const sm = new SpaceManager(planetParameters);
    sm.currentPlanetKey = 'vega2';
    const original = sm.getCurrentWorldOriginal();
    expect(original.star.name).toBe('Vega');
    const html = renderWorldDetail(original);
    const dom = new JSDOM(html);
    const starHeading = Array.from(dom.window.document.querySelectorAll('.rwg-card h3')).find(h => h.textContent.startsWith('Star:'));
    expect(starHeading).toBeTruthy();
    expect(starHeading.textContent).toBe('Star: Vega');
    delete global.EffectableEntity;
  });
});
