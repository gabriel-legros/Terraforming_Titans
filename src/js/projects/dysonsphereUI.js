if (typeof makeCollapsibleCard === 'undefined') {
  var makeCollapsibleCard = (typeof window !== 'undefined' && window.makeCollapsibleCard)
    ? window.makeCollapsibleCard
    : null;
  try {
    if (!makeCollapsibleCard && typeof require === 'function') {
      ({ makeCollapsibleCard } = require('../ui-utils.js'));
    }
  } catch (e) {}
}

function renderDysonSphereUI(project, container) {
  const card = document.createElement('div');
  card.classList.add('dyson-sphere-card');
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">Dyson Sphere Collectors</span>
    </div>
    <div class="card-body">
      <div class="stats-grid four-col">
        <div class="stat-item"><span class="stat-label">Collectors:</span><span id="dsph-collectors"></span></div>
        <div class="stat-item"><span class="stat-label">Power/Collector:</span><span id="dsph-power-per"></span></div>
        <div class="stat-item"><span class="stat-label">Total Power:</span><span id="dsph-total-power"></span></div>
        <div class="stat-item"><span class="stat-label">Frame:</span><span id="dsph-frame"></span></div>
      </div>
      <div class="stats-grid two-col collector-cost-container">
        <div class="stat-item">
          <span class="stat-label">Collector Cost:</span>
          <span id="dsph-collector-cost"></span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Expansion/s:</span>
          <span id="dsph-expansion-rate"></span>
        </div>
      </div>
      <div class="progress-button-container"><button id="dsph-start" class="progress-button"></button></div>
      <div class="checkbox-container">
        <input type="checkbox" id="dsph-auto">
        <label for="dsph-auto">Auto start</label>
        <input type="checkbox" id="dsph-auto-travel-reset">
        <label for="dsph-auto-travel-reset">Uncheck on travelling</label>
      </div>
    </div>`;
  if (typeof makeCollapsibleCard === 'function') makeCollapsibleCard(card);
  container.appendChild(card);

  const autoCheckbox = card.querySelector('#dsph-auto');
  const travelResetCheckbox = card.querySelector('#dsph-auto-travel-reset');
  const startButton = card.querySelector('#dsph-start');

  projectElements[project.name] = {
    ...projectElements[project.name],
    sphereCard: card,
    collectorsDisplay: card.querySelector('#dsph-collectors'),
    powerPerDisplay: card.querySelector('#dsph-power-per'),
    totalPowerDisplay: card.querySelector('#dsph-total-power'),
    frameStatusDisplay: card.querySelector('#dsph-frame'),
    costDisplay: card.querySelector('#dsph-collector-cost'),
    expansionRateDisplay: card.querySelector('#dsph-expansion-rate'),
    startButton,
    autoCheckbox,
    autoStartTravelResetCheckbox: travelResetCheckbox,
    collectorAutoStartTravelResetCheckbox: travelResetCheckbox,
  };

  startButton.addEventListener('click', () => {
    if (!project.isCompleted) {
      return;
    }
    if (project.isCollectorContinuous()) {
      project.autoDeployCollectors = !project.autoDeployCollectors;
      updateDysonSphereUI(project);
      return;
    }
    project.startCollector();
  });
  autoCheckbox.addEventListener('change', e => { project.autoDeployCollectors = e.target.checked; });
  travelResetCheckbox.addEventListener('change', e => {
    project.autoStartUncheckOnTravel = e.target.checked;
    updateDysonSphereUI(project);
  });
}

function updateDysonSphereUI(project) {
  const els = projectElements[project.name];
  if (!els) return;
  const showCard = project.unlocked || project.collectors > 0 || project.isCompleted;
  if (els.sphereCard) {
    els.sphereCard.style.display = showCard ? 'block' : 'none';
  }
  if (!showCard) return;

  const collectors = project.collectors || 0;
  els.collectorsDisplay.textContent = formatNumber(collectors, false, 2);
  els.powerPerDisplay.textContent = formatNumber(project.energyPerCollector, false, 2);
  const total = project.energyPerCollector * collectors;
  els.totalPowerDisplay.textContent = formatNumber(total, false, 2);
  els.frameStatusDisplay.textContent = project.isCompleted ? 'Complete' : 'Incomplete';

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
  if (els.expansionRateDisplay) {
    const active = project.isCollectorContinuous()
      ? project.autoDeployCollectors && (project.isCompleted || collectors > 0)
      : project.collectorProgress > 0;
    const rate = active ? (1000 / project.collectorDuration) : 0;
    els.expansionRateDisplay.textContent = `${formatNumber(rate, true, 3)} collectors/s`;
  }

  if (els.autoCheckbox) {
    const canAuto = project.isCompleted || project.collectors > 0;
    els.autoCheckbox.parentElement.style.display = canAuto ? '' : 'none';
    els.autoCheckbox.disabled = !canAuto;
    els.autoCheckbox.checked = project.autoDeployCollectors;
  }
  if (els.autoStartTravelResetCheckbox) {
    els.autoStartTravelResetCheckbox.checked = project.autoStartUncheckOnTravel === true;
    els.autoStartTravelResetCheckbox.disabled = !(project.unlocked || project.collectors > 0);
  }
  if (els.collectorAutoStartTravelResetCheckbox) {
    els.collectorAutoStartTravelResetCheckbox.checked = project.autoStartUncheckOnTravel === true;
    els.collectorAutoStartTravelResetCheckbox.disabled = !(project.unlocked || project.collectors > 0);
  }
  if (els.totalPowerDisplay) {
    els.totalPowerDisplay.parentElement.style.display = (project.unlocked && project.isCompleted) ? '' : 'none';
  }

  if (!els.startButton) {
    return;
  }
  if (!project.isCompleted) {
    els.startButton.textContent = 'Build the frame to deploy collectors';
    els.startButton.style.background = '#f44336';
    els.startButton.disabled = true;
    return;
  }

  els.startButton.disabled = false;
  if (project.isCollectorContinuous()) {
    if (project.autoDeployCollectors && (project.isCompleted || project.collectors > 0)) {
      els.startButton.textContent = 'Continuous (On)';
      els.startButton.style.background = '#4caf50';
    } else {
      els.startButton.textContent = 'Continuous (Off)';
      els.startButton.style.background = '#f44336';
    }
  } else if (project.collectorProgress > 0) {
    const pct = ((project.collectorDuration - project.collectorProgress) / project.collectorDuration) * 100;
    const secs = Math.max(0, project.collectorProgress / 1000).toFixed(2);
    els.startButton.textContent = `Deploying (${secs}s)`;
    els.startButton.style.background = `linear-gradient(to right, #4caf50 ${pct}%, #ccc ${pct}%)`;
  } else {
    const can = project.canStartCollector();
    const dur = Math.round(project.collectorDuration / 1000);
    els.startButton.textContent = `Deploy Collector (${dur}s)`;
    els.startButton.style.background = can ? '#4caf50' : '#f44336';
    els.startButton.disabled = !can;
  }
}

if (typeof window !== 'undefined') {
  window.renderDysonSphereUI = renderDysonSphereUI;
  window.updateDysonSphereUI = updateDysonSphereUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderDysonSphereUI, updateDysonSphereUI };
}
