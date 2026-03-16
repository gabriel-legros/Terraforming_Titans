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
  };

  return statisticsElements;
}

function updateStatisticsDisplay() {
  const cached = cacheStatisticsElements();
  const playtimeElement = cached ? cached.totalPlaytime : null;
  if (!playtimeElement) return;

  const gameTime = formatPlayTime(totalPlayTimeSeconds);
  const realTime = formatDurationDetailed(totalRealPlayTimeSeconds);
  playtimeElement.textContent = `${gameTime} (${realTime} real time)`;

  if (!cached.fastestTerraformRow || !cached.fastestTerraform) return;
  if (fastestTerraformDays === null) {
    cached.fastestTerraformRow.style.display = 'none';
    return;
  }

  cached.fastestTerraformRow.style.display = '';
  if (fastestTerraformRealSeconds === null) {
    cached.fastestTerraform.textContent = `${formatPlayTime(fastestTerraformDays)} (real time unavailable)`;
    return;
  }

  const fastestRealTime = formatDurationDetailed(fastestTerraformRealSeconds);
  cached.fastestTerraform.textContent = `${formatPlayTime(fastestTerraformDays)} (${fastestRealTime} real time)`;
}

function initializeStatisticsSubtab() {
  cacheStatisticsElements();
  updateStatisticsDisplay();
}
