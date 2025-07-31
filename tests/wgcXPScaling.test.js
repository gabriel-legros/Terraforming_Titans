const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC XP scaling', () => {
  beforeEach(() => {
    global.resources = { special: { alienArtifact: { increase: jest.fn(), value: 0 } } };
  });

  test('xp rewards increase with difficulty', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      const m = WGCTeamMember.create('A' + i, '', 'Soldier', {});
      m.power = 10; m.athletics = 10; m.wit = 10;
      wgc.recruitMember(0, i, m);
    }
    wgc.roll = () => ({ sum: 20, rolls: [20] });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(wgc.startOperation(0, 3)).toBe(true);
    wgc.update(600000);
    wgc.teams[0].forEach(m => expect(m.xp).toBeCloseTo(9 * 1.3));
    Math.random.mockRestore();
  });
});
