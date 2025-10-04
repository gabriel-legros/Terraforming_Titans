const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC operation log details', () => {
  test('log includes roll results and DC', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      const m = WGCTeamMember.create('A'+i, '', 'Soldier', {});
      wgc.recruitMember(0, i, m);
    }
    wgc.roll = () => ({ sum: 20, rolls: [20] });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    wgc.startOperation(0);
    wgc.update(60000);
    const entry = wgc.logs[0][1];
    expect(entry).toMatch(/roll \[/i);
    expect(entry).toMatch(/DC 40/);
    Math.random.mockRestore();
  });
});
