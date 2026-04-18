let statisticsElements = null;

function cacheStatisticsElements() {
  if (typeof document === 'undefined') {
    return null;
  }

  if (statisticsElements && statisticsElements.totalPlaytime) {
    return statisticsElements;
  }

  statisticsElements = {
    totalPlaytime: document.getElementById('total-playtime-display'),
    fastestTerraformRow: document.getElementById('fastest-terraform-row'),
    fastestTerraform: document.getElementById('fastest-terraform-display'),
    recentTerraformHistoryTitle: document.getElementById('recent-terraform-history-title'),
    recentTerraformHistoryList: document.getElementById('recent-terraform-history-list'),
  };

  return statisticsElements;
}

function buildTerraformHistoryText(entry) {
  const vars = {
    name: entry.name,
    game: formatPlayTime(entry.playTimeSeconds),
    real: formatDurationDetailed(entry.realTimeSeconds),
  };
  return t(
    'ui.settings.recentTerraformHistoryEntry',
    vars,
    '{name}: {game} ({real} real time)'
  );
}

function updateStatisticsDisplay() {
  const cached = cacheStatisticsElements();
  const playtimeElement = cached ? cached.totalPlaytime : null;
  if (!playtimeElement) return;

  const gameTime = formatPlayTime(totalPlayTimeSeconds);
  const realTime = formatDurationDetailed(totalRealPlayTimeSeconds);
  playtimeElement.textContent = `${gameTime} (${realTime} real time)`;

  if (cached.fastestTerraformRow && cached.fastestTerraform) {
    if (fastestTerraformDays === null) {
      cached.fastestTerraformRow.style.display = 'none';
    } else {
      cached.fastestTerraformRow.style.display = '';
      if (fastestTerraformRealSeconds === null) {
        cached.fastestTerraform.textContent = `${formatPlayTime(fastestTerraformDays)} (real time unavailable)`;
      } else {
        const fastestRealTime = formatDurationDetailed(fastestTerraformRealSeconds);
        cached.fastestTerraform.textContent = `${formatPlayTime(fastestTerraformDays)} (${fastestRealTime} real time)`;
      }
    }
  }

  if (!cached.recentTerraformHistoryList || !cached.recentTerraformHistoryTitle || typeof spaceManager === 'undefined') return;

  const history = spaceManager.getRecentTerraformHistory().slice().reverse();
  cached.recentTerraformHistoryTitle.textContent = t(
    'ui.settings.recentTerraformHistoryTitle',
    { count: 10 },
    'Last {count} Terraformed Worlds'
  );
  cached.recentTerraformHistoryList.replaceChildren();

  if (!history.length) {
    const emptyLine = document.createElement('p');
    emptyLine.className = 'settings-stat-line';
    emptyLine.textContent = t(
      'ui.settings.recentTerraformHistoryEmpty',
      null,
      'No terraformed worlds recorded yet.'
    );
    cached.recentTerraformHistoryList.appendChild(emptyLine);
    return;
  }

  history.forEach((entry) => {
    const line = document.createElement('p');
    line.className = 'settings-stat-line';
    line.textContent = buildTerraformHistoryText(entry);
    cached.recentTerraformHistoryList.appendChild(line);
  });
}

function initializeStatisticsSubtab() {
  cacheStatisticsElements();
  updateStatisticsDisplay();
}
