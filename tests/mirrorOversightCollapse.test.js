const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('mirror oversight collapse', () => {
  test('flux table and finer controls reside inside card body', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;

    ctx.Project = class {};
    ctx.makeCollapsibleCard = (card) => {
      const arrow = ctx.document.createElement('span');
      arrow.classList.add('collapse-arrow');
      card.querySelector('.card-header').prepend(arrow);
      arrow.addEventListener('click', () => {
        card.classList.toggle('collapsed');
      });
    };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects/SpaceMirrorFacilityProject.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.mirrorOversightSettings = ctx.createDefaultMirrorOversightSettings();
    ctx.projectManager = { isBooleanFlagSet: () => false };
    ctx.terraforming = {
      calculateZoneSolarFlux: () => 0,
      temperature: { zones: { tropical: { value: 0, day: 0 }, temperate: { value: 0, day: 0 }, polar: { value: 0, day: 0 } } }
    };
    ctx.formatNumber = n => String(n);
    ctx.toDisplayTemperature = v => v;
    ctx.getTemperatureUnit = () => 'K';

    const container = dom.window.document.getElementById('root');
    ctx.initializeMirrorOversightUI(container);

    const card = dom.window.document.getElementById('mirror-oversight-container');
    const cardBody = card.querySelector('.card-body');
    const fluxTable = dom.window.document.getElementById('mirror-flux-table');
    const finerToggle = dom.window.document.getElementById('mirror-finer-toggle');
    const finerContent = dom.window.document.getElementById('mirror-finer-content');

    expect(cardBody.contains(fluxTable)).toBe(true);
    expect(cardBody.contains(finerToggle)).toBe(true);
    expect(cardBody.contains(finerContent)).toBe(true);

    const arrow = card.querySelector('.collapse-arrow');
    arrow.dispatchEvent(new dom.window.Event('click'));
    expect(card.classList.contains('collapsed')).toBe(true);
  });
});
