const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('factory automation settings integrate with save system', () => {
  test('late factory registration still saves automation settings', () => {
    const ctx = { console };
    ctx.globalThis = ctx;
    ctx.JSON = JSON;

    ctx.dayNightCycle = { saveState: () => ({}), loadState: () => {} };
    ctx.resources = {};
    ctx.buildings = {};
    ctx.colonies = {};
    ctx.projectManager = { saveState: () => ({}) };
    ctx.researchManager = { saveState: () => ({}) };
    ctx.oreScanner = { saveState: () => ({}) };
    ctx.terraforming = { saveState: () => ({}) };
    ctx.storyManager = { saveState: () => ({}), loadState: () => {}, appliedEffects: [], reapplyEffects: () => {} };
    ctx.journalEntrySources = [];
    ctx.journalHistorySources = [];
    ctx.goldenAsteroid = { saveState: () => ({}) };
    ctx.nanotechManager = { saveState: () => ({}) };
    ctx.solisManager = { saveState: () => ({}) };
    ctx.warpGateCommand = { saveState: () => ({}) };
    ctx.lifeDesigner = { saveState: () => ({}) };
    ctx.milestonesManager = { saveState: () => ({}) };
    ctx.skillManager = { saveState: () => ({}) };
    ctx.spaceManager = { saveState: () => ({}) };
    ctx.selectedBuildCounts = {};
    ctx.gameSettings = {};
    ctx.colonySliderSettings = { saveState: () => ({}) };
    ctx.saveConstructionOfficeState = () => ({}) ;
    ctx.playTimeSeconds = 0;
    ctx.totalPlayTimeSeconds = 0;
    ctx.document = { getElementById: () => null, body: { classList: { toggle: () => {} } } };

    const saveCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'save.js'), 'utf8');
    vm.createContext(ctx);
    vm.runInContext(`${saveCode}; this.getGameStateRef = getGameState;`, ctx);

    class FakeGhgFactory {
      static getAutomationSettings() {
        if (!this.settings) {
          this.settings = {
            autoDisableAboveTemp: false,
            disableTempThreshold: 280,
            reverseTempThreshold: 285
          };
        }
        return this.settings;
      }
      static saveAutomationSettings() {
        const s = this.getAutomationSettings();
        return {
          autoDisableAboveTemp: !!s.autoDisableAboveTemp,
          disableTempThreshold: s.disableTempThreshold,
          reverseTempThreshold: s.reverseTempThreshold
        };
      }
      static loadAutomationSettings(saved) {
        const s = this.getAutomationSettings();
        if (saved && typeof saved === 'object') {
          if ('autoDisableAboveTemp' in saved) s.autoDisableAboveTemp = !!saved.autoDisableAboveTemp;
          if ('disableTempThreshold' in saved) s.disableTempThreshold = saved.disableTempThreshold;
          if ('reverseTempThreshold' in saved) s.reverseTempThreshold = saved.reverseTempThreshold;
        }
        return s;
      }
    }

    class FakeOxygenFactory {
      static getAutomationSettings() {
        if (!this.settings) {
          this.settings = {
            autoDisableAbovePressure: false,
            disablePressureThreshold: 15
          };
        }
        return this.settings;
      }
      static saveAutomationSettings() {
        const s = this.getAutomationSettings();
        return {
          autoDisableAbovePressure: !!s.autoDisableAbovePressure,
          disablePressureThreshold: s.disablePressureThreshold
        };
      }
      static loadAutomationSettings(saved) {
        const s = this.getAutomationSettings();
        if (saved && typeof saved === 'object') {
          if ('autoDisableAbovePressure' in saved) s.autoDisableAbovePressure = !!saved.autoDisableAbovePressure;
          if ('disablePressureThreshold' in saved) s.disablePressureThreshold = saved.disablePressureThreshold;
        }
        return s;
      }
    }

    ctx.GhgFactory = FakeGhgFactory;
    ctx.ghgFactorySettings = FakeGhgFactory.getAutomationSettings();
    ctx.OxygenFactory = FakeOxygenFactory;
    ctx.oxygenFactorySettings = FakeOxygenFactory.getAutomationSettings();

    ctx.ghgFactorySettings.autoDisableAboveTemp = true;
    ctx.oxygenFactorySettings.autoDisableAbovePressure = true;

    const snapshot = ctx.getGameStateRef();

    expect(snapshot.ghgFactorySettings).toEqual({
      autoDisableAboveTemp: true,
      disableTempThreshold: 280,
      reverseTempThreshold: 285
    });
    expect(snapshot.oxygenFactorySettings).toEqual({
      autoDisableAbovePressure: true,
      disablePressureThreshold: 15
    });
  });
});
