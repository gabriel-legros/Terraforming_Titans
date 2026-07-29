const {
  createGameDom,
  loadSaveFromRelativePath,
} = require('./helpers/jsdom-game-harness.js');

describe('Mirror and lantern productivity tooltips', () => {
  it('identifies Advanced Oversight as the limiting factor', async () => {
    const dom = await createGameDom();
    try {
      const { window } = dom;
      loadSaveFromRelativePath(window, 'test_saves/debug/oversight4.json');

      window.eval(`
        mirrorOversightSettings.advancedOversight = true;
        mirrorOversightSettings.applyToLantern = true;
        mirrorOversightSettings.allowAvailableToHeat = false;
        mirrorOversightSettings.assignments.mirrors = {};
        mirrorOversightSettings.assignments.lanterns = {};
        mirrorOversightSettings.availableHeating = { mirrors: 0, lanterns: 0 };
        buildings.spaceMirror.updateProductivity(resources, 1000);
        buildings.hyperionLantern.updateProductivity(resources, 1000);
      `);

      for (const name of ['spaceMirror', 'hyperionLantern']) {
        const tooltip = window.eval(`buildStructureProductivityTooltip(buildings.${name})`);
        const factors = window.eval(`buildings.${name}.productivityLimitInfo.factors`);

        expect(factors).toEqual(expect.arrayContaining([
          expect.objectContaining({ type: 'advancedOversight', ratio: 0 }),
        ]));
        expect(tooltip).toContain('Advanced Oversight allocation: 0% of facility capacity.');
        expect(tooltip).not.toContain('No limiting factor found.');
      }
    } finally {
      dom.window.close();
    }
  }, 60000);
});
