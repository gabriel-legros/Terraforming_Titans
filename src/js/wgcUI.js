let wgcTabVisible = false;
let wgcUIInitialized = false;
// Cache for frequently accessed WGC elements keyed by team index
const wgcElementCache = {};
if (typeof globalThis.formatNumber === 'undefined') {
  try {
    if (typeof require !== 'undefined') {
      globalThis.formatNumber = require('./numbers.js').formatNumber;
    }
  } catch (e) {}
  if (typeof globalThis.formatNumber === 'undefined') {
    globalThis.formatNumber = v => v;
  }
}
const rdItems = {
  wgtEquipment: 'Warpgate Teams Equipment',
  componentsEfficiency: 'Components production efficiency',
  electronicsEfficiency: 'Electronics production efficiency',
  superconductorEfficiency: 'Superconductor production efficiency',
  androidsEfficiency: 'Androids production efficiency',
  superalloyEfficiency: 'Superalloy production efficiency',
  foodProduction: 'Food production efficiency'
};
const rdDescriptions = {
  wgtEquipment: 'Each purchase increases artifact chance by 0.1% up to a +90% bonus (100% total).'
};
const rdElements = {};
const facilityItems = {
  infirmary: 'Infirmary',
  barracks: 'Barracks',
  shootingRange: 'Shooting Range',
  obstacleCourse: 'Obstacle Course',
  library: 'Library'
};
const facilityDescriptions = {
  infirmary: 'Increases team healing rate by 1% per level.',
  barracks: 'Increases XP gained from operations by 1% per level.',
  shootingRange: 'Boosts Power for challenges by 1% per level.',
  obstacleCourse: 'Boosts Athletics for challenges by 1% per level.',
  library: 'Boosts Wit for challenges by 1% per level.'
};
const facilityElements = {};
const teamElements = [];
var teamNames = ['Alpha', 'Beta', 'Gamma', 'Delta'];
const teamUnlocks = [0, 100, 500, 1000];
const classImages = {
  'Team Leader': 'assets/images/team_leader.png',
  'Soldier': 'assets/images/soldier.png',
  'Natural Scientist': 'assets/images/natural_scientist.png',
  'Social Scientist': 'assets/images/social_scientist.png'
};
const classDescriptions = {
  'Team Leader': 'Balances all skills and lends half their skill to others.',
  'Soldier': 'Combat expert whose Power counts double in combat challenges.',
  'Natural Scientist': 'Researcher who excels at natural science challenges and doubles artifact rewards.',
  'Social Scientist': 'Diplomatic specialist handling social science challenges and reducing conflict.'
};
let activeDialog = null;

function showWGCTab() {
  wgcTabVisible = true;
  const tab = document.querySelector('.hope-subtab[data-subtab="wgc-hope"]');
  const content = document.getElementById('wgc-hope');
  if (tab) tab.classList.remove('hidden');
  if (content) content.classList.remove('hidden');
}

function hideWGCTab() {
  wgcTabVisible = false;
  const tab = document.querySelector('.hope-subtab[data-subtab="wgc-hope"]');
  const content = document.getElementById('wgc-hope');
  if (tab) tab.classList.add('hidden');
  if (content) content.classList.add('hidden');
}

function updateWGCVisibility() {
  if (typeof warpGateCommand === 'undefined') return;
  if (warpGateCommand.enabled) {
    if (!wgcTabVisible) showWGCTab();
  } else if (wgcTabVisible) {
    hideWGCTab();
  }
}

function generateWGCTeamCards() {
  const names = (typeof warpGateCommand !== 'undefined' && warpGateCommand.teamNames) ? warpGateCommand.teamNames : teamNames;
  return names.map((name, tIdx) => {
    const slots = (typeof warpGateCommand !== 'undefined' && warpGateCommand.teams[tIdx]) ? warpGateCommand.teams[tIdx] : [null, null, null, null];
    const op = (typeof warpGateCommand !== 'undefined' && warpGateCommand.operations[tIdx]) ? warpGateCommand.operations[tIdx] : { active: false, progress: 0, summary: '' };
    const slotMarkup = slots.map((m, sIdx) => {
      if (m) {
        const img = classImages[m.classType] || '';
        const unspentPoints = m.getPointsToAllocate() > 0 ? '<div class="unspent-points-indicator">!</div>' : '';
        const hpPercent = Math.floor((m.health / m.maxHealth) * 100);
        const hpClass = hpPercent < 25 ? 'critical-hp' : (hpPercent < 50 ? 'low-hp' : '');
        return `<div class="team-slot filled" data-team="${tIdx}" data-slot="${sIdx}">
          <div class="team-hp-bar"><div class="team-hp-bar-fill ${hpClass}" style="height:${hpPercent}%;"></div></div>
          <div class="team-member-name">${m.firstName}</div>
          <img src="${img}" class="team-icon">
          ${unspentPoints}
        </div>`;
      }
      return `<div class="team-slot" data-team="${tIdx}" data-slot="${sIdx}"><button>+</button></div>`;
    }).join('');
    const unlocked = (typeof warpGateCommand !== 'undefined' && warpGateCommand.totalOperations >= teamUnlocks[tIdx]);
    const lockMarkup = unlocked ? '' :
      `<div class="wgc-team-locked" data-team="${tIdx}">LOCKED<br>${teamUnlocks[tIdx]} Operations Completed</div>`;
    const stanceVal = (typeof warpGateCommand !== 'undefined' && warpGateCommand.stances && warpGateCommand.stances[tIdx]) ? warpGateCommand.stances[tIdx].hazardousBiomass : 'Neutral';
    const artVal = (typeof warpGateCommand !== 'undefined' && warpGateCommand.stances && warpGateCommand.stances[tIdx]) ? warpGateCommand.stances[tIdx].artifact : 'Neutral';
    return `
      <div class="wgc-team-card" data-team="${tIdx}">
        <div class="team-header">Team <span class="team-name" data-team="${tIdx}">${name}</span><button class="rename-team-icon" data-team="${tIdx}" title="Rename Team">&#9998;</button></div>
        <div class="wgc-team-body">
          <div class="team-slots">${slotMarkup}</div>
          <div class="team-stances">
            <div class="team-stance">
              <label>Hazardous Biomass Interactions <span class="info-tooltip-icon" title="Negotiation halves combat challenge weight and doubles social science weight. Aggressive removes social science challenges and doubles combat weight.">&#9432;</span></label>
              <select class="hbi-select" data-team="${tIdx}">
                <option value="Neutral"${stanceVal === 'Neutral' ? ' selected' : ''}>Neutral</option>
                <option value="Negotiation"${stanceVal === 'Negotiation' ? ' selected' : ''}>Negotiation</option>
                <option value="Aggressive"${stanceVal === 'Aggressive' ? ' selected' : ''}>Aggressive</option>
              </select>
            </div>
            <div class="team-stance">
              <label>Scientific Artifact Retrieval <span class="info-tooltip-icon" title="Careful doubles artifact chance on Natural Science challenges but delays the next event by triple the time.">&#9432;</span></label>
              <select class="artifact-select" data-team="${tIdx}">
                <option value="Neutral"${artVal === 'Neutral' ? ' selected' : ''}>Neutral</option>
                <option value="Careful"${artVal === 'Careful' ? ' selected' : ''}>Careful</option>
              </select>
            </div>
          </div>
          <div class="team-controls">
            <div class="difficulty-container">
            <div class="difficulty-label">
              <span>Difficulty</span>
              <span class="info-tooltip-icon" title="Raises all challenge DCs (team +4 per level, individual +1 per level). Artifact and XP rewards increase by 10% per level. Failed individual checks deal 5 HP per level to the selected member while failed team checks damage all members for 2 HP per level. Failed combat checks damage all members for 5 HP per level.">&#9432;</span>
              </div>
              <input type="number" class="difficulty-input" data-team="${tIdx}" value="${op.difficulty || 0}" min="0" />
            </div>
            <button class="start-button" data-team="${tIdx}">Start</button>
            <button class="recall-button" data-team="${tIdx}">Recall</button>
            <button class="log-toggle" data-team="${tIdx}">Log</button>
          </div>
        </div>
        <div class="operation-progress${op.active ? '' : ' hidden'}">
          <div class="operation-progress-bar" style="width: ${op.progress * 100}%"></div>
        </div>
        <div class="operation-summary${op.active ? '' : ' hidden'}">${op.summary || ''}</div>
        <div class="team-log hidden"><pre></pre></div>
        ${lockMarkup}
      </div>`;
  }).join('');
}

function invalidateWGCTeamCache() {
  teamElements.length = 0;
  const names = (typeof warpGateCommand !== 'undefined' && warpGateCommand.teamNames) ? warpGateCommand.teamNames : teamNames;
  names.forEach((_, tIdx) => {
    const card = document.querySelector(`.wgc-team-card[data-team="${tIdx}"]`);
    if (!card) {
      teamElements[tIdx] = null;
      return;
    }
    const slots = Array.from(card.querySelectorAll('.team-slot')).map(slot => ({
      slot,
      bar: slot.querySelector('.team-hp-bar-fill')
    }));
    teamElements[tIdx] = {
      card,
      startBtn: card.querySelector('.start-button'),
      recallBtn: card.querySelector('.recall-button'),
      diffInput: card.querySelector('.difficulty-input'),
      stanceSelect: card.querySelector('.hbi-select'),
      artSelect: card.querySelector('.artifact-select'),
      progressContainer: card.querySelector('.operation-progress'),
      progressBar: card.querySelector('.operation-progress-bar'),
      summaryEl: card.querySelector('.operation-summary'),
      logEl: card.querySelector('.team-log pre'),
      lockOverlay: card.querySelector('.wgc-team-locked'),
      slots
    };
  });
}

function createRDItem(key, label) {
  const div = document.createElement('div');
  div.classList.add('wgc-rd-item');

  const nameSpan = document.createElement('span');
  nameSpan.classList.add('wgc-rd-label');
  nameSpan.textContent = label + ' ';
  if (rdDescriptions[key]) {
    const icon = document.createElement('span');
    icon.classList.add('info-tooltip-icon');
    icon.innerHTML = '&#9432;';
    icon.title = rdDescriptions[key];
    nameSpan.appendChild(icon);
  }
  div.appendChild(nameSpan);

  const multSpan = document.createElement('span');
  multSpan.classList.add('wgc-rd-mult');
  multSpan.id = `wgc-${key}-mult`;
  div.appendChild(multSpan);

  const button = document.createElement('button');
  button.id = `wgc-${key}-button`;
  button.textContent = 'Buy';
  button.addEventListener('click', () => {
    warpGateCommand.purchaseUpgrade(key);
    updateWGCUI();
  });
  div.appendChild(button);

  rdElements[key] = { button, mult: multSpan, container: div };
  return div;
}

function createRDHeader() {
  const div = document.createElement('div');
  div.classList.add('wgc-rd-item', 'wgc-rd-header');

  const label = document.createElement('span');
  label.classList.add('wgc-rd-label');
  label.textContent = 'Upgrade';
  div.appendChild(label);

  const effect = document.createElement('span');
  effect.classList.add('wgc-rd-mult');
  div.appendChild(effect);

  const cost = document.createElement('span');
  cost.textContent = 'Cost (Alien Artifacts)';
  div.appendChild(cost);

  return div;
}

function populateRDMenu() {
  const menu = document.getElementById('wgc-rd-menu');
  if (!menu) return;
  menu.innerHTML = '';
  menu.appendChild(createRDHeader());
  for (const key in rdItems) {
    menu.appendChild(createRDItem(key, rdItems[key]));
  }
}

function createFacilityItem(key, label) {
  const div = document.createElement('div');
  div.classList.add('wgc-rd-item');

  const name = document.createElement('span');
  name.classList.add('wgc-rd-label');
  name.textContent = label;
  const info = document.createElement('span');
  info.classList.add('info-tooltip-icon');
  info.innerHTML = '&#9432;';
  info.title = facilityDescriptions[key];
  name.appendChild(info);
  div.appendChild(name);

  const level = document.createElement('span');
  level.classList.add('wgc-rd-mult');
  level.id = `wgc-${key}-level`;
  div.appendChild(level);

  const button = document.createElement('button');
  button.id = `wgc-${key}-upgrade`;
  button.textContent = 'Upgrade';
  button.addEventListener('click', () => {
    warpGateCommand.upgradeFacility(key);
    if (typeof updateHopeAlert === 'function') updateHopeAlert();
    updateWGCUI();
  });
  div.appendChild(button);

  facilityElements[key] = { button, level };
  return div;
}

function populateFacilityMenu() {
  const menu = document.getElementById('wgc-facilities-menu');
  if (!menu) return;
  menu.innerHTML = '';
  for (const key in facilityItems) {
    menu.appendChild(createFacilityItem(key, facilityItems[key]));
  }
}

function closeRecruitDialog() {
  if (activeDialog && activeDialog.parentElement) {
    document.body.removeChild(activeDialog);
    activeDialog = null;
  }
}

function openRecruitDialog(teamIndex, slotIndex, member) {
  closeRecruitDialog();
  const overlay = document.createElement('div');
  overlay.classList.add('wgc-popup-overlay');

  const win = document.createElement('div');
  win.classList.add('wgc-popup-window');

  const title = document.createElement('h2');
  title.textContent = member ? 'Edit Member' : 'Recruit Member';
  win.appendChild(title);

  const firstNameField = document.createElement('input');
  firstNameField.type = 'text';
  firstNameField.placeholder = 'First Name (required)';
  firstNameField.value = member ? member.firstName : '';
  firstNameField.classList.add('wgc-dialog-field');
  win.appendChild(firstNameField);

  const lastNameField = document.createElement('input');
  lastNameField.type = 'text';
  lastNameField.placeholder = 'Last Name';
  lastNameField.value = member ? member.lastName : '';
  lastNameField.classList.add('wgc-dialog-field');
  win.appendChild(lastNameField);

  const classSelect = document.createElement('select');
  classSelect.classList.add('wgc-dialog-field');
  let availableClasses = ['Team Leader', 'Soldier', 'Natural Scientist', 'Social Scientist'];
  if (slotIndex > 0) {
    availableClasses = availableClasses.filter(c => c !== 'Team Leader');
  }
  availableClasses.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    classSelect.appendChild(opt);
  });

  if (member) {
    classSelect.value = member.classType;
    classSelect.disabled = true;
  } else if (slotIndex === 0) {
    classSelect.value = 'Team Leader';
    classSelect.disabled = true;
  }
  win.appendChild(classSelect);

  const classDescDiv = document.createElement('div');
  classDescDiv.classList.add('wgc-class-description');
  classDescDiv.textContent = classDescriptions[classSelect.value] || '';
  win.appendChild(classDescDiv);

  const lvl = member ? member.level : 1;
  const xp = member ? Math.floor(member.xp || 0) : 0;
  const xpReq = member ? member.getXPForNextLevel() : 10;
  const hp = member ? member.health : 100;
  const hpMax = member ? member.maxHealth : 100;
  const level = document.createElement('div');
  level.classList.add('wgc-member-level');
  level.textContent = `Level: ${lvl} | XP: ${xp} / ${xpReq} | HP: ${formatNumber(hp)} / ${hpMax}`;
  win.appendChild(level);

  const pointsToSpend = member ? member.getPointsToAllocate() : 5;
  const alloc = { power: 0, athletics: 0, wit: 0 };
  const remainingSpan = document.createElement('div');
  remainingSpan.textContent = `Points left: ${pointsToSpend}`;

  const statsDiv = document.createElement('div');
  statsDiv.classList.add('wgc-stats-grid');

  const baseStats = member ? WGCTeamMember.getBaseStats(member.classType) : WGCTeamMember.getBaseStats(classSelect.value);
  const statValues = {
    power: member ? member.power : baseStats.power,
    athletics: member ? member.athletics : baseStats.athletics,
    wit: member ? member.wit : baseStats.wit
  };

  ['power','athletics','wit'].forEach(stat => {
    const statContainer = document.createElement('div');
    statContainer.classList.add('wgc-stat-container');

    const label = document.createElement('span');
    label.textContent = stat.charAt(0).toUpperCase() + stat.slice(1);
    statContainer.appendChild(label);

    const valueSpan = document.createElement('span');
    valueSpan.textContent = statValues[stat];
    valueSpan.classList.add('wgc-stat-value');
    statContainer.appendChild(valueSpan);

    const addButton = document.createElement('button');
    addButton.textContent = '+';
    addButton.addEventListener('click', () => {
      const totalAllocated = alloc.power + alloc.athletics + alloc.wit;
      if (totalAllocated < pointsToSpend) {
        alloc[stat]++;
        valueSpan.textContent = statValues[stat] + alloc[stat];
        remainingSpan.textContent = `Points left: ${pointsToSpend - (totalAllocated + 1)}`;
      }
    });
    statContainer.appendChild(addButton);
    statsDiv.appendChild(statContainer);
  });

  classSelect.addEventListener('change', () => {
    const newBaseStats = WGCTeamMember.getBaseStats(classSelect.value);
    statValues.power = newBaseStats.power;
    statValues.athletics = newBaseStats.athletics;
    statValues.wit = newBaseStats.wit;
    alloc.power = 0;
    alloc.athletics = 0;
    alloc.wit = 0;
    const statContainers = statsDiv.querySelectorAll('.wgc-stat-container');
    statContainers.forEach((container, index) => {
      const statName = ['power', 'athletics', 'wit'][index];
      container.querySelector('span:nth-child(2)').textContent = statValues[statName];
    });
    remainingSpan.textContent = `Points left: ${pointsToSpend}`;
    classDescDiv.textContent = classDescriptions[classSelect.value] || '';
  });
  win.appendChild(statsDiv);
  win.appendChild(remainingSpan);

  const buttonContainer = document.createElement('div');
  buttonContainer.classList.add('wgc-dialog-buttons');

  const confirm = document.createElement('button');
  confirm.textContent = 'Confirm';
  confirm.addEventListener('click', () => {
    const firstName = firstNameField.value.trim();
    const lastName = lastNameField.value.trim();
    if (!firstName) return;

    if (member) {
      member.firstName = firstName;
      member.lastName = lastName;
      member.allocatePoints(alloc);
    } else {
      const m = WGCTeamMember.create(firstName, lastName, classSelect.value, alloc);
      warpGateCommand.recruitMember(teamIndex, slotIndex, m);
    }
    closeRecruitDialog();
    redrawWGCTeamCards();
  });
  buttonContainer.appendChild(confirm);

  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', closeRecruitDialog);
  buttonContainer.appendChild(cancel);

  win.appendChild(buttonContainer);

  if (member) {
    const dismiss = document.createElement('button');
    dismiss.textContent = 'Dismiss';
    const opActive = warpGateCommand && warpGateCommand.operations &&
      warpGateCommand.operations[teamIndex] && warpGateCommand.operations[teamIndex].active;
    dismiss.disabled = !!opActive;
    dismiss.addEventListener('click', () => {
      if (dismiss.disabled) return;
      if (dismiss.textContent === 'Dismiss') {
        dismiss.textContent = 'Are You Sure?';
      } else {
        warpGateCommand.dismissMember(teamIndex, slotIndex);
        closeRecruitDialog();
        redrawWGCTeamCards();
      }
    });
    win.appendChild(dismiss);
  }

  overlay.appendChild(win);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeRecruitDialog(); });
  document.body.appendChild(overlay);
  activeDialog = overlay;
  activeDialog._member = member;
  activeDialog._levelEl = level;
  activeDialog._alloc = alloc;
  activeDialog._remainingSpan = remainingSpan;
}

function generateWGCLayout() {
  return `
    <div class="wgc-container">
      <div class="wgc-main">
        <div class="wgc-left">
          <div class="wgc-card" id="wgc-rd-section">
            <h3>R&D</h3>
            <div id="wgc-rd-menu"></div>
          </div>
          <div class="wgc-card" id="wgc-facilities-section">
            <h3>Facilities<span id="wgc-facility-alert" class="hope-alert">!</span></h3>
            <div id="wgc-facility-cooldown"></div>
            <div id="wgc-facilities-menu"></div>
          </div>
          <div class="wgc-card" id="wgc-stats-section">
            <h3>Statistics</h3>
            <div id="wgc-stat-operation"></div>
            <div id="wgc-stat-artifact"></div>
            <div id="wgc-stat-difficulty"></div>
          </div>
        </div>
        <div class="wgc-right">
          <div class="wgc-card" id="wgc-teams-section">
            <h3>Teams</h3>
            <div id="wgc-team-cards"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initializeWGCUI() {
  if (wgcUIInitialized) return;
  hideWGCTab();
  const container = document.getElementById('wgc-hope');
  if (container) {
    container.innerHTML = generateWGCLayout();
    const teamContainer = container.querySelector('#wgc-team-cards');
    if (teamContainer) {
      teamContainer.innerHTML = generateWGCTeamCards();
      invalidateWGCTeamCache();
      teamContainer.addEventListener('click', e => {
        if (e.target.classList.contains('start-button')) {
          const t = parseInt(e.target.dataset.team, 10);
          const input = e.target.closest('.wgc-team-card').querySelector('.difficulty-input');
          const diff = input ? Math.floor(Math.max(0, parseInt(input.value, 10) || 0)) : 0;
          warpGateCommand.startOperation(t, diff);
          updateWGCUI();
          return;
        }
        if (e.target.classList.contains('recall-button')) {
          const t = parseInt(e.target.dataset.team, 10);
          warpGateCommand.recallTeam(t);
          updateWGCUI();
          return;
        }
        if (e.target.classList.contains('log-toggle')) {
          const t = parseInt(e.target.dataset.team, 10);
          const card = e.target.closest('.wgc-team-card');
          const log = card.querySelector('.team-log');
          if (log) log.classList.toggle('hidden');
          return;
        }
        if (e.target.classList.contains('rename-team-icon')) {
          const t = parseInt(e.target.dataset.team, 10);
          const header = e.target.closest('.team-header');
          const nameSpan = header.querySelector('.team-name');
          const renameButton = header.querySelector('.rename-team-icon');

          const currentName = nameSpan.textContent;
          const input = document.createElement('input');
          input.type = 'text';
          input.value = currentName;
          input.classList.add('team-name-input');
          input.dataset.team = t;

          const confirmBtn = document.createElement('button');
          confirmBtn.textContent = 'OK';
          confirmBtn.classList.add('confirm-rename-btn');
          confirmBtn.dataset.team = t;

          header.replaceChild(input, nameSpan);
          header.replaceChild(confirmBtn, renameButton);
          input.focus();
          input.select();
          return;
        }

        if (e.target.classList.contains('confirm-rename-btn')) {
          const t = parseInt(e.target.dataset.team, 10);
          const header = e.target.closest('.team-header');
          const input = header.querySelector('.team-name-input');
          const newName = input.value.trim();

          if (newName) {
            warpGateCommand.renameTeam(t, newName);
          }
          // Redraw to restore original structure
          redrawWGCTeamCards();
          return;
        }

        const slot = e.target.closest('.team-slot');
        if (!slot) return;

        const t = parseInt(slot.dataset.team, 10);
        const s = parseInt(slot.dataset.slot, 10);
        const member = (typeof warpGateCommand !== 'undefined' && warpGateCommand.teams[t]) ? warpGateCommand.teams[t][s] : null;

        if (member) {
          openRecruitDialog(t, s, member);
        } else if (e.target.tagName === 'BUTTON') {
          openRecruitDialog(t, s, null);
        }
      });
      teamContainer.addEventListener('change', e => {
        if (e.target.classList.contains('hbi-select')) {
          const t = parseInt(e.target.dataset.team, 10);
          warpGateCommand.setStance(t, e.target.value);
          updateWGCUI();
        } else if (e.target.classList.contains('artifact-select')) {
          const t = parseInt(e.target.dataset.team, 10);
          warpGateCommand.setArtifactStance(t, e.target.value);
          updateWGCUI();
        }
      });
      teamContainer.addEventListener('input', e => {
        if (e.target.classList.contains('difficulty-input')) {
          const t = parseInt(e.target.dataset.team, 10);
          const val = Math.max(0, Math.floor(parseInt(e.target.value, 10) || 0));
          if (warpGateCommand.operations && warpGateCommand.operations[t]) {
            warpGateCommand.operations[t].difficulty = val;
          }
        }
      });
    }
    populateRDMenu();
    populateFacilityMenu();
  }
  wgcUIInitialized = true;
  if (typeof warpGateCommand !== 'undefined') {
    updateWGCUI();
  }
}

function cacheWGCTeamElements() {
  // Build or refresh the cache for each team card present in DOM
  const names = (typeof warpGateCommand !== 'undefined' && warpGateCommand.teamNames) ? warpGateCommand.teamNames : teamNames;
  names.forEach((_, tIdx) => {
    const card = document.querySelector(`.wgc-team-card[data-team="${tIdx}"]`);
    if (!card) return;
    const cache = wgcElementCache[tIdx] = {};
    cache.card = card;
    cache.startBtn = card.querySelector('.start-button');
    cache.recallBtn = card.querySelector('.recall-button');
    cache.diffInput = card.querySelector('.difficulty-input');
    cache.stanceSelect = card.querySelector('.hbi-select');
    cache.artSelect = card.querySelector('.artifact-select');
    cache.progressContainer = card.querySelector('.operation-progress');
    cache.progressBar = card.querySelector('.operation-progress-bar');
    cache.summaryEl = card.querySelector('.operation-summary');
    cache.lockOverlay = card.querySelector('.wgc-team-locked');
    cache.logEl = document.querySelector(`.wgc-team-card[data-team="${tIdx}"] .team-log pre`);
    // Cache per-slot elements
    cache.slots = [];
    const slotEls = card.querySelectorAll('.team-slot');
    slotEls.forEach((slotEl, sIdx) => {
      cache.slots[sIdx] = {
        slotEl,
        bar: slotEl.querySelector('.team-hp-bar-fill') || null,
        indicator: slotEl.querySelector('.unspent-points-indicator') || null,
      };
    });
  });
}

function invalidateWGCCache() {
  for (const k in wgcElementCache) delete wgcElementCache[k];
}

function updateWGCUI() {
  const names = (typeof warpGateCommand !== 'undefined' && warpGateCommand.teamNames) ? warpGateCommand.teamNames : teamNames;
  const opEl = document.getElementById('wgc-stat-operation');
  if (opEl) {
    opEl.textContent = `Operations Completed: ${warpGateCommand.totalOperations}`;
  }
  const artEl = document.getElementById('wgc-stat-artifact');
  if (artEl) {
    artEl.textContent = `Artifacts Collected: ${formatNumber(warpGateCommand.totalArtifacts, false, 2)}`;
  }
  const diffEl = document.getElementById('wgc-stat-difficulty');
  if (diffEl) {
    const val = warpGateCommand.highestDifficulty;
    diffEl.textContent = `Highest Difficulty: ${val < 0 ? 'None' : val}`;
  }
  const cdEl = document.getElementById('wgc-facility-cooldown');
  if (cdEl) {
    const sec = Math.ceil(warpGateCommand.facilityCooldown);
    cdEl.textContent = sec > 0 ? `Cooldown: ${formatDuration(sec)}` : 'Ready';
  }
  const alertEl = document.getElementById('wgc-facility-alert');
  if (alertEl) alertEl.style.display = warpGateCommand.facilityCooldown <= 0 ? 'inline' : 'none';
  for (const key in facilityElements) {
    const el = facilityElements[key];
    const lvl = warpGateCommand.facilities[key] || 0;
    if (el.level) el.level.textContent = `${lvl}/100`;
    if (el.button) el.button.disabled = warpGateCommand.facilityCooldown > 0 || lvl >= 100;
  }
  for (const key in rdElements) {
    const el = rdElements[key];
    if (!el) continue;
    if (key === 'superalloyEfficiency' && warpGateCommand.rdUpgrades && warpGateCommand.rdUpgrades.superalloyEfficiency) {
      const hasResearch = typeof researchManager === 'undefined'
        || (typeof researchManager.isBooleanFlagSet === 'function'
          && researchManager.isBooleanFlagSet('superalloyResearchUnlocked'));
      if (el.container) {
        el.container.style.display = hasResearch ? '' : 'none';
      }
      if (!hasResearch) {
        continue;
      }
    }
    const cost = warpGateCommand.getUpgradeCost(key);
    if (el.button) {
      el.button.textContent = `Buy (${cost})`;
      const art = (typeof resources !== 'undefined' && resources.special && resources.special.alienArtifact) ? resources.special.alienArtifact.value : 0;
      el.button.disabled = cost > art ||
        (warpGateCommand.rdUpgrades[key].max && warpGateCommand.rdUpgrades[key].purchases >= warpGateCommand.rdUpgrades[key].max);
    }
    if (el.mult) {
      if (key === 'wgtEquipment') {
        const bonus = warpGateCommand.rdUpgrades[key].purchases * 0.1;
        el.mult.textContent = `+${bonus.toFixed(1)}%`;
      } else {
        el.mult.textContent = `x${warpGateCommand.getMultiplier(key).toFixed(2)}`;
      }
    }
  }

  if (teamElements.length !== names.length) {
    invalidateWGCTeamCache();
  }

  names.forEach((_, tIdx) => {
    const refs = teamElements[tIdx];
    if (!refs) return;
    const {
      startBtn,
      recallBtn,
      diffInput,
      stanceSelect,
      artSelect,
      progressContainer,
      progressBar,
      summaryEl,
      logEl,
      lockOverlay,
      slots
    } = refs;
    const team = warpGateCommand.teams[tIdx] || [];
    const full = team.every(m => m);
    const op = warpGateCommand.operations[tIdx];
    const unlocked = warpGateCommand.totalOperations >= teamUnlocks[tIdx];
    if (lockOverlay) {
      if (unlocked) lockOverlay.classList.add('hidden');
      else lockOverlay.classList.remove('hidden');
    }
    if (startBtn) startBtn.disabled = !unlocked || !full || op.active;
    if (recallBtn) recallBtn.disabled = !unlocked || !op.active;
    if (diffInput) {
      diffInput.value = op.difficulty || 0;
      diffInput.disabled = op.active;
    }
    if (stanceSelect) {
      const val = warpGateCommand.stances && warpGateCommand.stances[tIdx]
        ? warpGateCommand.stances[tIdx].hazardousBiomass : 'Neutral';
      stanceSelect.value = val;
    }
    if (artSelect) {
      const val = warpGateCommand.stances && warpGateCommand.stances[tIdx]
        ? warpGateCommand.stances[tIdx].artifact : 'Neutral';
      artSelect.value = val;
    }
    if (progressContainer && progressBar) {
      if (op.active) {
        progressContainer.classList.remove('hidden');
        progressBar.style.width = `${Math.floor(op.progress * 100)}%`;
        if (summaryEl) {
          summaryEl.classList.remove('hidden');
          summaryEl.textContent = op.summary || '';
        }
      } else {
        progressContainer.classList.add('hidden');
        progressBar.style.width = '0%';
        if (summaryEl) {
          summaryEl.classList.add('hidden');
          summaryEl.textContent = '';
        }
      }
    }
    if (logEl) {
      logEl.textContent = (warpGateCommand.logs[tIdx] || []).join('\n');
    }

    slots.forEach(({ slot, bar }, sIdx) => {
      const member = team[sIdx];
      if (!slot || !member) return;
      if (bar) {
        const hpPercent = Math.floor((member.health / member.maxHealth) * 100);
        bar.style.height = `${hpPercent}%`;
        bar.classList.remove('low-hp', 'critical-hp');
        if (hpPercent < 25) {
          bar.classList.add('critical-hp');
        } else if (hpPercent < 50) {
          bar.classList.add('low-hp');
        }
      }
      let indicator = slotCache.indicator;
      if (member.getPointsToAllocate() > 0) {
        if (!indicator) {
          const newIndicator = document.createElement('div');
          newIndicator.className = 'unspent-points-indicator';
          newIndicator.textContent = '!';
          slotEl.appendChild(newIndicator);
          wgcElementCache[tIdx].slots[sIdx].indicator = newIndicator;
        }
      } else if (indicator) {
        indicator.remove();
        wgcElementCache[tIdx].slots[sIdx].indicator = null;
      }
    });
  });

  if (activeDialog && activeDialog._member) {
    const m = activeDialog._member;
    const lvlEl = activeDialog._levelEl;
    const remSpan = activeDialog._remainingSpan;
    const alloc = activeDialog._alloc || { power: 0, athletics: 0, wit: 0 };
    if (lvlEl) {
      const xpReq = m.getXPForNextLevel();
      lvlEl.textContent = `Level: ${m.level} | XP: ${Math.floor(m.xp || 0)} / ${xpReq} | HP: ${formatNumber(m.health)} / ${m.maxHealth}`;
    }
    if (remSpan) {
      const pts = m.getPointsToAllocate() - (alloc.power + alloc.athletics + alloc.wit);
      remSpan.textContent = `Points left: ${pts}`;
    }
  }
}

function redrawWGCTeamCards() {
  const teamContainer = document.getElementById('wgc-team-cards');
  if (teamContainer) {
    teamContainer.innerHTML = generateWGCTeamCards();
    invalidateWGCTeamCache();
  }
  // Rebuild cache after DOM has been regenerated
  invalidateWGCCache();
  cacheWGCTeamElements();
  updateWGCUI();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hideWGCTab,
    showWGCTab,
    updateWGCVisibility,
    initializeWGCUI,
    updateWGCUI,
    redrawWGCTeamCards,
    invalidateWGCTeamCache,
    populateRDMenu,
    populateFacilityMenu,
    generateWGCTeamCards,
    generateWGCLayout,
  };
}
