const { createGameDom, loadSaveFromRelativePath, advanceTicks } = require('./helpers/jsdom-game-harness');

describe('tmp junk cleanup verify', () => {
  jest.setTimeout(120000);

  it('verifies junk value cleanup after short ticks', async () => {
    const dom = await createGameDom();
    const { window } = dom;

    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      loadSaveFromRelativePath(window, 'test_saves/flashing_junk.json');
      await new Promise(resolve => setTimeout(resolve, 50));

      const deltas = [10, 20, 30, 10, 30];
      const snapshots = [];
      for (const delta of deltas) {
        advanceTicks(window, 1, delta);
        const row = window.document.getElementById('junk-container');
        snapshots.push({
          delta,
          value: window.resources.surface.junk.value,
          valueText: window.document.getElementById('junk-resources-container')?.textContent ?? null,
          rowDisplay: row ? row.style.display : null
        });
      }

      console.log(JSON.stringify(snapshots, null, 2));
      expect(snapshots.length).toBe(deltas.length);
    } finally {
      dom.window.close();
    }
  });
});
