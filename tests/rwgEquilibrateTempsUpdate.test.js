const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('Random World Generator equilibrate updates temperatures', () => {
  beforeEach(() => {
    jest.resetModules();
    const dom = new JSDOM('<div id="rwg-result"></div>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.formatNumber = n => n;
    global.toDisplayTemperature = v => v;
    global.getTemperatureUnit = () => 'K';
    global.calculateAtmosphericPressure = () => 0;
    global.dayNightTemperaturesModel = ({ composition }) => {
      return composition.co2 > 0.5
        ? { mean: 250, day: 260, night: 240 }
        : { mean: 200, day: 210, night: 190 };
    };
    global.getGameSpeed = () => 1;
    global.setGameSpeed = () => {};
    global.runEquilibration = jest.fn(async () => ({
      override: {
        classification: { TeqK: 150 },
        celestialParameters: { albedo: 0.1 },
        resources: { atmospheric: { carbonDioxide: { initialValue: 0 } }, surface: {} },
        finalTemps: { mean: 200, day: 210, night: 190 }
      }
    }));
    global.deepMerge = (a, b) => ({ ...a, ...b });
    global.defaultPlanetParameters = {};
  });

  function findChipValue(label) {
    const chips = Array.from(document.querySelectorAll('.rwg-chip'));
    const chip = chips.find(ch => ch.querySelector('.label')?.textContent === label);
    return chip?.querySelector('.value')?.textContent;
  }

  test('updates temperature displays after equilibration', async () => {
    const { renderWorldDetail, attachEquilibrateHandler } = require('../src/js/rwgUI.js');
    const res = {
      star: { name: 'Sun', spectralType: 'G', luminositySolar: 1, massSolar: 1, temperatureK: 5800, habitableZone: { inner: 0.5, outer: 1.5 } },
      orbitAU: 1,
      merged: {
        celestialParameters: { distanceFromSun: 1, radius: 6000, gravity: 9.8, albedo: 0.3, rotationPeriod: 24 },
        resources: {
          atmospheric: {
            carbonDioxide: { initialValue: 1 },
            inertGas: { initialValue: 0 },
            oxygen: { initialValue: 0 },
            atmosphericWater: { initialValue: 0 },
            atmosphericMethane: { initialValue: 0 }
          },
          surface: {}
        },
        classification: { archetype: 'mars-like', TeqK: 100 }
      },
      override: {
        resources: { atmospheric: {} },
        finalTemps: { mean: 250, day: 260, night: 240 }
      }
    };
    const box = document.getElementById('rwg-result');
    box.innerHTML = renderWorldDetail(res, 'seed', 'mars-like');
    attachEquilibrateHandler(res, 'seed', 'mars-like', box);

    expect(findChipValue('Teq')).toBe('100 K');
    expect(findChipValue('Mean T')).toBe('250 K');
    expect(findChipValue('Day T')).toBe('260 K');
    expect(findChipValue('Night T')).toBe('240 K');

    document.getElementById('rwg-equilibrate-btn').click();
    await new Promise(setImmediate);

    expect(findChipValue('Teq')).toBe('150 K');
    expect(findChipValue('Mean T')).toBe('200 K');
    expect(findChipValue('Day T')).toBe('210 K');
    expect(findChipValue('Night T')).toBe('190 K');
  });
});
