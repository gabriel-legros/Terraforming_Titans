const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('Random World Generator gravity tooltip', () => {
  beforeEach(() => {
    jest.resetModules();
    const dom = new JSDOM('<div id="rwg-result"></div>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.formatNumber = (value, _useSuffix = false, decimals = 0) => {
      if (Number.isFinite(value)) {
        return value.toFixed(decimals);
      }
      return value;
    };
    global.toDisplayTemperature = v => v;
    global.getTemperatureUnit = () => 'K';
    global.spaceManager = {
      isSeedTerraformed: () => false,
      isRandomTravelLocked: () => false
    };
    global.defaultPlanetParameters = { resources: { atmospheric: {} } };
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
    delete global.formatNumber;
    delete global.toDisplayTemperature;
    delete global.getTemperatureUnit;
    delete global.spaceManager;
    delete global.defaultPlanetParameters;
  });

  test('tooltip explains gravity building cost impact', () => {
    const { renderWorldDetail } = require('../src/js/rwgUI.js');
    const res = {
      seedString: 'seed-001',
      star: { name: 'Sun', spectralType: 'G', luminositySolar: 1, massSolar: 1, temperatureK: 5800 },
      orbitAU: 1,
      merged: {
        name: 'High-G Test',
        celestialParameters: {
          distanceFromSun: 1,
          radius: 6000,
          gravity: 25,
          albedo: 0.3,
          rotationPeriod: 24,
          hasNaturalMagnetosphere: false
        },
        resources: {
          surface: {},
          underground: { geothermal: { maxDeposits: 0 } },
          atmospheric: {}
        },
        classification: { archetype: 'mars-like', TeqK: 250 }
      },
      override: { finalTemps: { mean: 250, day: 260, night: 240 } }
    };

    const html = renderWorldDetail(res, 'seed-001', 'mars-like');
    document.getElementById('rwg-result').innerHTML = html;
    const chips = Array.from(document.querySelectorAll('.rwg-chip'));
    const gravityChip = chips.find(ch => ch.querySelector('.label')?.textContent === 'Gravity');
    expect(gravityChip).toBeTruthy();
    const warningIcon = gravityChip.querySelector('.info-tooltip-icon');
    expect(warningIcon).not.toBeNull();
    const title = warningIcon.getAttribute('title');
    expect(title).toContain('Construction costs climb 10% per m/s² above 10');
    expect(title).toContain('exponential surcharge');
    expect(title).toMatch(/adds [^%]+% to all building and colony costs/);
  });
});
