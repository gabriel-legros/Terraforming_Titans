const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('Random World Generator travel lock', () => {
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
    global.runEquilibration = jest.fn(async (override) => ({ override }));
    global.deepMerge = (a, b) => ({ ...a, ...b });
    global.defaultPlanetParameters = {};
    global.initializeGameState = jest.fn();
    global.spaceManager = {
      isSeedTerraformed: () => false,
      isRandomTravelLocked: () => true,
      travelToRandomWorld: jest.fn()
    };
  });

  test('disables travel and shows warning when locked', async () => {
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
    box.innerHTML = renderWorldDetail(res, 'seed', 'mars-like');
    attachEquilibrateHandler(res, 'seed', 'mars-like', box);
    attachTravelHandler(res, 'seed');

    let travelBtn = document.getElementById('rwg-travel-btn');
    let warning = document.getElementById('rwg-travel-warning');
    expect(travelBtn.disabled).toBe(true);
    expect(warning.textContent).toContain('You must complete the story for the current world first');

    global.spaceManager.isRandomTravelLocked = () => false;
    document.getElementById('rwg-equilibrate-btn').click();
    await new Promise(setImmediate);
    await new Promise(setImmediate);

    travelBtn = document.getElementById('rwg-travel-btn');
    warning = document.getElementById('rwg-travel-warning');
    expect(travelBtn.disabled).toBe(false);
    expect(warning).toBeNull();
  });
});
