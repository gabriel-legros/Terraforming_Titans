let wgcTabVisible = false;
let wgcUIInitialized = false;
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
const teamRulesTooltip = [
  'Special rules:',
  '- Team Power Challenge: Uses every member\'s Power; failed checks deal double damage.',
  '- Team Athletics Challenge: Uses team Athletics; successes ease the next challenge by 25%, failures delay it by 120 seconds.',
  '- Team Wits Challenge: Uses team Wit; successes double the next artifact reward, failures halve it.',
  '- Individual Athletics Challenge: Targets the least athletic member (random if tied) with the leader lending half their skill.',
  '- Natural Science Challenge: Prefers Natural Scientists, grants double artifact rewards, and failures can escalate into immediate combat.',
  '- Social Science Challenge: Social Scientists excel; failures may escalate into combat.',
  '- Combat Challenge: Soldiers contribute double Power and failures damage the team for five times the difficulty.',
  '- Team Leaders lend half their skill on solo and science challenges.'
].join('\n');
const wgcFirstNamePool = [
  'Aiden','Amelia','Andrew','Aria','Benjamin','Brielle','Caleb','Chloe','Daniel','Delilah',
  'Elijah','Emery','Ethan','Evelyn','Felix','Fiona','Gabriel','Gianna','Harper','Henry',
  'Isaac','Isla','Jack','Jade','Kai','Keira','Liam','Lila','Mason','Maya',
  'Nolan','Nora','Oliver','Olive','Parker','Penelope','Quentin','Quinn','Rowan','Ruby',
  'Samuel','Sienna','Theo','Tessa','Victor','Violet','Weston','Willow','Xavier','Zara',
  'Adrian','Alice','Blake','Bianca','Carter','Clara','Damon','Daphne','Easton','Elise',
  'Finn','Freya','Grayson','Gemma','Hudson','Hazel','Ivan','Ivy','Jasper','June',
  'Kieran','Kendall','Logan','Lena','Miles','Mira','Noel','Nadia','Owen','Ophelia',
  'Peter','Piper','Reid','Rosa','Silas','Sage','Tristan','Thalia','Ulysses','Uma',
  'Wade','Wren','Xander','Ximena','Yosef','Yara','Zane','Zia','Callum','Esme'
];
const wgcLastNamePool = [
  'Adams','Archer','Baker','Bennett','Brooks','Carter','Clarke','Coleman','Collins','Cooper',
  'Dawson','Dixon','Ellis','Evans','Fisher','Foster','Gardner','Garrett','Gibson','Graham',
  'Grant','Gray','Greene','Griffin','Hale','Hamilton','Harper','Harris','Hayes','Henderson',
  'Hoffman','Holland','Howard','Hudson','Hunt','Hunter','Jackson','Jenkins','Johnson','Keller',
  'Kelly','Kennedy','King','Lawson','Lee','Lewis','Logan','Marshall','Martin','Mason',
  'Matthews','Maxwell','Mitchell','Monroe','Morgan','Murray','Nelson','Newman','Nichols','Norris',
  'Oliver','Parker','Patterson','Payne','Perkins','Perry','Porter','Ramsey','Reed','Reynolds',
  'Rhodes','Rivera','Robbins','Rogers','Ross','Sanders','Sawyer','Schmidt','Sharp','Shelton',
  'Shepherd','Simmons','Spencer','Steele','Stevenson','Stone','Sutton','Tate','Taylor','Thornton',
  'Townsend','Turner','Tyler','Valdez','Vaughn','Wagner','Wallace','Walters','Warren','Watts'
];
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

function escapeWGCLogHTML(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatWGCLogLine(line) {
  const escaped = escapeWGCLogHTML(line);
  if (!escaped) return '&nbsp;';
  const damagePattern = /Damage:\s*(-[0-9][0-9.,]*(?:\s?[A-Za-z%]+)*)/g;
  const artifactPattern = /\+\s*[0-9][0-9.,]*\sArtifact[s]?/g;
  const withDamage = escaped.replace(damagePattern, (_, amount) => `Damage: <span class="wgc-log-damage">${amount}</span>`);
  return withDamage.replace(artifactPattern, match => `<span class="wgc-log-artifact">${match}</span>`);
}

function renderWGCLogLines(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return '';
  return entries.map(line => `<div class="wgc-log-line">${formatWGCLogLine(line)}</div>`).join('');
}

function showWGCTab() {
  wgcTabVisible = true;
  if (typeof hopeSubtabManager !== 'undefined' && hopeSubtabManager) {
    hopeSubtabManager.show('wgc-hope');
  } else {
    const tab = document.querySelector('.hope-subtab[data-subtab="wgc-hope"]');
    const content = document.getElementById('wgc-hope');
    if (tab) tab.classList.remove('hidden');
    if (content) content.classList.remove('hidden');
  }
}

function hideWGCTab() {
  wgcTabVisible = false;
  if (typeof hopeSubtabManager !== 'undefined' && hopeSubtabManager) {
    hopeSubtabManager.hide('wgc-hope');
  } else {
    const tab = document.querySelector('.hope-subtab[data-subtab="wgc-hope"]');
    const content = document.getElementById('wgc-hope');
    if (tab) tab.classList.add('hidden');
    if (content) content.classList.add('hidden');
  }
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
              <label>Hazardous Biomass Interactions <span class="info-tooltip-icon" title="Neutral: No modifiers.\nNegotiation: Social science checks about 10% easier, combat about 10% tougher.\nAggressive: Social science checks roughly 25% harder, combat about 15% easier.\nRecon: Wit checks about 10% easier, athletics checks roughly 25% harder, combat about 15% easier, failures still add 60 seconds.">&#9432;</span></label>
              <select class="hbi-select" data-team="${tIdx}">
                <option value="Neutral"${stanceVal === 'Neutral' ? ' selected' : ''}>Neutral</option>
                <option value="Negotiation"${stanceVal === 'Negotiation' ? ' selected' : ''}>Negotiation</option>
                <option value="Aggressive"${stanceVal === 'Aggressive' ? ' selected' : ''}>Aggressive</option>
                <option value="Recon"${stanceVal === 'Recon' ? ' selected' : ''}>Recon</option>
              </select>
            </div>
            <div class="team-stance">
              <label>Scientific Artifact Retrieval <span class="info-tooltip-icon" title="Neutral: Standard artifact chances and timing.\nCareful: Doubles Natural Science artifact chance but delays the next event by triple time.\nRapid Extraction: Halves downtime but reduces artifact finds by 75%.">&#9432;</span></label>
              <select class="artifact-select" data-team="${tIdx}">
                <option value="Neutral"${artVal === 'Neutral' ? ' selected' : ''}>Neutral</option>
                <option value="Careful"${artVal === 'Careful' ? ' selected' : ''}>Careful</option>
                <option value="Rapid Extraction"${artVal === 'Rapid Extraction' ? ' selected' : ''}>Rapid Extraction</option>
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
        <div class="team-log hidden"><div class="team-log-content"></div></div>
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
      bar: slot.querySelector('.team-hp-bar-fill'),
      indicator: slot.querySelector('.unspent-points-indicator') || null
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
      logEl: card.querySelector('.team-log-content'),
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
  if (!activeDialog) return;
  const editingMember = activeDialog._member;
  if (editingMember) {
    if (activeDialog._restoreStats && activeDialog._originalStats) {
      const original = activeDialog._originalStats;
      editingMember.power = original.power;
      editingMember.athletics = original.athletics;
      editingMember.wit = original.wit;
    }
    editingMember.isBeingEdited = false;
  }
  if (activeDialog.parentElement) {
    document.body.removeChild(activeDialog);
  }
  activeDialog = null;
  if (typeof updateWGCUI === 'function') updateWGCUI();
}

function openRecruitDialog(teamIndex, slotIndex, member) {
  closeRecruitDialog();
  if (member) member.isBeingEdited = true;
  const overlay = document.createElement('div');
  overlay.classList.add('wgc-popup-overlay');

  const win = document.createElement('div');
  win.classList.add('wgc-popup-window');

  const title = document.createElement('h2');
  title.textContent = member ? 'Edit Member' : 'Recruit Member';
  win.appendChild(title);

  const originalStats = member ? {
    power: member.power,
    athletics: member.athletics,
    wit: member.wit
  } : null;

  const getRandomFromPool = pool => pool[Math.floor(Math.random() * pool.length)];

  const nameContainer = document.createElement('div');
  nameContainer.classList.add('wgc-name-container');
  const nameInputs = document.createElement('div');
  nameInputs.classList.add('wgc-name-inputs');

  const firstNameField = document.createElement('input');
  firstNameField.type = 'text';
  firstNameField.placeholder = 'First Name (required)';
  firstNameField.value = member ? member.firstName : '';
  firstNameField.classList.add('wgc-dialog-field');
  nameInputs.appendChild(firstNameField);

  const lastNameField = document.createElement('input');
  lastNameField.type = 'text';
  lastNameField.placeholder = 'Last Name';
  lastNameField.value = member ? member.lastName : '';
  lastNameField.classList.add('wgc-dialog-field');
  nameInputs.appendChild(lastNameField);

  nameContainer.appendChild(nameInputs);

  const rollButton = document.createElement('button');
  rollButton.type = 'button';
  rollButton.classList.add('wgc-roll-name-button');
  rollButton.textContent = 'Roll';
  rollButton.title = 'Roll random names';
  const assignRandomFirst = (focus = true) => {
    firstNameField.value = getRandomFromPool(wgcFirstNamePool);
    if (focus) {
      firstNameField.focus();
      firstNameField.select();
    }
  };
  const assignRandomLast = (focus = true) => {
    lastNameField.value = getRandomFromPool(wgcLastNamePool);
    if (focus) {
      lastNameField.focus();
      lastNameField.select();
    }
  };
  const rollBothNames = (focusFirst = true) => {
    assignRandomFirst(false);
    assignRandomLast(false);
    if (focusFirst) {
      firstNameField.focus();
      firstNameField.select();
    }
  };
  rollButton.addEventListener('click', () => {
    rollBothNames(true);
  });
  nameContainer.appendChild(rollButton);
  win.appendChild(nameContainer);

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

  let baseStats = member ? WGCTeamMember.getBaseStats(member.classType) : WGCTeamMember.getBaseStats(classSelect.value);
  const statValues = {
    power: member ? member.power : baseStats.power,
    athletics: member ? member.athletics : baseStats.athletics,
    wit: member ? member.wit : baseStats.wit
  };

  const lvl = member ? member.level : 1;
  const xp = member ? Math.floor(member.xp || 0) : 0;
  const xpReq = member ? member.getXPForNextLevel() : 10;
  const hp = member ? member.health : 100;
  const hpMax = member ? member.maxHealth : 100;
  const level = document.createElement('div');
  level.classList.add('wgc-member-level');
  level.textContent = `Level: ${lvl} | XP: ${xp} / ${xpReq} | HP: ${formatNumber(hp)} / ${hpMax}`;

  const metaRow = document.createElement('div');
  metaRow.classList.add('wgc-member-meta');
  metaRow.appendChild(level);

  if (member) {
    const respecButton = document.createElement('button');
    respecButton.textContent = 'Respec';
    respecButton.classList.add('wgc-respec-button');
    respecButton.title = 'Refund all allocated skill points.';
    respecButton.addEventListener('click', () => {
      member.respec();
      baseStats = WGCTeamMember.getBaseStats(member.classType);
      statValues.power = member.power;
      statValues.athletics = member.athletics;
      statValues.wit = member.wit;
      alloc.power = 0;
      alloc.athletics = 0;
      alloc.wit = 0;
      updateStatDisplay();
      updateRemainingPoints();
      if (activeDialog) activeDialog._statValues = statValues;
    });
    metaRow.appendChild(respecButton);
  }

  win.appendChild(metaRow);

  const autoState = {
    enabled: !!(member && member.autoEnabled),
    ratios: {
      power: member ? member.autoRatios.power : 0,
      athletics: member ? member.autoRatios.athletics : 0,
      wit: member ? member.autoRatios.wit : 0
    }
  };

  let pointsBudget = member ? member.getPointsToAllocate() : 5;
  const alloc = { power: 0, athletics: 0, wit: 0 };
  const remainingSpan = document.createElement('div');
  const statValueEls = {};
  const autoInputs = {};

  const updateStatDisplay = () => {
    ['power', 'athletics', 'wit'].forEach(stat => {
      const display = member ? member[stat] : statValues[stat] + alloc[stat];
      if (statValueEls[stat]) statValueEls[stat].textContent = display;
    });
  };

  const updateRemainingPoints = () => {
    if (member) {
      remainingSpan.textContent = `Points left: ${member.getPointsToAllocate()}`;
    } else {
      const totalAllocated = alloc.power + alloc.athletics + alloc.wit;
      remainingSpan.textContent = `Points left: ${pointsBudget - totalAllocated}`;
    }
  };

  const statsWrapper = document.createElement('div');
  statsWrapper.classList.add('wgc-stats-wrapper');

  const headerRow = document.createElement('div');
  headerRow.classList.add('wgc-stat-container', 'wgc-stat-header-row');

  const headerSkill = document.createElement('span');
  headerSkill.textContent = 'Skill';
  headerRow.appendChild(headerSkill);

  const headerPoints = document.createElement('span');
  headerPoints.classList.add('wgc-stat-value');
  headerPoints.textContent = 'Points';
  headerRow.appendChild(headerPoints);

  const headerSpacer = document.createElement('span');
  headerSpacer.classList.add('wgc-stat-button-placeholder');
  headerRow.appendChild(headerSpacer);

  const autoToggle = document.createElement('label');
  autoToggle.classList.add('wgc-auto-toggle');
  const autoText = document.createElement('span');
  autoText.textContent = 'Auto';
  autoToggle.appendChild(autoText);
  const autoInfo = document.createElement('span');
  autoInfo.className = 'info-tooltip-icon';
  autoInfo.innerHTML = '&#9432;';
  autoInfo.title = 'Automatically assigns points each update to match the ratios below. Ratios set to 0 are ignored.';
  autoToggle.appendChild(autoInfo);
  const autoCheckbox = document.createElement('input');
  autoCheckbox.type = 'checkbox';
  autoCheckbox.checked = autoState.enabled;
  autoToggle.appendChild(autoCheckbox);
  headerRow.appendChild(autoToggle);

  statsWrapper.appendChild(headerRow);

  const statsDiv = document.createElement('div');
  statsDiv.classList.add('wgc-stats-grid');
  statsWrapper.appendChild(statsDiv);

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
    statValueEls[stat] = valueSpan;

    const addButton = document.createElement('button');
    addButton.textContent = '+';
    addButton.addEventListener('click', () => {
      if (member) {
        if (member.getPointsToAllocate() <= 0) return;
        member[stat] += 1;
        statValues[stat] = member[stat];
      } else {
        const totalAllocated = alloc.power + alloc.athletics + alloc.wit;
        if (totalAllocated >= pointsBudget) return;
        alloc[stat] += 1;
      }
      updateStatDisplay();
      updateRemainingPoints();
    });
    statContainer.appendChild(addButton);

    const autoInput = document.createElement('input');
    autoInput.type = 'number';
    autoInput.min = '0';
    autoInput.step = '1';
    autoInput.classList.add('wgc-auto-input');
    autoInput.value = autoState.ratios[stat] || 0;
    autoInput.placeholder = '0';
    autoInput.addEventListener('input', () => {
      const parsed = Math.max(0, Math.floor(Number(autoInput.value) || 0));
      autoInput.value = parsed;
      autoState.ratios[stat] = parsed;
      if (member) member.applyAutoSettings(member.autoEnabled, autoState.ratios);
    });
    statContainer.appendChild(autoInput);
    autoInputs[stat] = autoInput;

    statsDiv.appendChild(statContainer);
  });

  const syncAutoInputs = () => {
    const disabled = !autoState.enabled;
    Object.values(autoInputs).forEach(input => {
      if (!input) return;
      input.classList.toggle('wgc-auto-input-off', disabled);
    });
  };
  syncAutoInputs();

  autoCheckbox.addEventListener('change', () => {
    autoState.enabled = autoCheckbox.checked;
    if (member) member.applyAutoSettings(autoState.enabled, autoState.ratios);
    syncAutoInputs();
  });

  classSelect.addEventListener('change', () => {
    baseStats = WGCTeamMember.getBaseStats(classSelect.value);
    statValues.power = baseStats.power;
    statValues.athletics = baseStats.athletics;
    statValues.wit = baseStats.wit;
    alloc.power = 0;
    alloc.athletics = 0;
    alloc.wit = 0;
    pointsBudget = 5;
    updateStatDisplay();
    updateRemainingPoints();
    classDescDiv.textContent = classDescriptions[classSelect.value] || '';
  });

  win.appendChild(statsWrapper);
  updateStatDisplay();
  updateRemainingPoints();
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
      member.applyAutoSettings(autoState.enabled, autoState.ratios);
    } else {
      const m = WGCTeamMember.create(firstName, lastName, classSelect.value, alloc);
      m.applyAutoSettings(autoState.enabled, autoState.ratios);
      warpGateCommand.recruitMember(teamIndex, slotIndex, m);
    }
    if (activeDialog) activeDialog._restoreStats = false;
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
        if (activeDialog) activeDialog._restoreStats = false;
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
  activeDialog._autoState = autoState;
  activeDialog._autoInputs = autoInputs;
  activeDialog._autoCheckbox = autoCheckbox;
  activeDialog._statValueEls = statValueEls;
  activeDialog._statValues = statValues;
  activeDialog._syncAutoInputs = syncAutoInputs;
  activeDialog._originalStats = originalStats;
  activeDialog._restoreStats = !!member;

  if (!member) {
    rollBothNames(false);
    firstNameField.focus();
    firstNameField.select();
  } else {
    firstNameField.focus();
    firstNameField.select();
  }
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
            <h3>Teams <span class="info-tooltip-icon" title="${teamRulesTooltip}">&#9432;</span></h3>
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

// (Removed alternate cache; we rely on teamElements below.)

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
      const logEntries = warpGateCommand.logs[tIdx] || [];
      logEl.innerHTML = renderWGCLogLines(logEntries);
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
      let indicator = slots[sIdx].indicator;
      if (member.getPointsToAllocate() > 0) {
        if (!indicator) {
          const newIndicator = document.createElement('div');
          newIndicator.className = 'unspent-points-indicator';
          newIndicator.textContent = '!';
          slot.appendChild(newIndicator);
          slots[sIdx].indicator = newIndicator;
        }
      } else if (indicator) {
        indicator.remove();
        slots[sIdx].indicator = null;
      }
    });
  });

  if (activeDialog && activeDialog._member) {
    const m = activeDialog._member;
    const lvlEl = activeDialog._levelEl;
    const remSpan = activeDialog._remainingSpan;
    const autoInputs = activeDialog._autoInputs || null;
    const autoCheckbox = activeDialog._autoCheckbox || null;
    const autoState = activeDialog._autoState || null;
    const statValueEls = activeDialog._statValueEls || null;
    const statValues = activeDialog._statValues || null;
    const syncAutoInputs = activeDialog._syncAutoInputs || null;
    if (lvlEl) {
      const xpReq = m.getXPForNextLevel();
      lvlEl.textContent = `Level: ${m.level} | XP: ${Math.floor(m.xp || 0)} / ${xpReq} | HP: ${formatNumber(m.health)} / ${m.maxHealth}`;
    }
    if (remSpan) {
      remSpan.textContent = `Points left: ${m.getPointsToAllocate()}`;
    }
    if (statValueEls && statValues) {
      ['power', 'athletics', 'wit'].forEach(stat => {
        statValues[stat] = m[stat];
        if (statValueEls[stat]) statValueEls[stat].textContent = statValues[stat];
      });
    }
    if (autoState) {
      autoState.enabled = m.autoEnabled;
    }
    if (autoCheckbox) {
      autoCheckbox.checked = m.autoEnabled;
    }
    if (autoInputs) {
      ['power', 'athletics', 'wit'].forEach(stat => {
        const val = m.autoRatios[stat] || 0;
        if (autoInputs[stat] && Number(autoInputs[stat].value) !== val) {
          autoInputs[stat].value = val;
        }
        if (autoState && autoState.ratios) autoState.ratios[stat] = val;
      });
    }
    if (syncAutoInputs) syncAutoInputs();
  }
}

function redrawWGCTeamCards() {
  const teamContainer = document.getElementById('wgc-team-cards');
  if (teamContainer) {
    teamContainer.innerHTML = generateWGCTeamCards();
    invalidateWGCTeamCache();
  }
  // Rebuild team element cache after DOM has been regenerated
  invalidateWGCTeamCache();
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
