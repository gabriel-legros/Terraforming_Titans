let achievementsElements = null;

function cacheAchievementsElements() {
  if (achievementsElements && achievementsElements.list) {
    return achievementsElements;
  }

  achievementsElements = {
    summary: document.getElementById('settings-achievements-summary'),
    list: document.getElementById('settings-achievements-list'),
  };

  return achievementsElements;
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
  refs.requirement.textContent = achievement.requirement;
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

  const summary = achievementManager.getSummary();
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
  cacheAchievementsElements();
  updateAchievementsDisplay();
}
