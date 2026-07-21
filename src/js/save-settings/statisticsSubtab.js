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
    patienceSpentRow: document.getElementById('patience-spent-row'),
    patienceSpent: document.getElementById('patience-spent-display'),
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

function getTerraformHistoryArtificialTypeLabel(typeKey) {
  if (typeKey === 'shell') {
    return t('ui.settings.terraformWorldTypeShell', null, 'Shellworld');
  }
  if (typeKey === 'ring') {
    return t('ui.settings.terraformWorldTypeRing', null, 'Ringworld');
  }
  if (typeKey === 'disk') {
    return t('ui.settings.terraformWorldTypeDisk', null, 'Alderson disk');
  }
  return t('ui.settings.terraformWorldTypeArtificial', null, 'Artificial');
}

function getTerraformHistoryWorldTypeLabel(entry) {
  const worldArchetype = entry.worldArchetype || '';
  if (worldArchetype.indexOf('artificial:') === 0) {
    return getTerraformHistoryArtificialTypeLabel(worldArchetype.slice('artificial:'.length));
  }
  if (worldArchetype) {
    return RWG_WORLD_TYPES[worldArchetype]?.displayName || worldArchetype;
  }
  if (entry.worldType === 'artificial') {
    return t('ui.settings.terraformWorldTypeArtificial', null, 'Artificial');
  }
  return t('ui.settings.terraformWorldTypeUnknown', null, 'Unknown');
}

function buildTerraformHistoryText(entry) {
  const vars = {
    name: entry.name,
    type: getTerraformHistoryWorldTypeLabel(entry),
    game: formatPlayTime(entry.playTimeSeconds),
    real: formatDurationDetailed(entry.realTimeSeconds),
  };
  return t(
    'ui.settings.recentTerraformHistoryEntry',
    vars,
    '{name} ({type}): {game} ({real} real time)'
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
  const playtimeText = t('ui.settings.realTimeLine', { game: gameTime, real: realTime }, '{game} ({real} real time)');
  if (playtimeElement.textContent !== playtimeText) {
    playtimeElement.textContent = playtimeText;
  }

  if (cached.fastestTerraformRow && cached.fastestTerraform) {
    if (fastestTerraformDays === null) {
      if (cached.fastestTerraformRow.style.display !== 'none') {
        cached.fastestTerraformRow.style.display = 'none';
      }
    } else {
      if (cached.fastestTerraformRow.style.display !== '') {
        cached.fastestTerraformRow.style.display = '';
      }
      let fastestTerraformText;
      if (fastestTerraformRealSeconds === null) {
        fastestTerraformText = t('ui.settings.realTimeUnavailableLine', { game: formatPlayTime(fastestTerraformDays) }, '{game} (real time unavailable)');
      } else {
        const fastestRealTime = formatDurationDetailed(fastestTerraformRealSeconds);
        fastestTerraformText = t('ui.settings.realTimeLine', { game: formatPlayTime(fastestTerraformDays), real: fastestRealTime }, '{game} ({real} real time)');
      }
      if (cached.fastestTerraform.textContent !== fastestTerraformText) {
        cached.fastestTerraform.textContent = fastestTerraformText;
      }
    }
  }
  if (cached.birchWorldTerraformRow && cached.birchWorldTerraform) {
    if (birchWorldTerraformTimeSeconds === null) {
      if (cached.birchWorldTerraformRow.style.display !== 'none') {
        cached.birchWorldTerraformRow.style.display = 'none';
      }
    } else {
      if (cached.birchWorldTerraformRow.style.display !== '') {
        cached.birchWorldTerraformRow.style.display = '';
      }
      let birchTerraformText;
      if (birchWorldTerraformRealTimeSeconds === null) {
        birchTerraformText = t('ui.settings.realTimeUnavailableLine', { game: formatPlayTime(birchWorldTerraformTimeSeconds) }, '{game} (real time unavailable)');
      } else {
        const birchRealTime = formatDurationDetailed(birchWorldTerraformRealTimeSeconds);
        birchTerraformText = t('ui.settings.realTimeLine', { game: formatPlayTime(birchWorldTerraformTimeSeconds), real: birchRealTime }, '{game} ({real} real time)');
      }
      if (cached.birchWorldTerraform.textContent !== birchTerraformText) {
        cached.birchWorldTerraform.textContent = birchTerraformText;
      }
    }
  }

  if (!cached.recentTerraformHistoryList || !cached.recentTerraformHistoryTitle || typeof spaceManager === 'undefined') return;

  if (cached.patienceSpentRow && cached.patienceSpent) {
    const patienceSpent = patienceManager.totalSpentHours;
    if (patienceSpent > 0) {
      if (cached.patienceSpentRow.style.display !== '') {
        cached.patienceSpentRow.style.display = '';
      }
      const patienceSpentText = t('ui.settings.patienceSpentValue', { value: patienceSpent.toFixed(1) }, '{value}h');
      if (cached.patienceSpent.textContent !== patienceSpentText) {
        cached.patienceSpent.textContent = patienceSpentText;
      }
    } else {
      if (cached.patienceSpentRow.style.display !== 'none') {
        cached.patienceSpentRow.style.display = 'none';
      }
    }
  }

  if (cached.fastestTerraformByTypeTitle && cached.fastestTerraformByTypeList) {
    const byType = spaceManager.getFastestTerraformByWorldType();
    const worldTypes = Object.keys(byType).sort();
    const fastestByTypeTitle = t(
      'ui.settings.fastestTerraformByTypeTitle',
      null,
      'Fastest Terraform by World Type'
    );
    if (cached.fastestTerraformByTypeTitle.textContent !== fastestByTypeTitle) {
      cached.fastestTerraformByTypeTitle.textContent = fastestByTypeTitle;
    }
    const fastestByTypeDisplay = worldTypes.length ? '' : 'none';
    if (cached.fastestTerraformByTypeTitle.style.display !== fastestByTypeDisplay) {
      cached.fastestTerraformByTypeTitle.style.display = fastestByTypeDisplay;
    }
    if (cached.fastestTerraformByTypeList.style.display !== fastestByTypeDisplay) {
      cached.fastestTerraformByTypeList.style.display = fastestByTypeDisplay;
    }
    syncStatisticsLines(
      cached.fastestTerraformByTypeList,
      worldTypes.map((worldType) => buildFastestTerraformByTypeText(worldType, byType[worldType]))
    );
  }

  const history = spaceManager.getRecentTerraformHistory().slice().reverse();
  const recentTerraformTitle = t(
    'ui.settings.recentTerraformHistoryTitle',
    { count: 10 },
    'Last {count} Terraformed Worlds'
  );
  if (cached.recentTerraformHistoryTitle.textContent !== recentTerraformTitle) {
    cached.recentTerraformHistoryTitle.textContent = recentTerraformTitle;
  }
  if (cached.recentTerraformAverageDisplay && cached.recentTerraformAverageDisplay.textContent !== '') {
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
    const recentTerraformAverageText = buildRecentTerraformAverageText(history);
    if (cached.recentTerraformAverageDisplay.textContent !== recentTerraformAverageText) {
      cached.recentTerraformAverageDisplay.textContent = recentTerraformAverageText;
    }
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
