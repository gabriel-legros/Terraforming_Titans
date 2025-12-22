const { autoUpgradeColonies } = require('../src/js/autobuild');

describe('autobuild colony upgrades', () => {
  beforeEach(() => {
    global.colonies = {
      t2_colony: { unlocked: true }
    };
  });

  test('auto-upgrade converts remaining colonies below 10', () => {
    const structure = {
      isHidden: false,
      autoUpgradeEnabled: true,
      count: 5,
      getNextTierName: () => 't2_colony',
      canAffordUpgrade: jest.fn(() => true),
      upgrade: jest.fn(() => true)
    };

    autoUpgradeColonies({ t1_colony: structure });

    expect(structure.canAffordUpgrade).toHaveBeenCalledWith(1);
    expect(structure.upgrade).toHaveBeenCalledWith(1);
  });
});
