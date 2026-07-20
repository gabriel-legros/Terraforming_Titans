setLanguageData({
  ui: {
    hope: {
      wgcUi: {
        logs: {
          success: 'Id',
          artifactsReward: ' Enim{count} Reprehenderit',
          leaderBonus: '{skill} Irure {leader}',
          eventSummary: '{event}{roller}Lorem{rolls}Sunt {skill} Do {total}Anim id {dc} Quis {outcome}{artifact}{damage}{reroll}{critical}',
          teamOperation: 'Voluptate {team} Qui {operation} Ut {summary}',
          events: {
            individualAthletics: 'Fugiat nulla pariatur'
          }
        }
      }
    }
  }
});

hideLoadingOverlay();
document.querySelectorAll('.popup-overlay, .story-overlay').forEach(element => element.remove());

const eventName = getWGCLogText(
  'events.individualAthletics',
  'Individual Athletics Challenge'
);
const artifact = getWGCLogText('artifactsReward', ' +{count} Artifacts', {
  count: formatNumber(21, false, 2)
});
const leaderBonus = getWGCLogText('leaderBonus', ' + leader {leader}', {
  skill: formatNumber(1410, false, 2),
  leader: formatNumber(702.75, false, 2)
});
const summary = getWGCLogText(
  'eventSummary',
  '{event}{roller}: roll [{rolls}] + skill {skill}{leaderBonus} (total {total}) vs DC {difficulty} => {outcome}{artifact}{damage}{reroll}{critical}',
  {
    event: eventName,
    roller: ' (Lila)',
    rolls: '10',
    skill: formatNumber(1410, false, 2),
    leaderBonus,
    total: formatNumber(2112.75, false, 2),
    dc: formatNumber(310, false, 2),
    outcome: getWGCLogText('success', 'Success'),
    artifact,
    damage: '',
    reroll: '',
    critical: ''
  }
);
const line = getWGCLogText('teamOperation', 'Team {team} - {operation} - {summary}', {
  team: 1,
  operation: 101389,
  summary
});

const check = document.createElement('div');
check.id = 'wgc-log-localization-check';
check.className = 'team-log';
check.style.cssText = 'display:block;position:fixed;left:12px;top:12px;width:900px;max-height:none;z-index:100000;';
check.innerHTML = `<div class="team-log-content">${renderWGCLogLines([summary, line])}</div>`;
document.body.appendChild(check);
