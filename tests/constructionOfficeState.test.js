const {
  constructionOfficeState,
  saveConstructionOfficeState,
  loadConstructionOfficeState,
  captureConstructionOfficeSettings,
  restoreConstructionOfficeSettings,
} = require('../src/js/autobuild.js');

describe('Construction Office state persistence', () => {
  test('saves and loads state', () => {
    constructionOfficeState.autobuilderActive = false;
    constructionOfficeState.strategicReserve = 25;
    const saved = saveConstructionOfficeState();
    constructionOfficeState.autobuilderActive = true;
    constructionOfficeState.strategicReserve = 0;
    loadConstructionOfficeState(saved);
    expect(constructionOfficeState.autobuilderActive).toBe(false);
    expect(constructionOfficeState.strategicReserve).toBe(25);
  });

  test('persists through travel capture/restore', () => {
    constructionOfficeState.autobuilderActive = false;
    constructionOfficeState.strategicReserve = 55;
    const saved = captureConstructionOfficeSettings();
    constructionOfficeState.autobuilderActive = true;
    constructionOfficeState.strategicReserve = 0;
    restoreConstructionOfficeSettings(saved);
    expect(constructionOfficeState.autobuilderActive).toBe(false);
    expect(constructionOfficeState.strategicReserve).toBe(55);
  });
});
