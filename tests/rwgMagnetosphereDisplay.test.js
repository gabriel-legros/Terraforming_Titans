const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const numbers = require('../src/js/numbers.js');
const physics = require('../src/js/physics.js');

describe('Random World Generator magnetosphere display', () => {
  beforeEach(() => {
    jest.resetModules();
    global.document = { addEventListener: () => {} };
    global.formatNumber = numbers.formatNumber;
    global.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
    global.dayNightTemperaturesModel = () => ({ mean: 300, day: 310, night: 290 });
  });

  function buildRes(hasMag) {
    return {
      star: { name: 'Sun', spectralType: 'G', luminositySolar: 1, massSolar: 1, temperatureK: 5800 },
      seedString: '1',
      orbitAU: 1,
      merged: {
        celestialParameters: {
          distanceFromSun: 1,
          radius: 6000,
          gravity: 9.8,
          albedo: 0.3,
          rotationPeriod: 24,
          hasNaturalMagnetosphere: hasMag
        },
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
      }
    };
  }

  test('shows when a world has a magnetosphere', () => {
    const { renderWorldDetail } = require('../src/js/rwgUI.js');
    const res = buildRes(true);
    const html = renderWorldDetail(res, 'seed', 'mars-like');
    const dom = new JSDOM(html);
    const chips = Array.from(dom.window.document.querySelectorAll('.rwg-chip'));
    const chip = chips.find(ch => ch.querySelector('.label')?.textContent === 'Magnetosphere');
    expect(chip).toBeTruthy();
    expect(chip.querySelector('.value').textContent).toBe('Yes');
  });

  test('shows when a world lacks a magnetosphere', () => {
    const { renderWorldDetail } = require('../src/js/rwgUI.js');
    const res = buildRes(false);
    const html = renderWorldDetail(res, 'seed', 'mars-like');
    const dom = new JSDOM(html);
    const chips = Array.from(dom.window.document.querySelectorAll('.rwg-chip'));
    const chip = chips.find(ch => ch.querySelector('.label')?.textContent === 'Magnetosphere');
    expect(chip).toBeTruthy();
    expect(chip.querySelector('.value').textContent).toBe('No');
  });
});
