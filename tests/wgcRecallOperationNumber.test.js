const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC recall increments operation number', () => {
  test('recalling and restarting increments op number', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A' + i, '', 'Soldier', {}));
    }
    expect(wgc.startOperation(0)).toBe(true);
    expect(wgc.operations[0].number).toBe(1);
    wgc.recallTeam(0);
    expect(wgc.startOperation(0)).toBe(true);
    expect(wgc.operations[0].number).toBe(2);
  });
});
