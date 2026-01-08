const { formatWGCDifficultyDisplay } = require('../src/js/wgc/wgcUI.js');

describe('Warp Gate Command difficulty display', () => {
  test('shows next difficulty when inactive', () => {
    expect(formatWGCDifficultyDisplay(5, 3, false)).toBe('5');
  });

  test('shows next difficulty when current matches', () => {
    expect(formatWGCDifficultyDisplay(4, 4, true)).toBe('4');
  });

  test('shows next with current in parentheses when different', () => {
    expect(formatWGCDifficultyDisplay(15, 13, true)).toBe('15 (13)');
  });
});
