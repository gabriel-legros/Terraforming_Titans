const { JSDOM } = require('jsdom');

describe('renderWorldDetail surface resources', () => {
  let renderWorldDetail;
  const originalWindow = global.window;
  const originalDocument = global.document;

  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.createGravityWarning = () => '';
    global.resourcePhaseGroups = {
      water: { surfaceKeys: { liquid: 'liquidWater', ice: 'ice' } },
      carbonDioxide: { surfaceKeys: { liquid: 'liquidCO2', ice: 'dryIce' } },
      methane: { surfaceKeys: { liquid: 'liquidMethane', ice: 'hydrocarbonIce' } },
      ammonia: { surfaceKeys: { liquid: 'liquidAmmonia', ice: 'ammoniaIce' } },
    };
    jest.isolateModules(() => {
      ({ renderWorldDetail } = require('../src/js/rwg/rwgUI.js'));
    });
  });

  afterEach(() => {
    delete global.createGravityWarning;
    delete global.resourcePhaseGroups;
    global.window = originalWindow;
    global.document = originalDocument;
  });

  test('lists every non-zero liquid or ice surface resource', () => {
    const res = {
      merged: {
        name: 'Generated World',
        star: {
          name: 'Sol',
          spectralType: 'G',
          luminositySolar: 1,
          massSolar: 1,
          temperatureK: 5800,
        },
        celestialParameters: {
          radius: 6000,
          gravity: 9.8,
          albedo: 0.3,
          rotationPeriod: 24,
          distanceFromSun: 1,
        },
        resources: {
          surface: {
            land: { initialValue: 1000 },
            ice: { name: 'Ice', initialValue: 5 },
            liquidWater: { name: 'Water', initialValue: 0 },
            liquidCO2: { name: 'Liquid CO2', initialValue: 2 },
            dryIce: { name: 'Dry Ice', initialValue: 0 },
            liquidMethane: { name: 'Liquid Methane', initialValue: 0 },
            hydrocarbonIce: { name: 'Methane Ice', initialValue: 3 },
            liquidAmmonia: { name: 'Liquid Ammonia', initialValue: 4 },
            ammoniaIce: { name: 'Ammonia Ice', initialValue: 0 },
          },
          atmospheric: {},
          underground: {},
        },
        classification: {},
      },
      override: {},
      seedString: 'seed',
    };

    const html = renderWorldDetail(res, 'seed');

    expect(html).toContain('<span>Ice</span>');
    expect(html).toContain('<span>Liquid CO2</span>');
    expect(html).toContain('<span>Methane Ice</span>');
    expect(html).toContain('<span>Liquid Ammonia</span>');
    expect(html).not.toContain('<span>Water</span>');
    expect(html).not.toContain('<span>Dry Ice</span>');
    expect(html).not.toContain('<span>Liquid Methane</span>');
    expect(html).not.toContain('<span>Ammonia Ice</span>');
  });
});
