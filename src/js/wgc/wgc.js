const isNodeWGC = (typeof module !== 'undefined' && module.exports);
if (typeof globalThis.WGCTeamMember === 'undefined' && isNodeWGC) {
  try {
    globalThis.WGCTeamMember = require('./team-member.js').WGCTeamMember;
  } catch (e) {}
}

if (typeof globalThis.formatNumber === 'undefined') {
  try {
    if (typeof require !== 'undefined') {
      globalThis.formatNumber = require('../numbers.js').formatNumber;
    }
  } catch (e) {}
  if (typeof globalThis.formatNumber === 'undefined') {
    globalThis.formatNumber = v => v;
  }
}

const baseOperationEvents = [
  { name: 'Team Power Challenge', type: 'team', skill: 'power', weight: 1 },
  { name: 'Team Athletics Challenge', type: 'team', skill: 'athletics', weight: 1 },
  { name: 'Team Wits Challenge', type: 'team', skill: 'wit', weight: 1 },
  { name: 'Individual Athletics Challenge', type: 'individual', skill: 'athletics', weight: 1 },
  { name: 'Natural Science challenge', type: 'science', specialty: 'Natural Scientist', escalate: true, weight: 1, artifactMultiplier: 2 },
  { name: 'Social Science challenge', type: 'science', specialty: 'Social Scientist', escalate: true, weight: 1 },
  { name: 'Combat challenge', type: 'combat', weight: 1 }
];

const operationStartText = 'Setting out through Warp Gate';

const defaultTeamNames = ['Alpha', 'Beta', 'Gamma', 'Delta'];
const facilityLabels = {
  shootingRange: 'Shooting Range',
  obstacleCourse: 'Obstacle Course',
  library: 'Library'
};

const baseEventTemplatesByName = baseOperationEvents.reduce((map, evt) => {
  map[evt.name] = evt;
  return map;
}, Object.create(null));

const operationStoriesModulePaths = [
  '../../../assets/wgc_ops/operation_stories.js',
  '../../../assets/wgc_ops/operation_stories.json'
];
let cachedOperationStories = null;

function ensureOperationStoriesLoaded() {
  if (Array.isArray(cachedOperationStories)) {
    return cachedOperationStories;
  }
  if (typeof window !== 'undefined' && window && Array.isArray(window.WGC_OPERATION_STORIES)) {
    cachedOperationStories = window.WGC_OPERATION_STORIES;
    return cachedOperationStories;
  }
  if (isNodeWGC) {
    for (const path of operationStoriesModulePaths) {
      try {
        const data = require(path);
        cachedOperationStories = Array.isArray(data) ? data : [];
        return cachedOperationStories;
      } catch (err) {}
    }
    cachedOperationStories = [];
    return cachedOperationStories;
  }
  cachedOperationStories = [];
  return cachedOperationStories;
}

function getOperationStories() {
  const stories = ensureOperationStoriesLoaded();
  if (Array.isArray(stories) && stories.length > 0) {
    return stories;
  }
  return null;
}

function replaceStoryPlaceholders(line, team, selected) {
  if (!line) return '';
  const roster = Array.isArray(team) ? team : [];
  let formatted = line.replace(/\$TEAM_MEMBER_([1-4])/g, (_, rawIndex) => {
    const index = parseInt(rawIndex, 10) - 1;
    const member = roster[index];
    if (member && member.firstName) return member.firstName;
    return `Member ${rawIndex}`;
  });
  const preferred = selected && selected.firstName ? selected.firstName : (roster[0] && roster[0].firstName ? roster[0].firstName : 'Operative');
  formatted = formatted.replace(/\$TEAM_MEMBER_SELECTED/g, preferred);
  return formatted;
}

class WarpGateCommand extends EffectableEntity {
  constructor() {
    super({ description: 'Warp Gate Command manager' });
    this.enabled = false;
    this.teams = Array.from({ length: 4 }, () => Array(4).fill(null));
    this.operations = Array.from({ length: 4 }, () => ({
      active: false,
      progress: 0,
      timer: 0,
      difficulty: 0,
      artifacts: 0,
      successes: 0,
      summary: '',
      number: 1,
      nextEvent: 60,
      eventQueue: [],
      currentEventIndex: 0,
      baseEventsTotal: 10,
      baseEventsCompleted: 0,
      progressStartValue: 0,
      progressTargetValue: 0,
      progressIntervalStart: 0,
      progressIntervalDuration: 0,
      nextDifficultyModifier: 1,
      nextArtifactModifier: 1,
      facilityRerolls: {
        shootingRange: 0,
        obstacleCourse: 0,
        library: 0
      },
      criticalSuccessCount: 0,
      criticalSuccessWeight: 0
    }));
    this.teamOperationCounts = Array(4).fill(0);
    this.teamNextOperationNumber = Array(4).fill(1);
    this.logs = Array.from({ length: 4 }, () => []);
    this.stances = Array.from({ length: 4 }, () => ({ hazardousBiomass: 'Neutral', artifact: 'Neutral' }));
    this.totalOperations = 0;
    this.totalArtifacts = 0;
    this.highestDifficulty = -1;
    this.rdUpgrades = {
      wgtEquipment: { purchases: 0, max: 900 },
      componentsEfficiency: { purchases: 0, max: 400 },
      electronicsEfficiency: { purchases: 0, max: 400 },
      superconductorEfficiency: { purchases: 0, max: 400 },
      androidsEfficiency: { purchases: 0, max: 400 },
      superalloyEfficiency: { purchases: 0, max: 999, enabled: false },
      foodProduction: { purchases: 0, max: 400 },
    };
    this.facilities = {
      infirmary: 0,
      barracks: 0,
      shootingRange: 0,
      obstacleCourse: 0,
      library: 0,
    };
    this.facilityCooldown = 0;
    this.teamNames = defaultTeamNames.slice();
    this.hideStoryLogs = false;
    ensureOperationStoriesLoaded();
  }

  addLog(teamIndex, text) {
    if (!Array.isArray(this.logs[teamIndex])) return;
    const log = this.logs[teamIndex];
    log.push(text);
    if (log.length > 100) log.shift();
    if (typeof invalidateWGCTeamCache === 'function') {
      invalidateWGCTeamCache();
    }
    if (typeof queueWGCLogScroll === 'function') {
      queueWGCLogScroll(teamIndex);
    }
  }

  chooseEvent(teamIndex = 0) {
    const events = baseOperationEvents.map(ev => ({ ...ev }));
    const weightedEvents = events.filter(e => (e.weight ?? 1) > 0);
    const total = weightedEvents.reduce((s, e) => s + (e.weight ?? 1), 0);
    let r = Math.random() * total;
    let selected = weightedEvents[0] || null;
    for (const ev of weightedEvents) {
      r -= ev.weight ?? 1;
      if (r < 0) {
        selected = ev;
        break;
      }
    }
    return this.applyStanceDifficulty(selected, teamIndex);
  }

  applyStanceDifficulty(event, teamIndex) {
    if (!event) return event;
    const stanceObj = this.stances && this.stances[teamIndex] ? this.stances[teamIndex] : null;
    let modifier = 1;
    if (stanceObj && stanceObj.hazardousBiomass) {
      const stance = stanceObj.hazardousBiomass;
      if (stance === 'Negotiation') {
        if (event.name === 'Social Science challenge') modifier *= 0.9;
        if (event.type === 'combat') modifier *= 1.1;
      } else if (stance === 'Aggressive') {
        if (event.name === 'Social Science challenge') modifier *= 1.25;
        if (event.type === 'combat') modifier *= 0.85;
      } else if (stance === 'Recon') {
        if (event.type === 'combat') modifier *= 0.85;
        if (event.skill === 'athletics') modifier *= 1.25;
        if (event.skill === 'wit') modifier *= 0.9;
      }
    }
    event.stanceDifficultyModifier = modifier;
    return event;
  }

  cloneEvent(event) {
    if (!event) return null;
    return { ...event };
  }

  generateOperationEvents(op, teamIndex, count = 10) {
    const list = [];
    const stories = getOperationStories();
    if (stories && stories.length > 0) {
      const selected = stories[Math.floor(Math.random() * stories.length)];
      const storyEvents = selected && Array.isArray(selected.events) ? selected.events.slice(0, count) : [];
      if (storyEvents.length === count) {
        let invalid = false;
        for (let i = 0; i < storyEvents.length; i += 1) {
          const storyEvent = storyEvents[i];
          const template = baseEventTemplatesByName[storyEvent.name] || null;
          const event = template ? { ...template } : { name: storyEvent.name };
          if (storyEvent.type) event.type = storyEvent.type;
          if (storyEvent.skill) event.skill = storyEvent.skill;
          if (storyEvent.specialty) event.specialty = storyEvent.specialty;
          if (Array.isArray(storyEvent.lines) && storyEvent.lines.length > 0) {
            event.storyLines = storyEvent.lines.slice();
          }
          event.storyStep = storyEvent.step || (list.length + 1);
          event.isBase = true;
          if (!event.type) {
            invalid = true;
            break;
          }
          this.applyStanceDifficulty(event, teamIndex);
          list.push(event);
        }
        if (invalid) {
          list.length = 0;
        }
      }
    }
    if (list.length !== count) {
      list.length = 0;
      for (let i = 0; i < count; i++) {
        const event = this.cloneEvent(this.chooseEvent(teamIndex));
        if (event) {
          event.isBase = true;
          list.push(event);
        }
      }
    }
    return list;
  }

  logStoryStep(teamIndex, op, event, roller) {
    if (this.hideStoryLogs) return;
    if (!event || !Array.isArray(event.storyLines) || event.storyLines.length === 0) return;
    const team = this.teams[teamIndex];
    const operationNumber = op && op.number ? op.number : '?';
    const baseStep = Number.isFinite(event.storyStep) ? event.storyStep : (op && Number.isFinite(op.baseEventsCompleted) ? op.baseEventsCompleted + 1 : 1);
    const formattedLines = event.storyLines.map(line => {
      const formatted = replaceStoryPlaceholders(line, team, roller);
      return formatted ? formatted.trim() : '';
    }).filter(text => text);
    if (formattedLines.length === 0) return;
    const paragraph = formattedLines.join(' ');
    this.addLog(teamIndex, `Team ${teamIndex + 1} - Op ${operationNumber} - Story Step ${baseStep}: ${paragraph}`);
  }

  getEventDelay(event, teamIndex) {
    if (event && event.type === 'science' && event.specialty === 'Natural Scientist') {
      const stance = this.stances && this.stances[teamIndex] ? this.stances[teamIndex].artifact : 'Neutral';
      if (stance === 'Careful') return 180;
      if (stance === 'Rapid Extraction') return 30;
    }
    return 60;
  }

  findNextBaseEventIndex(op) {
    if (!op || !Array.isArray(op.eventQueue)) return -1;
    for (let i = op.currentEventIndex; i < op.eventQueue.length; i++) {
      const evt = op.eventQueue[i];
      if (evt && evt.isBase) return i;
    }
    return -1;
  }

  refreshOperationProgress(op, teamIndex) {
    if (!op) return;
    if (!Number.isFinite(op.baseEventsTotal) || op.baseEventsTotal <= 0) {
      op.baseEventsTotal = 10;
    }
    if (!Number.isFinite(op.baseEventsCompleted) || op.baseEventsCompleted < 0) {
      op.baseEventsCompleted = 0;
    }
    op.baseEventsCompleted = Math.min(op.baseEventsCompleted, op.baseEventsTotal);
    const startFraction = op.baseEventsCompleted / op.baseEventsTotal;
    op.progressStartValue = startFraction;
    op.progressIntervalStart = op.timer;
    let targetFraction = startFraction;
    let duration = 0;
    const nextBaseIndex = this.findNextBaseEventIndex(op);
    if (op.active && op.baseEventsCompleted < op.baseEventsTotal && nextBaseIndex !== -1) {
      const nextFraction = (op.baseEventsCompleted + 1) / op.baseEventsTotal;
      if (nextBaseIndex === op.currentEventIndex) {
        targetFraction = nextFraction;
        duration = Math.max(op.nextEvent - op.timer, 0);
      }
    }
    op.progressTargetValue = targetFraction;
    op.progressIntervalDuration = duration;
    if (!Number.isFinite(op.progress) || op.progress < startFraction) {
      op.progress = startFraction;
    }
  }

  calculateOperationProgress(op) {
    if (!op || !op.active) return 0;
    const start = Number.isFinite(op.progressStartValue) ? op.progressStartValue : 0;
    const target = Number.isFinite(op.progressTargetValue) ? op.progressTargetValue : start;
    if (!Number.isFinite(op.progressIntervalDuration) || op.progressIntervalDuration <= 0 || target <= start) {
      return Math.min(1, Math.max(0, start));
    }
    const elapsed = Math.max(0, op.timer - (op.progressIntervalStart || 0));
    const t = Math.min(1, elapsed / op.progressIntervalDuration);
    return Math.min(1, Math.max(0, start + (target - start) * t));
  }

  roll(dice) {
    const rolls = [];
    for (let i = 0; i < dice; i++) {
      rolls.push(Math.floor(Math.random() * 20) + 1);
    }
    return { sum: rolls.reduce((s, v) => s + v, 0), rolls };
  }

  resolveEvent(teamIndex, event) {
    const team = this.teams[teamIndex];
    if (!team) return { success: false, artifact: false };
    let rollResult = { sum: 0, rolls: [] };
    let dc = 0;
    let skillTotal = 0;
    let roller = null;
    let baseSkill = 0;
    let leaderBonus = 0;
    const op = this.operations[teamIndex];
    const hazardStance = this.stances && this.stances[teamIndex] ? this.stances[teamIndex].hazardousBiomass : 'Neutral';
    let difficulty = 0;
    let artifactModifier = 1;
    if (op) {
      const nextDiff = Number.isFinite(op.nextDifficultyModifier) && op.nextDifficultyModifier > 0 ? op.nextDifficultyModifier : 1;
      const nextArtifact = Number.isFinite(op.nextArtifactModifier) && op.nextArtifactModifier > 0 ? op.nextArtifactModifier : 1;
      artifactModifier = nextArtifact;
      op.nextDifficultyModifier = 1;
      op.nextArtifactModifier = 1;
      const baseDifficulty = op.difficulty || 0;
      difficulty = baseDifficulty * nextDiff;
    }
    const stanceDifficultyModifier = event && Number.isFinite(event.stanceDifficultyModifier) && event.stanceDifficultyModifier > 0 ? event.stanceDifficultyModifier : 1;
    const scaledDifficulty = difficulty * stanceDifficultyModifier;
    const pMult = 1 + this.facilities.shootingRange * 0.01;
    const aMult = 1 + this.facilities.obstacleCourse * 0.01;
    const wMult = 1 + this.facilities.library * 0.01;
    let damageDetail = '';
    let failureDamageDetail = '';
    let rerollNote = '';
    let criticalNote = '';
    let rerollUsed = false;
    let failConverted = false;
    let success = false;
    let diceCount = 0;
    const successActions = [];
    const failureActions = [];
    const facilityKey = this.getFacilityKeyForEvent(event);
    const facilityLevel = facilityKey ? (this.facilities[facilityKey] || 0) : 0;
    const facilityLabel = facilityKey ? (facilityLabels[facilityKey] || facilityKey) : '';

    const applyMult = (val, skill) => {
      if (skill === 'power') return val * pMult;
      if (skill === 'athletics') return val * aMult;
      if (skill === 'wit') return val * wMult;
      return val;
    };

    switch (event.type) {
      case 'team': {
        diceCount = 4;
        skillTotal = team.reduce((s, m) => {
          if (!m) return s;
          let contribution = applyMult(m[event.skill], event.skill);
          if (event.skill === 'wit' && (m.classType === 'Natural Scientist' || m.classType === 'Social Scientist')) {
            contribution *= 1.5;
          }
          return s + contribution;
        }, 0);
        dc = Math.max(0, (40 + difficulty * 4) * stanceDifficultyModifier);
        if (event.skill === 'athletics' && op) {
          successActions.push(() => {
            const current = Number.isFinite(op.nextDifficultyModifier) && op.nextDifficultyModifier > 0 ? op.nextDifficultyModifier : 1;
            op.nextDifficultyModifier = current * 0.75;
          });
          failureActions.push(() => {
            op.nextEvent += 120;
          });
        }
        if (event.skill === 'wit' && op) {
          successActions.push(() => {
            const current = Number.isFinite(op.nextArtifactModifier) && op.nextArtifactModifier > 0 ? op.nextArtifactModifier : 1;
            op.nextArtifactModifier = current * 2;
          });
          failureActions.push(() => {
            const current = Number.isFinite(op.nextArtifactModifier) && op.nextArtifactModifier > 0 ? op.nextArtifactModifier : 1;
            op.nextArtifactModifier = current * 0.5;
          });
        }
        let damage = 2 * scaledDifficulty;
        if (event.skill === 'wit') damage *= 0.5;
        damage = Math.max(0, damage);
        if (damage > 0) {
          failureDamageDetail = `Damage: -${formatNumber(damage, false, 2)} HP each`;
          failureActions.push(() => {
            team.forEach(m => { if (m) m.health = Math.max(m.health - damage, 0); });
          });
        }
        break;
      }
      case 'individual': {
        const members = team.filter(m => m);
        if (members.length === 0) return { success: false, artifact: false };
        let member = members[Math.floor(Math.random() * members.length)];
        if (event.skill === 'athletics') {
          let lowest = Number.POSITIVE_INFINITY;
          const pool = [];
          members.forEach(m => {
            const value = m.athletics;
            if (value < lowest) {
              lowest = value;
              pool.length = 0;
              pool.push(m);
            } else if (value === lowest) {
              pool.push(m);
            }
          });
          if (pool.length) {
            member = pool[Math.floor(Math.random() * pool.length)];
          }
        }
        roller = member;
        const leader = team[0];
        baseSkill = applyMult(member[event.skill], event.skill);
        leaderBonus = leader ? Math.floor(applyMult(leader[event.skill], event.skill) / 2) : 0;
        skillTotal = baseSkill + leaderBonus;
        diceCount = 1;
        dc = Math.max(0, (10 + 1.5*difficulty) * stanceDifficultyModifier);
        let damage = 5 * scaledDifficulty;
        if (event.skill === 'power') damage *= 2;
        if (event.skill === 'wit') damage *= 0.5;
        damage = Math.max(0, damage);
        if (damage > 0) {
          const name = member && member.firstName ? ` (${member.firstName})` : '';
          failureDamageDetail = `Damage: -${formatNumber(damage, false, 2)} HP${name}`;
          failureActions.push(() => {
            member.health = Math.max(member.health - damage, 0);
          });
        }
        break;
      }
      case 'science': {
        const leader = team[0];
        let m = team.find(t => t && t.classType === event.specialty);
        if (!m) {
          m = leader;
          if (!m) return { success: false, artifact: false };
          baseSkill = Math.floor(applyMult(m.wit, 'wit') / 2);
        } else {
          baseSkill = applyMult(m.wit, 'wit');
        }
        leaderBonus = leader ? Math.floor(applyMult(leader.wit, 'wit') / 2) : 0;
        skillTotal = baseSkill + leaderBonus;
        roller = m;
        diceCount = 1;
        dc = Math.max(0, (10 + 1.5*difficulty) * stanceDifficultyModifier);
        break;
      }
      case 'combat': {
        skillTotal = team.reduce((s, mem) => {
          if (!mem) return s;
          const mult = mem.classType === 'Soldier' ? 2 : 1;
          return s + applyMult(mem.power, 'power') * mult;
        }, 0);
        diceCount = 4;
        const combatMult = event && event.difficultyMultiplier ? event.difficultyMultiplier : 1;
        dc = Math.max(0, (40 * combatMult + 4*difficulty) * stanceDifficultyModifier);
        const damage = Math.max(0, 5 * scaledDifficulty);
        if (damage > 0) {
          failureDamageDetail = `Damage: -${formatNumber(damage, false, 2)} HP each`;
          failureActions.push(() => {
            team.forEach(m => { if (m) m.health = Math.max(m.health - damage, 0); });
          });
        }
        break;
      }
    }

    if (diceCount <= 0) diceCount = 1;
    rollResult = this.roll(diceCount);
    const initialRolls = rollResult.rolls.slice();
    const initialTotal = rollResult.sum + skillTotal;
    success = initialTotal >= dc;

    if (!success) {
      const rerollInfo = this.consumeFacilityReroll(op, event);
      if (rerollInfo) {
        rerollUsed = true;
        const rerollRoll = this.roll(diceCount);
        const rerollTotal = rerollRoll.sum + skillTotal;
        const initialStr = `[${initialRolls.join(',')}]`;
        const rerollStr = `[${rerollRoll.rolls.join(',')}]`;
        rollResult = rerollRoll;
        success = rerollTotal >= dc;
        if (!success && rerollInfo.level >= 100) {
          success = true;
          failConverted = true;
        }
        if (failConverted) {
          rerollNote = ` | ${rerollInfo.label} reroll ${initialStr}->${rerollStr} (fail-safe success)`;
        } else if (success) {
          rerollNote = ` | ${rerollInfo.label} reroll ${initialStr}->${rerollStr}`;
        } else {
          rerollNote = ` | ${rerollInfo.label} reroll ${initialStr}->${rerollStr} (still failed)`;
        }
      }
    }

    if (!success && !failConverted && facilityLevel >= 100) {
      success = true;
      failConverted = true;
      const label = facilityLabel || (facilityKey || 'Facility');
      if (rerollNote) {
        rerollNote += ` | ${label} fail-safe success`;
      } else {
        rerollNote = ` | ${label} fail-safe success`;
      }
    }

    if (success) {
      successActions.forEach(fn => fn());
    } else {
      failureActions.forEach(fn => fn());
      damageDetail = failureDamageDetail;
    }

    const stanceObj = this.stances && this.stances[teamIndex] ? this.stances[teamIndex] : { artifact: 'Neutral' };
    if (!success && hazardStance === 'Recon' && op) {
      op.nextEvent += 60;
    }
    const equip = this.rdUpgrades.wgtEquipment ? this.rdUpgrades.wgtEquipment.purchases : 0;
    let artifactChance = Math.min(0.1 + equip * 0.001, 1);
    if (event.specialty === 'Natural Scientist' && stanceObj.artifact === 'Careful') {
      artifactChance = Math.min(artifactChance * 2, 1);
    }
    if (stanceObj.artifact === 'Rapid Extraction') {
      artifactChance = Math.max(0, artifactChance * 0.25);
    }
    let artifact = success && Math.random() < artifactChance;
    const critical = event.type === 'individual' && rollResult.rolls.includes(20);
    if (critical) {
      success = true;
      artifact = true;
      const bonus = this.applyBarracksCriticalBonus(op);
      if (bonus > 1) {
        criticalNote = ` | Barracks XP x${formatNumber(bonus, false, 2)}`;
      }
    }
    if (success) op.successes += 1;
    let artifactReward = 0;
    if (artifact) {
      artifactReward = 1 + op.difficulty * 0.1;
      const mult = event.artifactMultiplier || (event.specialty === 'Natural Scientist' ? 2 : 1);
      artifactReward *= mult * artifactModifier;
      op.artifacts += artifactReward;
    }
    const rollsStr = rollResult.rolls.join(',');
    const outcome = success ? (critical ? 'Critical Success' : 'Success') : 'Fail';
    const rollerName = roller ? ` (${roller.firstName})` : '';
    const artText = artifact ? ` +${formatNumber(artifactReward, false, 2)} Artifact${artifactReward === 1 ? '' : 's'}` : '';
    let skillDetail = formatNumber(skillTotal, false, 2);
    if (event.type === 'individual' || event.type === 'science') {
      skillDetail = `${formatNumber(baseSkill, false, 2)}`;
      if (leaderBonus) skillDetail += ` + leader ${formatNumber(leaderBonus, false, 2)}`;
    }
    const total = rollResult.sum + skillTotal;
    const damageText = damageDetail ? ` | ${damageDetail}` : '';
    this.logStoryStep(teamIndex, op, event, roller);
    const summary = `${event.name}${rollerName}: roll [${rollsStr}] + skill ${skillDetail} (total ${formatNumber(total, false, 2)}) vs DC ${formatNumber(dc, false, 2)} => ${outcome}${artText}${damageText}${rerollNote}${criticalNote}`;
    op.summary = summary;
    this.addLog(teamIndex, `Team ${teamIndex + 1} - Op ${op.number} - ${summary}`);

    if (!success && event.escalate) {
      if (event.specialty !== 'Social Scientist') {
        const combatBase = baseOperationEvents.find(e => e.type === 'combat');
        if (combatBase) {
          const extra = this.cloneEvent(combatBase);
          if (extra) {
            extra.isBase = false;
            this.applyStanceDifficulty(extra, teamIndex);
            this.resolveEvent(teamIndex, extra);
          }
        }
      }
    }

    const injured = team.find(m => m && m.health <= 0);
    if (injured) {
      injured.health = 1;
      this.recallTeam(teamIndex);
      if (typeof addJournalEntry === 'function') {
        addJournalEntry(`Team ${teamIndex + 1} recalled after ${injured.firstName} was injured.`);
      }
    }
    if (event.specialty === 'Natural Scientist' && stanceObj.artifact === 'Careful') {
      op.nextEvent += 120;
    }
    return { success, artifact };
  }

  enable() {
    this.enabled = true;
    if (typeof showWGCTab === 'function') {
      showWGCTab();
    }
  }

  getUpgradeCost(key) {
    const up = this.rdUpgrades[key];
    return up ? up.purchases + 1 : 0;
  }

  getMultiplier(key) {
    const up = this.rdUpgrades[key];
    if (!up) return 1;
    if (key === 'superalloyEfficiency') {
      return 1 + up.purchases;
    }
    return 1 + (up.purchases / 100);
  }

  purchaseUpgrade(key) {
    const up = this.rdUpgrades[key];
    if (!up) return false;
    if (key === 'superalloyEfficiency') {
      if (!researchManager || typeof researchManager.isBooleanFlagSet !== 'function' || !researchManager.isBooleanFlagSet('superalloyResearchUnlocked')) {
        return false;
      }
    }
    if (up.max && up.purchases >= up.max) return false;
    const cost = this.getUpgradeCost(key);
    const art = resources && resources.special && resources.special.alienArtifact;
    if (!art || art.value < cost) return false;
    if (typeof art.decrease === 'function') art.decrease(cost);
    up.purchases += 1;
    this.applyUpgradeEffect(key);
    return true;
  }

  upgradeFacility(key) {
    if (!this.facilities[key] && this.facilities[key] !== 0) return false;
    if (this.facilityCooldown > 0) return false;
    if (this.facilities[key] >= 100) return false;
    this.facilities[key] += 1;
    this.facilityCooldown = 3600;
    return true;
  }

  applyUpgradeEffect(key) {
    const mult = this.getMultiplier(key);
    const effectId = `wgc-${key}`;
    const mapping = {
      componentsEfficiency: 'componentFactory',
      electronicsEfficiency: 'electronicsFactory',
      superconductorEfficiency: 'superconductorFactory',
      androidsEfficiency: 'androidFactory',
      superalloyEfficiency: 'superalloyFoundry',
      foodProduction: 'hydroponicFarm',
    };
    if (mapping[key]) {
      addEffect({
        target: 'building',
        targetId: mapping[key],
        type: 'productionMultiplier',
        value: mult,
        effectId,
        sourceId: 'wgcRD'
      });
    }
  }

  reapplyEffects() {
    for (const key in this.rdUpgrades) {
      if (this.rdUpgrades[key].purchases > 0) {
        this.applyUpgradeEffect(key);
      }
    }
  }

  update(_delta) {
    const seconds = _delta / 1000;
    if (this.facilityCooldown > 0) {
      this.facilityCooldown = Math.max(0, this.facilityCooldown - seconds);
    }
    this.operations.forEach((op, idx) => {
      if (!op.active) {
        op.progress = 0;
        return;
      }
      op.timer += seconds;
      if (!Array.isArray(op.eventQueue)) op.eventQueue = this.generateOperationEvents(op, idx);
      if (!Number.isFinite(op.currentEventIndex)) op.currentEventIndex = 0;
      if (!Number.isFinite(op.nextEvent) || op.nextEvent <= 0) op.nextEvent = 60;
      if (!Number.isFinite(op.baseEventsTotal) || op.baseEventsTotal <= 0) op.baseEventsTotal = 10;
      if (!Number.isFinite(op.baseEventsCompleted) || op.baseEventsCompleted < 0) op.baseEventsCompleted = 0;

      while (op.currentEventIndex < op.eventQueue.length && op.timer >= op.nextEvent) {
        const event = op.eventQueue[op.currentEventIndex];
        const result = this.resolveEvent(idx, event);
        op.currentEventIndex += 1;
        if (event && event.isBase) {
          op.baseEventsCompleted += 1;
        }
        if (!result.success && event && event.type === 'science' && event.specialty === 'Social Scientist') {
          const combatBase = baseOperationEvents.find(e => e.type === 'combat');
          const extraCombat = this.cloneEvent(combatBase);
          if (extraCombat) {
            extraCombat.isBase = false;
            extraCombat.difficultyMultiplier = 1.25;
            op.eventQueue.splice(op.currentEventIndex, 0, extraCombat);
          }
        }
        const delay = this.getEventDelay(event, idx);
        op.nextEvent += delay;
        this.refreshOperationProgress(op, idx);
      }

      const finishedEvents = op.currentEventIndex >= (op.eventQueue ? op.eventQueue.length : 0);
      const readyToFinish = finishedEvents && op.timer >= 600;
      if (readyToFinish) {
        this.finishOperation(idx);
        this.totalOperations += 1;
        op.timer -= 600;
        this.refreshOperationProgress(op, idx);
        op.number = this.teamNextOperationNumber[idx];
        this.teamNextOperationNumber[idx] += 1;
        this.applyInfirmaryOperationHeal(idx);
        op.facilityRerolls = this.buildFacilityRerollPool();
        op.criticalSuccessCount = 0;
        op.criticalSuccessWeight = 0;
        op.summary = operationStartText;
        this.addLog(idx, `=== Operation #${op.number} ===`);
      }

      op.progress = this.calculateOperationProgress(op);
    });

    const minuteFraction = seconds / 60;
    const healMult = 1 + this.facilities.infirmary * 0.01;
    this.teams.forEach((team, idx) => {
      const op = this.operations[idx];
      const rate = op && op.active ? 1 : 50;
      const heal = rate * minuteFraction * healMult;
      team.forEach(m => {
        if (m) m.health = Math.min(m.health + heal, m.maxHealth);
      });
    });

    let autoChanged = false;
    this.teams.forEach(team => {
      team.forEach(m => {
        if (m && m.autoAllocate && m.autoAllocate()) {
          autoChanged = true;
        }
      });
    });
    if (autoChanged && typeof updateWGCUI === 'function') {
      updateWGCUI();
    }
  }

  finishOperation(teamIndex) {
    const op = this.operations[teamIndex];
    if (!op) return;
    const art = op.artifacts;
    const successes = op.successes;
    if (art > 0 && typeof resources !== 'undefined' && resources.special && resources.special.alienArtifact) {
      resources.special.alienArtifact.increase(art);
    }
    this.totalArtifacts += art;
    const team = this.teams[teamIndex];
    if (team) {
      const barracksBase = 1 + this.facilities.barracks * 0.01;
      const difficultyFactor = 1 + 0.1 * (op.difficulty || 0);
      const criticalCount = Number.isFinite(op.criticalSuccessCount) ? op.criticalSuccessCount : 0;
      const criticalWeight = Number.isFinite(op.criticalSuccessWeight) ? op.criticalSuccessWeight : 0;
      const nonCriticalSuccesses = Math.max(0, successes - criticalCount);
      const effectiveSuccesses = nonCriticalSuccesses + criticalWeight;
      const xpGain = effectiveSuccesses * difficultyFactor * barracksBase;
      const currentMax = team.reduce((mx, m) => m && m.xp > mx ? m.xp : mx, 0);
      const newMax = currentMax + xpGain;
      team.forEach(m => {
        if (!m) return;
        let gain = xpGain;
        if (m.xp < currentMax) gain *= 1.5;
        m.xp = Math.min(m.xp + gain, newMax);
        let req = m.getXPForNextLevel();
        while (m.xp >= req && req > 0) {
          m.xp -= req;
          m.level += 1;
          m.maxHealth = 100 + (m.level - 1) * 10;
          m.health = Math.min(m.health, m.maxHealth);
          req = m.getXPForNextLevel();
        }
      });
    }
    const summary = `Operation ${op.number} Complete: ${successes} success(es), ${formatNumber(art, false, 2)} artifact(s)`;
    op.summary = summary;
    this.addLog(teamIndex, `Team ${teamIndex + 1} - ${summary}`);

    if (op.difficulty > this.highestDifficulty) {
      let bonus = 0;
      for (let lvl = this.highestDifficulty + 1; lvl <= op.difficulty; lvl++) {
        bonus += lvl <= 0 ? 1 : lvl;
      }
      this.highestDifficulty = op.difficulty;
      if (typeof resources !== 'undefined' && resources.special && resources.special.alienArtifact) {
        resources.special.alienArtifact.increase(bonus);
      }
      this.totalArtifacts += bonus;
      this.addLog(teamIndex, `Team ${teamIndex + 1} - Highest difficulty ${op.difficulty} reached +${bonus} Artifact${bonus === 1 ? '' : 's'}`);
    }

    this.teamOperationCounts[teamIndex] += 1;
    op.artifacts = 0;
    op.successes = 0;
    op.eventQueue = this.generateOperationEvents(op, teamIndex);
    op.currentEventIndex = 0;
    op.nextEvent = 60;
    op.baseEventsTotal = 10;
    op.baseEventsCompleted = 0;
    op.progressStartValue = 0;
    op.progressTargetValue = 0;
    op.progressIntervalStart = 0;
    op.progressIntervalDuration = 0;
    op.nextDifficultyModifier = 1;
    op.nextArtifactModifier = 1;
    op.progress = 0;
    op.facilityRerolls = this.buildFacilityRerollPool();
    op.criticalSuccessCount = 0;
    op.criticalSuccessWeight = 0;
    this.addLog(teamIndex, '');
  }

  applyInfirmaryOperationHeal(teamIndex) {
    const roster = this.teams[teamIndex];
    if (!Array.isArray(roster)) return;
    const level = this.facilities.infirmary || 0;
    let percent = 0;
    if (level >= 100) percent = 0.2;
    else if (level >= 50) percent = 0.15;
    else if (level >= 25) percent = 0.1;
    else if (level >= 10) percent = 0.05;
    if (percent <= 0) return;
    let target = null;
    let lowestRatio = Infinity;
    for (const member of roster) {
      if (!member || member.maxHealth <= 0) continue;
      const ratio = member.health / member.maxHealth;
      if (ratio < lowestRatio) {
        lowestRatio = ratio;
        target = member;
      }
    }
    if (!target) return;
    const healAmount = target.maxHealth * percent;
    target.health = Math.min(target.maxHealth, target.health + healAmount);
  }

  getFacilityRerollBudget(level) {
    if (level >= 50) return 3;
    if (level >= 25) return 2;
    if (level >= 10) return 1;
    return 0;
  }

  buildFacilityRerollPool() {
    return {
      shootingRange: this.getFacilityRerollBudget(this.facilities.shootingRange || 0),
      obstacleCourse: this.getFacilityRerollBudget(this.facilities.obstacleCourse || 0),
      library: this.getFacilityRerollBudget(this.facilities.library || 0)
    };
  }

  getFacilityKeyForEvent(event) {
    if (!event) return null;
    if (event.type === 'combat') return 'shootingRange';
    if (event.type === 'science') return 'library';
    const skill = event.skill || '';
    if (skill === 'power') return 'shootingRange';
    if (skill === 'athletics') return 'obstacleCourse';
    if (skill === 'wit') return 'library';
    return null;
  }

  consumeFacilityReroll(op, event) {
    if (!op) return null;
    const key = this.getFacilityKeyForEvent(event);
    if (!key) return null;
    if (!op.facilityRerolls) {
      op.facilityRerolls = this.buildFacilityRerollPool();
    }
    const remaining = op.facilityRerolls[key] || 0;
    if (remaining <= 0) return null;
    op.facilityRerolls[key] = remaining - 1;
    return {
      key,
      label: facilityLabels[key] || key,
      level: this.facilities[key] || 0
    };
  }

  getBarracksCriticalMultiplier(level) {
    if (level >= 100) return 10;
    if (level >= 50) return 5;
    if (level >= 25) return 3;
    if (level >= 10) return 2;
    return 1;
  }

  applyBarracksCriticalBonus(op) {
    if (!op) return 1;
    const level = this.facilities.barracks || 0;
    const bonus = this.getBarracksCriticalMultiplier(level);
    if (bonus <= 1) return 1;
    if (!Number.isFinite(op.criticalSuccessCount) || op.criticalSuccessCount < 0) {
      op.criticalSuccessCount = 0;
    }
    if (!Number.isFinite(op.criticalSuccessWeight) || op.criticalSuccessWeight < 0) {
      op.criticalSuccessWeight = 0;
    }
    op.criticalSuccessCount += 1;
    op.criticalSuccessWeight += bonus;
    return bonus;
  }

  startOperation(teamIndex, difficulty = 0) {
    const team = this.teams[teamIndex];
    if (!team || team.some(m => !m)) return false;
    const op = this.operations[teamIndex];
    if (!op) return false;
    const diff = Math.max(0, Math.floor(difficulty));
    op.active = true;
    op.progress = 0;
    op.timer = 0;
    op.nextEvent = 60;
    op.artifacts = 0;
    op.successes = 0;
    op.eventQueue = this.generateOperationEvents(op, teamIndex);
    op.currentEventIndex = 0;
    op.baseEventsTotal = 10;
    op.baseEventsCompleted = 0;
    op.progressStartValue = 0;
    op.progressTargetValue = 0;
    op.progressIntervalStart = 0;
    op.progressIntervalDuration = 0;
    op.number = this.teamNextOperationNumber[teamIndex];
    this.teamNextOperationNumber[teamIndex] += 1;
    op.difficulty = diff;
    op.summary = operationStartText;
    op.nextDifficultyModifier = 1;
    op.nextArtifactModifier = 1;
    op.facilityRerolls = this.buildFacilityRerollPool();
    op.criticalSuccessCount = 0;
    op.criticalSuccessWeight = 0;
    this.applyInfirmaryOperationHeal(teamIndex);
    this.refreshOperationProgress(op, teamIndex);
    op.progress = this.calculateOperationProgress(op);
    this.addLog(teamIndex, `=== Operation #${op.number} ===`);
    return true;
  }

  recallTeam(teamIndex) {
    const op = this.operations[teamIndex];
    if (op) {
      this.addLog(teamIndex, `Team ${teamIndex + 1} - Recalled`);
      op.active = false;
      op.progress = 0;
      op.timer = 0;
      op.nextEvent = 60;
      op.eventQueue = [];
      op.currentEventIndex = 0;
      op.baseEventsCompleted = 0;
      op.progressStartValue = 0;
      op.progressTargetValue = 0;
      op.progressIntervalStart = 0;
      op.progressIntervalDuration = 0;
      op.nextDifficultyModifier = 1;
      op.nextArtifactModifier = 1;
      op.criticalSuccessCount = 0;
      op.criticalSuccessWeight = 0;
    }
  }

  recruitMember(teamIndex, slotIndex, member) {
    if (!this.teams[teamIndex] || this.teams[teamIndex][slotIndex]) return null;
    this.teams[teamIndex][slotIndex] = member;
    return member;
  }

  dismissMember(teamIndex, slotIndex) {
    if (this.teams[teamIndex]) {
      this.teams[teamIndex][slotIndex] = null;
    }
  }

  renameMember(teamIndex, slotIndex, name) {
    const m = this.teams[teamIndex] && this.teams[teamIndex][slotIndex];
    if (m) m.name = name;
  }

  setStance(teamIndex, value) {
    if (this.stances[teamIndex]) {
      this.stances[teamIndex].hazardousBiomass = value;
    }
  }

  setArtifactStance(teamIndex, value) {
    if (this.stances[teamIndex]) {
      this.stances[teamIndex].artifact = value;
    }
  }

  saveState() {
    return {
      enabled: this.enabled,
      upgrades: Object.keys(this.rdUpgrades).reduce((o, k) => {
        o[k] = this.rdUpgrades[k].purchases;
        return o;
      }, {}),
      teams: this.teams.map(team => team.map(m => m ? m.toJSON() : null)),
      operations: this.operations.map(op => ({
        active: op.active,
        progress: op.progress,
        timer: op.timer,
        difficulty: op.difficulty,
        artifacts: op.artifacts,
        successes: op.successes,
        summary: op.summary,
        number: op.number,
        nextEvent: op.nextEvent,
        eventQueue: Array.isArray(op.eventQueue) ? op.eventQueue.map(evt => ({ ...evt })) : [],
        currentEventIndex: Number.isFinite(op.currentEventIndex) ? op.currentEventIndex : 0,
        baseEventsTotal: Number.isFinite(op.baseEventsTotal) ? op.baseEventsTotal : 10,
        baseEventsCompleted: Number.isFinite(op.baseEventsCompleted) ? op.baseEventsCompleted : 0,
        progressStartValue: Number.isFinite(op.progressStartValue) ? op.progressStartValue : 0,
        progressTargetValue: Number.isFinite(op.progressTargetValue) ? op.progressTargetValue : 0,
        progressIntervalStart: Number.isFinite(op.progressIntervalStart) ? op.progressIntervalStart : 0,
        progressIntervalDuration: Number.isFinite(op.progressIntervalDuration) ? op.progressIntervalDuration : 0,
        nextDifficultyModifier: Number.isFinite(op.nextDifficultyModifier) ? op.nextDifficultyModifier : 1,
        nextArtifactModifier: Number.isFinite(op.nextArtifactModifier) ? op.nextArtifactModifier : 1,
        facilityRerolls: op.facilityRerolls ? {
          shootingRange: op.facilityRerolls.shootingRange || 0,
          obstacleCourse: op.facilityRerolls.obstacleCourse || 0,
          library: op.facilityRerolls.library || 0
        } : {
          shootingRange: 0,
          obstacleCourse: 0,
          library: 0
        },
        criticalSuccessCount: Number.isFinite(op.criticalSuccessCount) ? op.criticalSuccessCount : 0,
        criticalSuccessWeight: Number.isFinite(op.criticalSuccessWeight) ? op.criticalSuccessWeight : 0
      })),
      teamOperationCounts: this.teamOperationCounts.slice(),
      teamNextOperationNumber: this.teamNextOperationNumber.slice(),
      logs: this.logs.map(l => l.slice()),
      totalOperations: this.totalOperations,
      totalArtifacts: this.totalArtifacts,
      highestDifficulty: this.highestDifficulty,
      stances: this.stances.map(s => ({ hazardousBiomass: s.hazardousBiomass, artifact: s.artifact })),
      facilities: { ...this.facilities },
      facilityCooldown: this.facilityCooldown,
      teamNames: this.teamNames.slice(),
      hideStoryLogs: !!this.hideStoryLogs
    };
  }

  loadState(data = {}) {
    this.enabled = data.enabled || false;
    this.hideStoryLogs = !!data.hideStoryLogs;
    if (data.upgrades) {
      for (const k in data.upgrades) {
        if (this.rdUpgrades[k]) {
          this.rdUpgrades[k].purchases = data.upgrades[k];
        }
      }
    }
    const MAX_TEAMS = 4;
    const teamData = Array.isArray(data.teams) ? data.teams.slice(0, MAX_TEAMS) : [];
    this.teams = Array.from({ length: MAX_TEAMS }, (_, i) => {
      const team = Array.isArray(teamData[i]) ? teamData[i].slice(0, 4) : [];
      const members = team.map(m => (m ? new WGCTeamMember(m) : null));
      while (members.length < 4) members.push(null);
      return members;
    });

    const opData = Array.isArray(data.operations) ? data.operations.slice(0, MAX_TEAMS) : [];
    this.operations = Array.from({ length: MAX_TEAMS }, (_, i) => {
      const op = opData[i] || {};
      return {
        active: !!op.active,
        progress: op.progress || 0,
        timer: op.timer || 0,
        difficulty: op.difficulty || 0,
        artifacts: op.artifacts || 0,
        successes: op.successes || 0,
        summary: op.summary || '',
        number: op.number || 1,
        nextEvent: op.nextEvent || 60,
        eventQueue: Array.isArray(op.eventQueue) ? op.eventQueue.map(evt => ({ ...evt })) : [],
        currentEventIndex: Number.isFinite(op.currentEventIndex) ? op.currentEventIndex : 0,
        baseEventsTotal: Number.isFinite(op.baseEventsTotal) ? op.baseEventsTotal : 10,
        baseEventsCompleted: Number.isFinite(op.baseEventsCompleted) ? op.baseEventsCompleted : 0,
        progressStartValue: Number.isFinite(op.progressStartValue) ? op.progressStartValue : 0,
        progressTargetValue: Number.isFinite(op.progressTargetValue) ? op.progressTargetValue : 0,
        progressIntervalStart: Number.isFinite(op.progressIntervalStart) ? op.progressIntervalStart : 0,
        progressIntervalDuration: Number.isFinite(op.progressIntervalDuration) ? op.progressIntervalDuration : 0,
        nextDifficultyModifier: Number.isFinite(op.nextDifficultyModifier) && op.nextDifficultyModifier > 0 ? op.nextDifficultyModifier : 1,
        nextArtifactModifier: Number.isFinite(op.nextArtifactModifier) && op.nextArtifactModifier > 0 ? op.nextArtifactModifier : 1,
        facilityRerolls: {
          shootingRange: Number.isFinite(op.facilityRerolls && op.facilityRerolls.shootingRange) ? op.facilityRerolls.shootingRange : this.getFacilityRerollBudget(this.facilities.shootingRange || 0),
          obstacleCourse: Number.isFinite(op.facilityRerolls && op.facilityRerolls.obstacleCourse) ? op.facilityRerolls.obstacleCourse : this.getFacilityRerollBudget(this.facilities.obstacleCourse || 0),
          library: Number.isFinite(op.facilityRerolls && op.facilityRerolls.library) ? op.facilityRerolls.library : this.getFacilityRerollBudget(this.facilities.library || 0)
        },
        criticalSuccessCount: Number.isFinite(op.criticalSuccessCount) ? op.criticalSuccessCount : 0,
        criticalSuccessWeight: Number.isFinite(op.criticalSuccessWeight) ? op.criticalSuccessWeight : (Number.isFinite(op.criticalXpMultiplier) && op.criticalXpMultiplier > 1 ? op.criticalXpMultiplier : 0)
      };
    });

    const countData = Array.isArray(data.teamOperationCounts) ? data.teamOperationCounts.slice(0, MAX_TEAMS) : [];
    this.teamOperationCounts = Array.from({ length: MAX_TEAMS }, (_, i) => countData[i] || 0);

    const nextOpData = Array.isArray(data.teamNextOperationNumber) ? data.teamNextOperationNumber.slice(0, MAX_TEAMS) : [];
    this.teamNextOperationNumber = Array.from({ length: MAX_TEAMS }, (_, i) => nextOpData[i] || 1);

    const logData = Array.isArray(data.logs) ? data.logs.slice(0, MAX_TEAMS) : [];
    this.logs = Array.from({ length: MAX_TEAMS }, (_, i) =>
      Array.isArray(logData[i]) ? logData[i].slice(-100) : []
    );

    if (Array.isArray(data.teamNames)) {
      const names = data.teamNames.slice(0, MAX_TEAMS);
      this.teamNames = Array.from({ length: MAX_TEAMS }, (_, i) => {
        const n = names[i];
        return typeof n === 'string' && n.trim() ? n.trim() : defaultTeamNames[i];
      });
    } else {
      this.teamNames = defaultTeamNames.slice();
    }

    const stanceData = Array.isArray(data.stances) ? data.stances.slice(0, MAX_TEAMS) : [];
    this.stances = Array.from({ length: MAX_TEAMS }, (_, i) => {
      const s = stanceData[i] || {};
      return {
        hazardousBiomass: s.hazardousBiomass || 'Neutral',
        artifact: s.artifact || 'Neutral',
      };
    });
    if (data.facilities) {
      for (const k in this.facilities) {
        if (typeof data.facilities[k] === 'number') {
          this.facilities[k] = Math.min(100, Math.max(0, data.facilities[k]));
        }
      }
    }
    if (typeof data.facilityCooldown === 'number') {
      this.facilityCooldown = data.facilityCooldown;
    }
    this.totalOperations = data.totalOperations || 0;
    this.totalArtifacts = data.totalArtifacts || 0;
    this.highestDifficulty = typeof data.highestDifficulty === 'number' ? data.highestDifficulty : -1;
    this.operations.forEach((op, i) => {
      if (!Number.isFinite(op.baseEventsTotal) || op.baseEventsTotal <= 0) {
        op.baseEventsTotal = 10;
      }
      if (!Number.isFinite(op.baseEventsCompleted) || op.baseEventsCompleted < 0) {
        op.baseEventsCompleted = 0;
      }
      if (op.active) {
        if (!Array.isArray(op.eventQueue) || op.eventQueue.length === 0) {
          op.eventQueue = this.generateOperationEvents(op, i);
          op.currentEventIndex = 0;
          op.nextEvent = 60;
        }
        this.refreshOperationProgress(op, i);
        op.progress = this.calculateOperationProgress(op);
        if (!Number.isFinite(op.criticalXpMultiplier) || op.criticalXpMultiplier < 1) {
          op.criticalXpMultiplier = 1;
        }
      } else {
        op.eventQueue = [];
        op.currentEventIndex = 0;
        op.nextEvent = 60;
        op.progress = 0;
        op.progressStartValue = 0;
        op.progressTargetValue = 0;
        op.progressIntervalStart = 0;
        op.progressIntervalDuration = 0;
        op.baseEventsCompleted = 0;
        op.nextDifficultyModifier = 1;
        op.nextArtifactModifier = 1;
        op.criticalXpMultiplier = 1;
      }
    });
  }

  renameTeam(index, name) {
    if (typeof index !== 'number' || typeof name !== 'string') return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!Array.isArray(this.teamNames)) this.teamNames = defaultTeamNames.slice();
    this.teamNames[index] = trimmed;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WarpGateCommand };
}
