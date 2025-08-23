const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

test('initializeGameState resets colony sliders to defaults', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'outside-only',
    url: 'file://' + htmlPath,
  });

  function createNullElement() {
    return new Proxy(function () {}, {
      get: () => createNullElement(),
      apply: () => createNullElement(),
      set: () => true,
    });
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

  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalPhaser = global.Phaser;

  global.window = dom.window;
  global.document = dom.window.document;
  dom.window.Phaser = {
    AUTO: 'AUTO',
    Game: function(config){ this.config = config; },
  };
  global.Phaser = dom.window.Phaser;

  const srcRegex = /<script\s+[^>]*src=['"]([^'"#]+)['"][^>]*>/gi;
  const sources = [];
  let match;
  while ((match = srcRegex.exec(html)) !== null) {
    if (!/^https?:\/\//.test(match[1])) {
      sources.push(match[1]);
    }
  }

  const ctx = dom.getInternalVMContext();
  ctx.structuredClone = structuredClone;
  ctx.colonySliderSettings = { workerRatio: 0.7, foodConsumption: 2, luxuryWater: 3, oreMineWorkers: 5 };

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
    initializeSpaceUI=()=>{};
    updateDayNightDisplay=()=>{};
    addEffect=()=>{};
    removeEffect=()=>{};
    TabManager = class {};
    StoryManager = class { initializeStory(){} update(){} };
  `;
  vm.runInContext(overrides, ctx);

  vm.runInContext('initializeGameState();', ctx);

  const settings = vm.runInContext('colonySliderSettings', ctx);
  const oversight = vm.runInContext('mirrorOversightSettings', ctx);

  global.window = originalWindow;
  global.document = originalDocument;
  global.Phaser = originalPhaser;

  if (errors.length) {
    throw new Error('Script errors: ' + JSON.stringify(errors, null, 2));
  }

  expect(settings).toEqual({ workerRatio: 0.5, foodConsumption: 1, luxuryWater: 1, oreMineWorkers: 0 });
  expect(oversight).toEqual({
    distribution: { tropical: 0, temperate: 0, polar: 0, focus: 0 },
    applyToLantern: false,
    useFinerControls: false,
    assignmentStep: 1,
    autoAssign: { tropical: false, temperate: false, polar: false, focus: false, any: false },
    assignments: {
      mirrors: { tropical: 0, temperate: 0, polar: 0, focus: 0, any: 0 },
      lanterns: { tropical: 0, temperate: 0, polar: 0, focus: 0, any: 0 }
    },
    manualAssignments: {
      mirrors: { tropical: 0, temperate: 0, polar: 0, focus: 0, any: 0 },
      lanterns: { tropical: 0, temperate: 0, polar: 0, focus: 0, any: 0 }
    }
  });
});
