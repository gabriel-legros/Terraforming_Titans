const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));

function setup() {
  const ctx = {
    console,
    document: {
      addEventListener: () => {},
      getElementById: () => null
    },
    formatNumber: n => n,
    calculateAtmosphericPressure: () => 0,
    dayNightTemperaturesModel: () => ({ mean: 0, day: 0, night: 0 }),
    toDisplayTemperature: v => v,
    getTemperatureUnit: () => 'K',
    equilibratedWorlds: new Set()
  };
  vm.createContext(ctx);
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwgUI.js'), 'utf8');
  vm.runInContext(code, ctx);
  return ctx;
}

describe('RWG UI small resource display', () => {
  test('hides surface resources flagged with hideWhenSmall when value is tiny', () => {
    const ctx = setup();
    const res = {
      merged: {
        name: 'Tiny Resource World',
        celestialParameters: {
          gravity: 9.5,
          radius: 6200,
          albedo: 0.3,
          rotationPeriod: 24,
          distanceFromSun: 1
        },
        classification: { archetype: 'mars-like' },
        resources: {
          surface: {
            land: { initialValue: 5e7 },
            ice: { initialValue: 1e6 },
            liquidWater: { initialValue: 2e6 },
            dryIce: { initialValue: 0, hideWhenSmall: true },
            liquidMethane: { initialValue: 5e-5, hideWhenSmall: true },
            hydrocarbonIce: { initialValue: 5e3 }
          },
          atmospheric: {}
        }
      },
      orbitAU: 1,
      star: {
        name: 'Test Star',
        spectralType: 'G',
        luminositySolar: 1,
        massSolar: 1,
        temperatureK: 5800
      }
    };

    const html = ctx.renderWorldDetail(res, 'seed');
    const dom = new JSDOM(html);
    const surfaceSection = Array.from(dom.window.document.querySelectorAll('.rwg-columns > div'))
      .find(col => col.querySelector('h4')?.textContent === 'Surface');
    const labels = surfaceSection
      ? Array.from(surfaceSection.querySelectorAll('.rwg-row span:first-child')).map(el => el.textContent)
      : [];

    expect(labels).toContain('Land (ha)');
    expect(labels).toContain('Water');
    expect(labels).not.toContain('Dry Ice');
    expect(labels).not.toContain('Liquid CH₄');
  });

  test('hides atmospheric resources flagged with hideWhenSmall when value is tiny', () => {
    const ctx = setup();
    const res = {
      merged: {
        name: 'Thin Air World',
        celestialParameters: {
          gravity: 9.5,
          radius: 6200,
          albedo: 0.3,
          rotationPeriod: 24,
          distanceFromSun: 1
        },
        classification: { archetype: 'mars-like' },
        resources: {
          surface: {
            land: { initialValue: 5e7 },
            ice: { initialValue: 1e6 },
            liquidWater: { initialValue: 2e6 }
          },
          atmospheric: {
            carbonDioxide: { initialValue: 1e6 },
            inertGas: { initialValue: 5e5 },
            hydrogen: { initialValue: 0, hideWhenSmall: true },
            atmosphericMethane: { initialValue: 0, hideWhenSmall: true }
          }
        }
      },
      orbitAU: 1,
      star: {
        name: 'Test Star',
        spectralType: 'G',
        luminositySolar: 1,
        massSolar: 1,
        temperatureK: 5800
      }
    };

    const html = ctx.renderWorldDetail(res, 'seed');
    const dom = new JSDOM(html);
    const atmoSection = Array.from(dom.window.document.querySelectorAll('.rwg-columns > div'))
      .find(col => col.querySelector('h4')?.textContent === 'Atmosphere');
    const labels = atmoSection
      ? Array.from(atmoSection.querySelectorAll('.rwg-row span:first-child')).map(el => el.textContent)
      : [];

    expect(labels).toContain('CO₂');
    expect(labels).not.toContain('H₂');
    expect(labels).not.toContain('CH₄');
  });
});
