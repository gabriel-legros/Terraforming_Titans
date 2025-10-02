const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

function setup() {
  const ctx = {
    console,
    document: { addEventListener: () => {} },
    formatNumber: n => n,
    calculateAtmosphericPressure: () => 0,
    dayNightTemperaturesModel: () => ({ mean: 0, day: 0, night: 0 }),
    toDisplayTemperature: v => v,
    getTemperatureUnit: () => 'K',
    equilibratedWorlds: new Set(['seed'])
  };
  vm.createContext(ctx);
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwgUI.js'), 'utf8');
  vm.runInContext(code, ctx);
  return ctx;
}

describe('RWG gravity warning icon', () => {
  test('renderWorldDetail shows warning for high gravity and not for low', () => {
    const ctx = setup();
    const baseRes = {
      merged: { celestialParameters: { gravity: 12, radius: 6000, albedo: 0 }, name: 'Test', resources: {} },
      orbitAU: 1,
      star: { name: 'Sun', spectralType: 'G', luminositySolar: 1, massSolar: 1, temperatureK: 5800 }
    };
    let html = ctx.renderWorldDetail(baseRes, 'seed');
    let dom = new JSDOM(html);
    let chip = Array.from(dom.window.document.querySelectorAll('.rwg-chip')).find(ch => ch.querySelector('.label')?.textContent === 'Gravity');
    let icon = chip.querySelector('.info-tooltip-icon');
    expect(icon).not.toBeNull();
    expect(icon.textContent).toBe('⚠');
    const penalty = Math.min((12 - 10) * 5, 100);
    expect(icon.getAttribute('title')).toContain(`${ctx.formatNumber(penalty)}%`);

    baseRes.merged.celestialParameters.gravity = 9;
    html = ctx.renderWorldDetail(baseRes, 'seed');
    dom = new JSDOM(html);
    chip = Array.from(dom.window.document.querySelectorAll('.rwg-chip')).find(ch => ch.querySelector('.label')?.textContent === 'Gravity');
    icon = chip.querySelector('.info-tooltip-icon');
    expect(icon).toBeNull();
  });

  test('renderPlanetCard warns for high gravity only', () => {
    const ctx = setup();
    const cardHtml = ctx.renderPlanetCard({ merged: { celestialParameters: { gravity: 12, radius: 1, albedo: 0 }, name: 'A' } }, 0);
    let dom = new JSDOM(cardHtml);
    let icon = dom.window.document.querySelector('.info-tooltip-icon');
    expect(icon).not.toBeNull();
    expect(icon.textContent).toBe('⚠');
    const penalty = Math.min((12 - 10) * 5, 100);
    expect(icon.getAttribute('title')).toContain(`${ctx.formatNumber(penalty)}%`);

    const safeHtml = ctx.renderPlanetCard({ merged: { celestialParameters: { gravity: 9, radius: 1, albedo: 0 }, name: 'B' } }, 0);
    dom = new JSDOM(safeHtml);
    icon = dom.window.document.querySelector('.info-tooltip-icon');
    expect(icon).toBeNull();
  });
});

