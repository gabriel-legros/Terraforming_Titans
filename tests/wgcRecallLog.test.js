const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC recall logs Recalled', () => {
  test('recalling operation adds log entry', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A' + i, '', 'Soldier', {}));
    }
    wgc.startOperation(0);
    wgc.recallTeam(0);
    const logs = wgc.logs[0];
    expect(logs[logs.length - 1]).toBe('Team 1 - Recalled');
  });
});
