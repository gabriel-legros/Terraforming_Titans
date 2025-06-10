const { SkillManager } = require('../skills.js');

describe('SkillManager save/load', () => {
  beforeEach(() => {
    global.addEffect = jest.fn();
  });

  test('saves and loads skill ranks', () => {
    const data = {
      test: {
        id: 'test',
        name: 'Test Skill',
        description: 'desc',
        cost: 1,
        maxRank: 3,
        effect: { target: 'global', type: 'dummy', value: 1 }
      }
    };
    const manager = new SkillManager(data);
    manager.unlockSkill('test');
    manager.upgradeSkill('test');
    const state = manager.saveState();

    const manager2 = new SkillManager(data);
    global.addEffect = jest.fn();
    manager2.loadState(state);

    expect(manager2.skills.test.rank).toBe(2);
    expect(manager2.skills.test.unlocked).toBe(true);
  });

  test('upgrade cost scales with rank', () => {
    const data = {
      test: {
        id: 'test',
        name: 'Test Skill',
        description: 'desc',
        cost: 1,
        maxRank: 3,
        effect: { target: 'global', type: 'dummy', baseValue: 1, perRank: true }
      }
    };
    const manager = new SkillManager(data);
    expect(manager.getUpgradeCost('test')).toBe(1);
    manager.unlockSkill('test');
    expect(manager.getUpgradeCost('test')).toBe(1);
    manager.upgradeSkill('test');
    expect(manager.getUpgradeCost('test')).toBe(2);
  });

  test('reapplyEffects re-adds effects based on rank', () => {
    const data = {
      test: {
        id: 'test',
        name: 'Test Skill',
        description: 'desc',
        cost: 1,
        maxRank: 3,
        effect: { target: 'global', type: 'dummy', baseValue: 1, perRank: true }
      }
    };
    const manager = new SkillManager(data);
    manager.unlockSkill('test');
    manager.upgradeSkill('test');
    global.addEffect.mockClear();
    manager.reapplyEffects();
    expect(global.addEffect).toHaveBeenCalledWith(
      expect.objectContaining({ value: 2, sourceId: 'test' })
    );
  });
});
