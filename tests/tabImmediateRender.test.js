const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

function createContext() {
  const dom = new JSDOM('<!DOCTYPE html>', { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  ctx.document = dom.window.document;
  ctx.globalThis = ctx;
  ctx.updateDayNightDisplay = () => {};
  ctx.updateResourceDisplay = () => {};
  ctx.updateWarnings = () => {};
  ctx.updateBuildingAlert = () => {};
  ctx.updateProjectAlert = () => {};
  ctx.updateResearchAlert = () => {};
  ctx.updateHopeAlert = () => {};
  ctx.updateColonyDisplay = () => {};
  ctx.updateGrowthRateDisplay = () => {};
  ctx.updateColonySlidersUI = () => {};
  ctx.renderProjects = () => {};
  ctx.updateResearchUI = () => {};
  ctx.updateTerraformingUI = () => {};
  ctx.updateSpaceUI = () => {};
  ctx.updateRWGEffectsUI = () => {};
  ctx.updateHopeUI = () => {};
  ctx.updateStatisticsDisplay = () => {};
  ctx.updateMilestonesUI = () => {};
  ctx.resources = {};
  ctx.buildings = {};
  ctx.colonies = {};
  ctx.Phaser = { AUTO: 0, Game: function GameStub() { this.scene = {}; } };
  return { ctx, dom };
}

function loadGameIntoContext(ctx) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'game.js'), 'utf8');
  vm.runInContext(code + '; this.renderTabImmediately = renderTabImmediately;', ctx);
}

test('renderTabImmediately triggers a render and reactivates the current subtab', () => {
  const { ctx, dom } = createContext();
  loadGameIntoContext(ctx);

  let renderCalls = 0;
  ctx.updateRender = () => { renderCalls += 1; };

  const activated = [];
  const manager = {
    getActiveId: () => 'resource-buildings',
    activate: (id) => activated.push(id)
  };
  ctx.buildingSubtabManager = () => manager;

  ctx.renderTabImmediately('buildings');

  expect(renderCalls).toBe(1);
  expect(activated).toEqual(['resource-buildings']);

  dom.window.close();
});

test('renderTabImmediately falls back to default subtab when none is active', () => {
  const { ctx, dom } = createContext();
  loadGameIntoContext(ctx);

  let renderCalls = 0;
  ctx.updateRender = () => { renderCalls += 1; };

  const activated = [];
  const manager = {
    getActiveId: () => undefined,
    activate: (id) => activated.push(id)
  };
  ctx.buildingSubtabManager = () => manager;

  ctx.renderTabImmediately('buildings-tab');

  expect(renderCalls).toBe(1);
  expect(activated).toEqual(['resource-buildings']);

  dom.window.close();
});
