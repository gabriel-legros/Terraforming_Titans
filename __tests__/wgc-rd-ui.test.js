const { formatRDUpgradeBuyButtonText, getRDUpgradeCurrentAndNext } = require('../src/js/wgc/wgcUI.js');

describe('WGC R&D shop buy button text', () => {
  test('formats efficiency upgrades as multiplier preview', () => {
    expect(formatRDUpgradeBuyButtonText('componentsEfficiency', 0, 400, 1)).toBe('Buy (1) x1.00 -> x1.01');
    expect(formatRDUpgradeBuyButtonText('componentsEfficiency', 99, 400, 100)).toBe('Buy (100) x1.99 -> x2.00');
  });

  test('formats equipment upgrades as percent preview', () => {
    expect(formatRDUpgradeBuyButtonText('wgtEquipment', 0, 900, 1)).toBe('Buy (1) +0.0% -> +0.1%');
  });

  test('formats superalloy efficiency as integer multiplier', () => {
    expect(formatRDUpgradeBuyButtonText('superalloyEfficiency', 0, 999, 1)).toBe('Buy (1) x1.00 -> x2.00');
    expect(formatRDUpgradeBuyButtonText('superalloyEfficiency', 4, 999, 5)).toBe('Buy (5) x5.00 -> x6.00');
  });

  test('shows maxed state without next preview', () => {
    expect(formatRDUpgradeBuyButtonText('wgtEquipment', 900, 900, 901)).toBe('Maxed (+90.0%)');
    expect(getRDUpgradeCurrentAndNext('wgtEquipment', 900, 900).isMaxed).toBe(true);
  });
});

