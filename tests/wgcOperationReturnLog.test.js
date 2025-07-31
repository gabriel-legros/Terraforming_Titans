const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC operation return log', () => {
  beforeEach(() => {
    global.resources = { special: { alienArtifact: { increase: jest.fn(), value: 0 } } };
  });

  test('log lists xp and artifacts on completion', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      const m = WGCTeamMember.create('A' + i, '', 'Soldier', {});
      m.power = 10; m.athletics = 10; m.wit = 10;
      wgc.recruitMember(0, i, m);
    }
    wgc.roll = () => ({ sum: 20, rolls: [20] });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    wgc.startOperation(0);
    wgc.update(600000);
    const log = wgc.logs[0].join('\n');
    expect(log).toMatch(/\+9 XP/);
    expect(log).toMatch(/9 artifact/);
    Math.random.mockRestore();
  });
});
