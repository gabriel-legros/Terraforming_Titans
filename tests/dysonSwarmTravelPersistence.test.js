const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

function createNullElement() {
  const handler = {
    get: (target, prop) => {
      if (prop === 'firstChild') return null;
      if (prop === 'children' || prop === 'childNodes') return [];
      if (prop === 'classList') {
        return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
      }
      return new Proxy(function () {}, handler);
    },
    apply: () => new Proxy(function () {}, handler),
    set: () => true,
  };
  return new Proxy(function () {}, handler);
}

function runDysonTravelScenario({ preserveAutoStart = false } = {}) {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'outside-only',
    url: 'file://' + htmlPath,
  });

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
    Game: function (config) { this.config = config; },
  };
  global.Phaser = dom.window.Phaser;

  const srcRegex = /<script\s+[^>]*src=['"]([^'"]+)['"][^>]*>/gi;
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

  try {
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
      updateSpaceUI=()=>{};
      TabManager = class {};
      StoryManager = class { initializeStory(){} update(){} };
    `;
    vm.runInContext(overrides, ctx);
    vm.runInContext('initializeGameState();', ctx);
    vm.runInContext('spaceManager.updateCurrentPlanetTerraformedStatus(true);', ctx);
    vm.runInContext(
      `gameSettings.preserveProjectAutoStart = ${preserveAutoStart ? 'true' : 'false'};`,
      ctx
    );

    vm.runInContext('projectManager.projects.dysonSwarmReceiver.unlocked = true;', ctx);
    vm.runInContext('projectManager.projects.dysonSwarmReceiver.isCompleted = true;', ctx);
    vm.runInContext('projectManager.projects.dysonSwarmReceiver.collectors = 5;', ctx);
    vm.runInContext('projectManager.projects.dysonSwarmReceiver.autoDeployCollectors = true;', ctx);
    vm.runInContext('projectManager.projects.dysonSwarmReceiver.collectorProgress = 12345;', ctx);

    vm.runInContext("selectPlanet('titan');", ctx);

    const result = {
      collectors: vm.runInContext('projectManager.projects.dysonSwarmReceiver.collectors', ctx),
      unlocked: vm.runInContext('projectManager.projects.dysonSwarmReceiver.unlocked', ctx),
      completed: vm.runInContext('projectManager.projects.dysonSwarmReceiver.isCompleted', ctx),
      autoDeploy: vm.runInContext('projectManager.projects.dysonSwarmReceiver.autoDeployCollectors', ctx),
      progress: vm.runInContext('projectManager.projects.dysonSwarmReceiver.collectorProgress', ctx),
    };

    if (errors.length) {
      throw new Error('Script errors: ' + JSON.stringify(errors, null, 2));
    }

    return result;
  } finally {
    global.window = originalWindow;
    global.document = originalDocument;
    global.Phaser = originalPhaser;
    delete dom.window.Phaser;
  }
}

describe('Dyson Swarm collectors persist across planet travel', () => {
  test('collector count remains after traveling to another planet', () => {
    const result = runDysonTravelScenario({ preserveAutoStart: false });
    expect(result.collectors).toBe(5);
    expect(result.unlocked).toBe(false);
    expect(result.completed).toBe(false);
    expect(result.autoDeploy).toBe(false);
    expect(result.progress).toBe(0);
  });

  test('auto deploy collectors persist when project auto-start is preserved', () => {
    const result = runDysonTravelScenario({ preserveAutoStart: true });
    expect(result.collectors).toBe(5);
    expect(result.unlocked).toBe(false);
    expect(result.completed).toBe(false);
    expect(result.autoDeploy).toBe(true);
    expect(result.progress).toBe(0);
  });
});
