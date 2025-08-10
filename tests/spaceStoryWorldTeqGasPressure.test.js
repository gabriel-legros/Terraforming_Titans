const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const numbers = require('../src/js/numbers.js');
const physics = require('../src/js/physics.js');
const { planetParameters } = require('../src/js/planet-parameters.js');
global.EffectableEntity = require('../src/js/effectable-entity.js');
const SpaceManager = require('../src/js/space.js');
global.document = { addEventListener: () => {} };
const { renderWorldDetail } = require('../src/js/rwgUI.js');

// Ensure dependencies on globals

global.formatNumber = numbers.formatNumber;
global.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
global.dayNightTemperaturesModel = () => ({ mean: 0, day: 0, night: 0 });

describe('story world detail', () => {
  test('includes Teq and gas pressures', () => {
    const sm = new SpaceManager(planetParameters);
    const res = sm.getCurrentWorldOriginal();
    const html = renderWorldDetail(res);
    const dom = new JSDOM(html);
    const chips = Array.from(dom.window.document.querySelectorAll('.rwg-chip'));
    const findChip = label => chips.find(ch => ch.querySelector('.label')?.textContent === label);
    const teqChip = findChip('Teq');
    const pressureChip = findChip('Pressure');
    expect(teqChip).toBeTruthy();
    expect(pressureChip).toBeFalsy();
    expect(teqChip.querySelector('.value').textContent).toMatch(/\d/);
    const co2Row = Array.from(dom.window.document.querySelectorAll('.rwg-atmo-table .rwg-row'))
      .find(row => row.children[0]?.textContent === 'CO₂');
    expect(co2Row).toBeTruthy();
    expect(co2Row.children[2].textContent).toMatch(/Pa/);
  });
});
