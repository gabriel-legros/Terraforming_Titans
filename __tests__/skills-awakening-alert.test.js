const { SkillManager } = require('../src/js/skills');
const skillParameters = require('../src/js/skills-parameters');
const { notifySkillPointGained } = require('../src/js/skillsUI');

describe('Awakening alert gating', () => {
  beforeEach(() => {
    global.document = {
      getElementById: jest.fn((id) => {
        if (id === 'awakening-hope') {
          return { classList: { contains: () => false } };
        }
        return null;
      }),
    };
    global.setAwakeningSubtabAlert = jest.fn();
  });

  afterEach(() => {
    delete global.document;
    delete global.setAwakeningSubtabAlert;
    delete global.skillManager;
  });

  test('does not trigger alert when no skills can be purchased', () => {
    const manager = new SkillManager(skillParameters);
    manager.skillPoints = 1;
    Object.values(manager.skills).forEach((skill) => {
      skill.unlocked = true;
      skill.rank = skill.maxRank;
    });
    global.skillManager = manager;

    notifySkillPointGained(1);

    expect(global.setAwakeningSubtabAlert).not.toHaveBeenCalled();
  });

  test('triggers alert when a skill is available', () => {
    const manager = new SkillManager(skillParameters);
    manager.skillPoints = 1;
    global.skillManager = manager;

    notifySkillPointGained(1);

    expect(global.setAwakeningSubtabAlert).toHaveBeenCalledWith(true);
  });
});
