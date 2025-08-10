const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('Random World Generator equilibration timeout', () => {
  beforeEach(() => {
    jest.resetModules();
    const dom = new JSDOM('<div id="rwg-result"></div>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.formatNumber = n => n;
    global.calculateAtmosphericPressure = () => 0;
    global.dayNightTemperaturesModel = () => ({ mean: 0, day: 0, night: 0 });
    global.getGameSpeed = () => 1;
    global.setGameSpeed = () => {};
    global.runEquilibration = jest.fn(async () => { throw new Error('timeout'); });
    global.deepMerge = (a, b) => ({ ...a, ...b });
    global.defaultPlanetParameters = {};
  });

  test('enables travel after timeout', async () => {
    const { renderWorldDetail, attachEquilibrateHandler, attachTravelHandler } = require('../src/js/rwgUI.js');
    const res = {
      star: { name: 'Sun', spectralType: 'G', luminositySolar: 1, massSolar: 1, temperatureK: 5800, habitableZone: { inner: 0.5, outer: 1.5 } },
      merged: {
        celestialParameters: { distanceFromSun: 1, radius: 6000, gravity: 9.8, albedo: 0.3, rotationPeriod: 24 },
        resources: {
          atmospheric: {
            carbonDioxide: { initialValue: 1 },
            inertGas: { initialValue: 1 },
            oxygen: { initialValue: 0 },
            atmosphericWater: { initialValue: 0 },
            atmosphericMethane: { initialValue: 0 }
          },
          surface: {}
        },
        classification: { archetype: 'mars-like' }
      },
      override: { resources: { atmospheric: {} } }
    };
    const box = document.getElementById('rwg-result');
    box.innerHTML = renderWorldDetail(res, 'seed-timeout', 'mars-like');
    attachEquilibrateHandler(res, 'seed-timeout', 'mars-like', box);
    attachTravelHandler(res, 'seed-timeout');

    const travelBtn = document.getElementById('rwg-travel-btn');
    expect(travelBtn.disabled).toBe(true);

    document.getElementById('rwg-equilibrate-btn').click();
    await new Promise(setImmediate);
    await new Promise(setImmediate);

    const travelBtn2 = document.getElementById('rwg-travel-btn');
    expect(travelBtn2.disabled).toBe(false);
  });
});

