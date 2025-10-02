const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('saveGameToFile', () => {
  test('filename defaults to world name and timestamp', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'save.js'), 'utf8');
    const anchor = { href: '', download: '', click: jest.fn() };
    const ctx = {
      console,
      getGameState: () => ({}),
      spaceManager: { getCurrentWorldName: () => 'Mars Base' },
      document: { createElement: () => anchor, addEventListener: jest.fn() },
      URL: {
        createObjectURL: () => 'blob:url',
        revokeObjectURL: jest.fn(),
      },
      Blob: function(parts, options) { return { parts, options }; },
    };
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    ctx.saveGameToFile();
    expect(anchor.download).toMatch(/^Mars_Base_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    expect(anchor.download.endsWith('.json')).toBe(true);
  });
});
