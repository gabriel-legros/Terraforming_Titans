const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC team logs', () => {
  test('logs stored per team and trimmed', () => {
    const wgc = new WarpGateCommand();
    for(let i=0;i<4;i++){
      wgc.recruitMember(0, i, WGCTeamMember.create('A'+i,'','Soldier',{}));
      wgc.recruitMember(1, i, WGCTeamMember.create('B'+i,'','Soldier',{}));
    }
    wgc.roll = () => ({ sum: 20, rolls: [20] });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    wgc.startOperation(0);
    wgc.startOperation(1);
    wgc.update(60000); // one minute
    expect(wgc.logs[0].length).toBe(2);
    expect(wgc.logs[1].length).toBe(2);
    // add many entries to check trimming
    for(let i=0;i<150;i++){
      wgc.addLog(0, 'entry');
    }
    expect(wgc.logs[0].length).toBeLessThanOrEqual(100);
    Math.random.mockRestore();
  });
});
