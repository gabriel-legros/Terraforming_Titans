const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('Random World Generator End Early button', () => {
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
    global.deepMerge = (a, b) => ({ ...a, ...b });
    global.defaultPlanetParameters = {};
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
    delete global.formatNumber;
    delete global.calculateAtmosphericPressure;
    delete global.dayNightTemperaturesModel;
    delete global.getGameSpeed;
    delete global.setGameSpeed;
    delete global.deepMerge;
    delete global.defaultPlanetParameters;
    delete global.runEquilibration;
    delete global.spaceManager;
  });

  test('enables travel after ending early', async () => {
    const cancelTokenRef = { cancelToken: null };
    global.runEquilibration = jest.fn((override, opts, onProgress) => {
      cancelTokenRef.cancelToken = opts.cancelToken;
      return new Promise(resolve => {
        onProgress(0, { label: 'Additional fast-forward' });
        const check = () => {
          if (opts.cancelToken.endEarly) resolve({ override });
          else setTimeout(check, 0);
        };
        check();
      });
    });
    const { renderWorldDetail, attachEquilibrateHandler, attachTravelHandler } = require('../src/js/rwgUI.js');
    const res = {
      star: { name: 'Sun', spectralType: 'G', luminositySolar: 1, massSolar: 1, temperatureK: 5800, habitableZone: { inner: 0.5, outer: 1.5 } },
      merged: {
        celestialParameters: { distanceFromSun: 1, radius: 6000, gravity: 9.8, albedo: 0.3, rotationPeriod: 24 },
        resources: { atmospheric: {}, surface: {} },
        classification: { archetype: 'mars-like' }
      },
      override: { resources: { atmospheric: {} } }
    };
    const box = document.getElementById('rwg-result');
    box.innerHTML = renderWorldDetail(res, 'seed-end', 'mars-like');
    attachEquilibrateHandler(res, 'seed-end', 'mars-like', box);
    attachTravelHandler(res, 'seed-end');

    document.getElementById('rwg-equilibrate-btn').click();
    await new Promise(setImmediate);

    const endBtn = document.getElementById('rwg-end-early-btn');
    expect(endBtn).not.toBeNull();
    endBtn.click();
    await new Promise(setImmediate);
    await new Promise(setImmediate);

    const travelBtn = document.getElementById('rwg-travel-btn');
    expect(travelBtn.disabled).toBe(false);
  });
});
