function renderDysonSwarmUI(project, container) {
  const card = document.createElement('div');
  card.classList.add('dyson-swarm-card');
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">Dyson Swarm</span>
    </div>
    <div class="card-body">
      <div class="stats-grid">
        <div class="stat-item"><span class="stat-label">Collectors:</span><span id="ds-collectors"></span></div>
        <div class="stat-item"><span class="stat-label">Power/Collector:</span><span id="ds-power-per"></span></div>
        <div class="stat-item"><span class="stat-label">Total Power:</span><span id="ds-total-power"></span></div>
        <div class="stat-item"><span class="stat-label">Collector Cost:</span><span id="ds-collector-cost"></span></div>
      </div>
      <div class="progress-button-container"><button id="ds-start" class="progress-button"></button></div>
      <div class="checkbox-container"><input type="checkbox" id="ds-auto"><label for="ds-auto">Auto start</label></div>
    </div>`;
  container.appendChild(card);

  projectElements[project.name] = {
    ...projectElements[project.name],
    swarmCard: card,
    collectorsDisplay: card.querySelector('#ds-collectors'),
    powerPerDisplay: card.querySelector('#ds-power-per'),
    totalPowerDisplay: card.querySelector('#ds-total-power'),
    costDisplay: card.querySelector('#ds-collector-cost'),
    startButton: card.querySelector('#ds-start'),
    autoCheckbox: card.querySelector('#ds-auto')
  };

  card.querySelector('#ds-start').addEventListener('click', () => project.startCollector());
  card.querySelector('#ds-auto').addEventListener('change', e => { project.autoDeployCollectors = e.target.checked; });
}

function updateDysonSwarmUI(project) {
  const els = projectElements[project.name];
  if (!els) return;
  if (els.swarmCard) {
    els.swarmCard.style.display = project.isCompleted ? 'block' : 'none';
  }
  els.collectorsDisplay.textContent = formatNumber(project.collectors, false, 0);
  els.powerPerDisplay.textContent = formatNumber(project.energyPerCollector, false, 0);
  const total = project.energyPerCollector * project.collectors;
  els.totalPowerDisplay.textContent = formatNumber(total, false, 0);
  if (els.costDisplay) {
    const parts = [];
    for (const category in project.collectorCost) {
      for (const res in project.collectorCost[category]) {
        const displayName = (resources && resources[category] && resources[category][res] && resources[category][res].displayName)
          ? resources[category][res].displayName
          : res.charAt(0).toUpperCase() + res.slice(1);
        parts.push(`${displayName}: ${formatNumber(project.collectorCost[category][res], true)}`);
      }
    }
    els.costDisplay.textContent = parts.join(', ');
  }
  if (!project.isCompleted) {
    els.startButton.textContent = 'Receiver Incomplete';
    els.startButton.style.background = '#999';
    els.startButton.disabled = true;
    els.autoCheckbox.disabled = true;
    return;
  } else {
    els.startButton.disabled = false;
    els.autoCheckbox.disabled = false;
  }
  if (project.collectorProgress > 0) {
    const pct = ((project.collectorDuration - project.collectorProgress) / project.collectorDuration) * 100;
    const secs = Math.max(0, project.collectorProgress / 1000).toFixed(2);
    els.startButton.textContent = `Deploying (${secs}s)`;
    els.startButton.style.background = `linear-gradient(to right, #4caf50 ${pct}%, #ccc ${pct}%)`;
  } else {
    const can = project.canStartCollector();
    els.startButton.textContent = 'Deploy Collector';
    els.startButton.style.background = can ? '#4caf50' : '#f44336';
  }
  els.autoCheckbox.checked = project.autoDeployCollectors;
}

if (typeof globalThis !== 'undefined') {
  globalThis.renderDysonSwarmUI = renderDysonSwarmUI;
  globalThis.updateDysonSwarmUI = updateDysonSwarmUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderDysonSwarmUI, updateDysonSwarmUI };
}
