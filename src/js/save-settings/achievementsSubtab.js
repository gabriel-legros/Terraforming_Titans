let achievementsElements = null;
let achievementsShowHiddenText = false;

function cacheAchievementsElements() {
  if (achievementsElements && achievementsElements.list) {
    return achievementsElements;
  }

  achievementsElements = {
    summary: document.getElementById('settings-achievements-summary'),
    hiddenToggle: document.getElementById('settings-achievements-hidden-toggle'),
    list: document.getElementById('settings-achievements-list'),
  };

  return achievementsElements;
}

function ensureAchievementsHiddenToggle(cached) {
  if (!cached.summary || cached.hiddenToggle) {
    return;
  }
  const label = t('ui.settings.achievements.showHiddenText', null, 'Show hidden achievement text');
  const toggle = createToggleButton({
    onLabel: label,
    offLabel: label,
    isOn: achievementsShowHiddenText
  });
  toggle.id = 'settings-achievements-hidden-toggle';
  toggle.classList.add('settings-achievements-hidden-toggle');
  toggle.addEventListener('click', () => {
    achievementsShowHiddenText = !achievementsShowHiddenText;
    setToggleButtonState(toggle, achievementsShowHiddenText);
    updateAchievementsDisplay();
  });

  cached.summary.insertAdjacentElement('afterend', toggle);
  cached.hiddenToggle = toggle;
}

function createAchievementRow() {
  const row = document.createElement('div');
  row.className = 'settings-achievement-row';

  const status = document.createElement('span');
  status.className = 'settings-achievement-status';

  const body = document.createElement('div');
  body.className = 'settings-achievement-body';

  const title = document.createElement('div');
  title.className = 'settings-achievement-title';

  const requirement = document.createElement('div');
  requirement.className = 'settings-achievement-requirement';

  body.append(title, requirement);
  row.append(status, body);
  row._refs = { status, title, requirement };
  return row;
}

function updateAchievementRow(row, achievement) {
  const refs = row._refs;
  row.classList.toggle('settings-achievement-row--complete', achievement.achieved);
  refs.status.textContent = achievement.achieved
    ? t('ui.settings.achievements.achieved', null, 'Achieved')
    : t('ui.settings.achievements.locked', null, 'Not achieved');
  refs.title.textContent = achievement.title;
  refs.requirement.textContent = achievement.displayRequirement || achievement.requirement;
  refs.requirement.classList.toggle('settings-achievement-requirement--hidden', achievement.hidden && !achievementsShowHiddenText);
}

function syncAchievementRows(container, achievements) {
  container._achievementRows ||= new Map();
  const activeIds = new Set();

  achievements.forEach((achievement) => {
    activeIds.add(achievement.id);
    let row = container._achievementRows.get(achievement.id);
    if (!row) {
      row = createAchievementRow();
      container._achievementRows.set(achievement.id, row);
    }
    updateAchievementRow(row, achievement);
    row.style.display = '';
    container.appendChild(row);
  });

  container._achievementRows.forEach((row, id) => {
    if (!activeIds.has(id)) {
      row.remove();
      container._achievementRows.delete(id);
    }
  });
}

function updateAchievementsDisplay() {
  const cached = cacheAchievementsElements();
  if (!cached.list || !achievementManager) {
    return;
  }
  ensureAchievementsHiddenToggle(cached);
  if (cached.hiddenToggle) {
    const label = t('ui.settings.achievements.showHiddenText', null, 'Show hidden achievement text');
    cached.hiddenToggle.dataset.onLabel = label;
    cached.hiddenToggle.dataset.offLabel = label;
    setToggleButtonState(cached.hiddenToggle, achievementsShowHiddenText);
  }

  const summary = achievementManager.getSummary(achievementsShowHiddenText);
  if (cached.summary) {
    cached.summary.textContent = t(
      'ui.settings.achievements.summary',
      { achieved: summary.achieved, total: summary.total },
      '{achieved}/{total} achieved'
    );
  }
  syncAchievementRows(cached.list, summary.achievements);
}

function initializeAchievementsSubtab() {
  ensureAchievementsHiddenToggle(cacheAchievementsElements());
  updateAchievementsDisplay();
}
