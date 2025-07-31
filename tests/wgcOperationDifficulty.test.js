const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC operation difficulty', () => {
  test('difficulty scales artifact chance', () => {
    const event = { name: 'Indiv', type: 'individual', skill: 'athletics' };
    const wgc0 = new WarpGateCommand();
    for (let i=0;i<4;i++) {
      const m = WGCTeamMember.create('A'+i,'','Soldier',{});
      m.athletics = 10;
      wgc0.recruitMember(0,i,m);
    }
    wgc0.roll = () => 10;
    jest.spyOn(Math, 'random').mockReturnValue(0.11);
    wgc0.startOperation(0,0);
    wgc0.resolveEvent(0,event);
    expect(wgc0.operations[0].artifacts).toBe(0);

    const wgc2 = new WarpGateCommand();
    for (let i=0;i<4;i++) {
      const m = WGCTeamMember.create('B'+i,'','Soldier',{});
      m.athletics = 10;
      wgc2.recruitMember(0,i,m);
    }
    wgc2.roll = () => 10;
    Math.random.mockReturnValue(0.11);
    wgc2.startOperation(0,2);
    wgc2.resolveEvent(0,event);
    expect(wgc2.operations[0].artifacts).toBe(1);
    Math.random.mockRestore();
  });

  test('failed challenges deal damage', () => {
    const eventInd = { name: 'Indiv', type: 'individual', skill: 'athletics' };
    const eventTeam = { name: 'Team', type: 'team', skill: 'power' };
    const wgc = new WarpGateCommand();
    for (let i=0;i<4;i++) {
      const m = WGCTeamMember.create('C'+i,'','Soldier',{});
      wgc.recruitMember(0,i,m);
    }
    wgc.roll = () => 1;
    jest.spyOn(Math, 'random').mockReturnValue(0);
    wgc.startOperation(0,3);
    const member = wgc.teams[0][0];
    wgc.resolveEvent(0,eventInd);
    expect(member.health).toBe(70);
    wgc.resolveEvent(0,eventTeam);
    expect(wgc.teams[0][0].health).toBe(60);
    wgc.teams[0].slice(1).forEach(m => expect(m.health).toBe(90));
    Math.random.mockRestore();
  });
});
