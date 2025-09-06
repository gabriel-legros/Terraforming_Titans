const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

test('updateRender updates colony sliders when colonies tab active', () => {
  const dom = new JSDOM('<!DOCTYPE html><div id="colonies" class="active"></div>', { runScripts: 'outside-only' });
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
  const calls = [];
  ctx.updateColonySlidersUI = () => calls.push('sliders');
  ctx.renderProjects = () => {};
  ctx.updateResearchUI = () => {};
  ctx.updateTerraformingUI = () => {};
  ctx.updateSpaceUI = () => {};
  ctx.updateHopeUI = () => {};
  ctx.updateStatisticsDisplay = () => {};
  ctx.updateMilestonesUI = () => {};
  ctx.resources = {};
  ctx.buildings = {};
  ctx.colonies = {};
  ctx.Phaser = { AUTO: 0, Game: function(){ this.scene = {}; } };

  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'game.js'), 'utf8');
  vm.runInContext(code + '; this.updateRender = updateRender;', ctx);

  ctx.updateRender();

  expect(calls).toEqual(['sliders']);
});
