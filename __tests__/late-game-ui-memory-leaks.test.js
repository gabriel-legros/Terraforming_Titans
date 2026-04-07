const {
  createGameDom,
  formatLeakReport,
  loadSaveFromRelativePath,
  navigateAllTabsAndSubtabs
} = require('./helpers/jsdom-game-harness.js');

describe('late-game save UI memory harness', () => {
  jest.setTimeout(180000);

  it('loads the debug late-game save, visits every visible tab and subtab, and reports leak suspects', async () => {
    const dom = await createGameDom();

    try {
      const { window } = dom;
      loadSaveFromRelativePath(window, 'test_saves/debug/late_game_save.json');

      const report = navigateAllTabsAndSubtabs(window, {
        tickCount: 5,
        deltaMs: 10,
        stopOnFirstSuspect: true
      });

      expect(report.visitedSteps.length).toBeGreaterThan(0);

      if (report.suspects.length > 0) {
        throw new Error(formatLeakReport(report));
      }
    } finally {
      dom.window.close();
    }
  });
});
