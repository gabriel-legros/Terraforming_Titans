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
    birchWorldTerraformRow: document.getElementById('birch-world-terraform-row'),
    birchWorldTerraform: document.getElementById('birch-world-terraform-display'),
    fastestTerraformByTypeTitle: document.getElementById('fastest-terraform-by-type-title'),
    fastestTerraformByTypeList: document.getElementById('fastest-terraform-by-type-list'),
    recentTerraformHistoryTitle: document.getElementById('recent-terraform-history-title'),
    recentTerraformAverageDisplay: document.getElementById('recent-terraform-average-display'),
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

function buildFastestTerraformByTypeText(worldType, entry) {
  const typeLabel = RWG_WORLD_TYPES[worldType]?.displayName || worldType;
  const vars = {
    type: typeLabel,
    game: formatPlayTime(entry.playTimeSeconds),
    real: formatDurationDetailed(entry.realTimeSeconds),
  };
  return t(
    'ui.settings.fastestTerraformByTypeEntry',
    vars,
    '{type}: {game} ({real} real time)'
  );
}

function buildRecentTerraformAverageText(history) {
  let totalGameSeconds = 0;
  let totalRealSeconds = 0;
  let realCount = 0;
  const totalCount = history.length;

  history.forEach((entry) => {
    totalGameSeconds += entry.playTimeSeconds;
    if (entry.realTimeSeconds !== null) {
      totalRealSeconds += entry.realTimeSeconds;
      realCount += 1;
    }
  });

  const avgGame = formatPlayTime(totalGameSeconds / totalCount);
  const avgReal = realCount > 0
    ? formatDurationDetailed(totalRealSeconds / realCount)
    : t('ui.settings.realTimeUnavailable', null, 'real time unavailable');

  return t(
    'ui.settings.recentTerraformHistoryAverage',
    { game: avgGame, real: avgReal },
    'Average: {game} ({real} real time)'
  );
}

function syncStatisticsLines(container, lines) {
  container._statLineNodes ||= [];
  while (container._statLineNodes.length < lines.length) {
    const line = document.createElement('p');
    line.className = 'settings-stat-line';
    container._statLineNodes.push(line);
    container.appendChild(line);
  }
  container._statLineNodes.forEach((line, index) => {
    if (index >= lines.length) {
      line.style.display = 'none';
      return;
    }
    line.style.display = '';
    if (line.textContent !== lines[index]) {
      line.textContent = lines[index];
    }
  });
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
  if (cached.birchWorldTerraformRow && cached.birchWorldTerraform) {
    if (birchWorldTerraformTimeSeconds === null) {
      cached.birchWorldTerraformRow.style.display = 'none';
    } else {
      cached.birchWorldTerraformRow.style.display = '';
      if (birchWorldTerraformRealTimeSeconds === null) {
        cached.birchWorldTerraform.textContent = `${formatPlayTime(birchWorldTerraformTimeSeconds)} (real time unavailable)`;
      } else {
        const birchRealTime = formatDurationDetailed(birchWorldTerraformRealTimeSeconds);
        cached.birchWorldTerraform.textContent = `${formatPlayTime(birchWorldTerraformTimeSeconds)} (${birchRealTime} real time)`;
      }
    }
  }

  if (!cached.recentTerraformHistoryList || !cached.recentTerraformHistoryTitle || typeof spaceManager === 'undefined') return;

  if (cached.fastestTerraformByTypeTitle && cached.fastestTerraformByTypeList) {
    const byType = spaceManager.getFastestTerraformByWorldType();
    const worldTypes = Object.keys(byType).sort();
    cached.fastestTerraformByTypeTitle.textContent = t(
      'ui.settings.fastestTerraformByTypeTitle',
      null,
      'Fastest Terraform by World Type'
    );
    cached.fastestTerraformByTypeTitle.style.display = worldTypes.length ? '' : 'none';
    cached.fastestTerraformByTypeList.style.display = worldTypes.length ? '' : 'none';
    syncStatisticsLines(
      cached.fastestTerraformByTypeList,
      worldTypes.map((worldType) => buildFastestTerraformByTypeText(worldType, byType[worldType]))
    );
  }

  const history = spaceManager.getRecentTerraformHistory().slice().reverse();
  cached.recentTerraformHistoryTitle.textContent = t(
    'ui.settings.recentTerraformHistoryTitle',
    { count: 10 },
    'Last {count} Terraformed Worlds'
  );
  if (cached.recentTerraformAverageDisplay) {
    cached.recentTerraformAverageDisplay.textContent = '';
  }

  if (!history.length) {
    syncStatisticsLines(cached.recentTerraformHistoryList, [t(
      'ui.settings.recentTerraformHistoryEmpty',
      null,
      'No terraformed worlds recorded yet.'
    )]);
    return;
  }

  if (cached.recentTerraformAverageDisplay) {
    cached.recentTerraformAverageDisplay.textContent = buildRecentTerraformAverageText(history);
  }

  syncStatisticsLines(
    cached.recentTerraformHistoryList,
    history.map((entry) => buildTerraformHistoryText(entry))
  );
}

function initializeStatisticsSubtab() {
  cacheStatisticsElements();
  updateStatisticsDisplay();
}
