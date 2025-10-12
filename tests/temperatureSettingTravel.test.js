const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('temperature setting persists across planet travel', () => {
  test('traveling does not reset Celsius display', () => {
    const htmlPath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      runScripts: 'outside-only',
      url: 'file://' + htmlPath,
    });

    function createNullElement() {
      const handler = {
        get: (target, prop) => {
          if (prop === 'firstChild') return null;
          if (prop === 'children' || prop === 'childNodes') return [];
          if (prop === 'classList') return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
          return new Proxy(function () {}, handler);
        },
        apply: () => new Proxy(function () {}, handler),
        set: () => true,
      };
      return new Proxy(function () {}, handler);
    }
    const nullElement = createNullElement();
    const doc = dom.window.document;
    doc.createElement = () => nullElement;
    doc.getElementById = () => nullElement;
    doc.querySelector = () => nullElement;
    doc.querySelectorAll = () => [];
    doc.getElementsByClassName = () => [];
    doc.addEventListener = () => {};
    doc.removeEventListener = () => {};
    doc.body.appendChild = () => nullElement;
    doc.body.removeChild = () => nullElement;

    const originalWindow = global.window;
    const originalDocument = global.document;
    const originalPhaser = global.Phaser;

    global.window = dom.window;
    global.document = dom.window.document;
    dom.window.Phaser = {
      AUTO: 'AUTO',
      Game: function (config) { this.config = config; },
    };
    global.Phaser = dom.window.Phaser;

    const srcRegex = /<script\s+[^>]*src=['\"]([^'\"]+)['\"][^>]*>/gi;
    const sources = [];
    let match;
    while ((match = srcRegex.exec(html)) !== null) {
      if (!/^https?:\/\//.test(match[1])) {
        sources.push(match[1]);
      }
    }

    const ctx = dom.getInternalVMContext();
    ctx.structuredClone = structuredClone;
    const errors = [];
    for (const src of sources) {
      const file = path.join(__dirname, '..', src);
      const code = fs.readFileSync(file, 'utf8');
      try {
        vm.runInContext(code, ctx);
      } catch (err) {
        errors.push({ script: src, message: err.message });
      }
    }

    const overrides = `
      createResourceDisplay=()=>{};
      createBuildingButtons=()=>{};
      createColonyButtons=()=>{};
      initializeResearchUI=()=>{};
      initializeLifeUI=()=>{};
      createMilestonesUI=()=>{};
      updateDayNightDisplay=()=>{};
      addEffect=()=>{};
      removeEffect=()=>{};
      TabManager = class {};
      StoryManager = class { initializeStory(){} update(){} };
    `;
    vm.runInContext(overrides, ctx);

    vm.runInContext('initializeGameState();', ctx);
    vm.runInContext('gameSettings.useCelsius = true;', ctx);
    vm.runInContext('spaceManager.updateCurrentPlanetTerraformedStatus(true);', ctx);
    vm.runInContext("selectPlanet('titan');", ctx);

    const useCelsius = vm.runInContext('gameSettings.useCelsius', ctx);
    const unit = vm.runInContext('getTemperatureUnit()', ctx);

    global.window = originalWindow;
    global.document = originalDocument;
    global.Phaser = originalPhaser;
    delete dom.window.Phaser;

    if (errors.length) {
      throw new Error('Script errors: ' + JSON.stringify(errors, null, 2));
    }

    expect(useCelsius).toBe(true);
    expect(unit).toBe('\u00B0C');
  });
});
