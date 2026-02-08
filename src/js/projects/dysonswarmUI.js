if (typeof makeCollapsibleCard === 'undefined') {
  var makeCollapsibleCard = (typeof globalThis !== 'undefined' && globalThis.makeCollapsibleCard)
    ? globalThis.makeCollapsibleCard
    : null;
  try {
    if (!makeCollapsibleCard && typeof require === 'function') {
      ({ makeCollapsibleCard } = require('../ui-utils.js'));
    }
  } catch (e) {}
}

function renderDysonSwarmUI(project, container) {
  const card = document.createElement('div');
  card.classList.add('dyson-swarm-card');
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">${localizeProjectsText('projectsTab.projects.dysonSwarm.title', null, 'Dyson Swarm Collectors')}</span>
    </div>
    <div class="card-body">
      <div class="stats-grid three-col">
        <div class="stat-item"><span class="stat-label">${localizeProjectsText('projectsTab.labels.collectors', null, 'Collectors:')}</span><span id="ds-collectors"></span></div>
        <div class="stat-item"><span class="stat-label">${localizeProjectsText('projectsTab.projects.dyson.powerPerCollector', null, 'Power/Collector:')}</span><span id="ds-power-per"></span></div>
        <div class="stat-item"><span class="stat-label">${localizeProjectsText('projectsTab.projects.dyson.totalPower', null, 'Total Power:')}</span><span id="ds-total-power"></span></div>
      </div>
      <div class="stats-grid two-col collector-cost-container">
        <div class="stat-item">
          <span class="stat-label">${localizeProjectsText('projectsTab.projects.dyson.collectorCost', null, 'Collector Cost:')}</span>
          <span id="ds-collector-cost"></span>
        </div>
        <div class="stat-item">
          <span class="stat-label">${localizeProjectsText('projectsTab.projects.dyson.expansion', null, 'Expansion')}</span>
          <span id="ds-expansion-rate"></span>
        </div>
      </div>
      <div class="progress-button-container dyson-progress-container"><button id="ds-start" class="progress-button"></button></div>
      <div class="checkbox-container">
        <input type="checkbox" id="ds-auto">
        <label for="ds-auto">${localizeProjectsText('projectsTab.card.autoStart', null, 'Auto start')}</label>
        <input type="checkbox" id="ds-auto-travel-reset">
        <label for="ds-auto-travel-reset">${localizeProjectsText('projectsTab.card.uncheckOnTravel', null, 'Uncheck on travelling')}</label>
      </div>
    </div>`;
  if (typeof makeCollapsibleCard === 'function') makeCollapsibleCard(card);
  container.appendChild(card);

  const autoCheckbox = card.querySelector('#ds-auto');
  const travelResetCheckbox = card.querySelector('#ds-auto-travel-reset');

  projectElements[project.name] = {
    ...projectElements[project.name],
    swarmCard: card,
    collectorsDisplay: card.querySelector('#ds-collectors'),
    powerPerDisplay: card.querySelector('#ds-power-per'),
    totalPowerDisplay: card.querySelector('#ds-total-power'),
    costDisplay: card.querySelector('#ds-collector-cost'),
    expansionRateDisplay: card.querySelector('#ds-expansion-rate'),
    startButton: card.querySelector('#ds-start'),
    autoCheckbox,
    autoStartTravelResetCheckbox: travelResetCheckbox,
    collectorAutoStartTravelResetCheckbox: travelResetCheckbox,
  };

  card.querySelector('#ds-start').addEventListener('click', () => project.startCollector());
  autoCheckbox.addEventListener('change', e => { project.autoDeployCollectors = e.target.checked; });
  travelResetCheckbox.addEventListener('change', e => {
    project.autoStartUncheckOnTravel = e.target.checked;
    updateDysonSwarmUI(project);
  });
}

function updateCollectorCostDisplay(project, costDisplay) {
  const items = [];
  const attributes = project.attributes || {};
  const storageProj = attributes.canUseSpaceStorage ? projectManager.projects.spaceStorage : null;

  for (const category in project.collectorCost) {
    const categoryCost = project.collectorCost[category];
    for (const resource in categoryCost) {
      const resourceData = resources[category][resource];
      const displayName = resourceData.displayName || `${resource.charAt(0).toUpperCase()}${resource.slice(1)}`;
      const required = categoryCost[resource];
      const storageKey = resource === 'water' ? 'liquidWater' : resource;
      const available = (resourceData.value || 0) + (storageProj ? storageProj.getAvailableStoredResource(storageKey) : 0);
      items.push({
        key: `${category}.${resource}`,
        text: `${displayName}: ${formatNumber(required, true)}`,
        missing: available < required,
      });
    }
  }

  const keyString = items.map(item => item.key).join(',');
  if (costDisplay.dataset.collectorCostKeys !== keyString) {
    costDisplay.dataset.collectorCostKeys = keyString;
    costDisplay.textContent = '';
    costDisplay._collectorCostSpans = new Map();
    items.forEach((item, idx) => {
      const span = document.createElement('span');
      costDisplay._collectorCostSpans.set(item.key, span);
      costDisplay.appendChild(span);
      if (idx < items.length - 1) {
        costDisplay.appendChild(document.createTextNode(', '));
      }
    });
  }

  const spans = costDisplay._collectorCostSpans;
  items.forEach(item => {
    const span = spans.get(item.key);
    const color = item.missing ? 'red' : '';
    if (span.textContent !== item.text) {
      span.textContent = item.text;
    }
    if (span.style.color !== color) {
      span.style.color = color;
    }
  });
}

function updateDysonSwarmUI(project) {
  const els = projectElements[project.name];
  if (!els) return;
  const showCard = project.isCompleted || project.collectors > 0;
  if (els.swarmCard) {
    els.swarmCard.style.display = showCard ? 'block' : 'none';
  }
  if (!showCard) return;

  els.collectorsDisplay.textContent = formatNumber(project.collectors, false, 2);
  els.powerPerDisplay.textContent = formatNumber(project.energyPerCollector, false, 2);
  const total = project.energyPerCollector * project.collectors;
  els.totalPowerDisplay.textContent = formatNumber(total, false, 2);
  if (els.costDisplay) {
    updateCollectorCostDisplay(project, els.costDisplay);
  }
  if (els.expansionRateDisplay) {
    const active = project.isCollectorContinuous()
      ? project.autoDeployCollectors && (project.isCompleted || project.collectors > 0)
      : project.collectorProgress > 0;
    const rate = active ? (1000 / project.collectorDuration) : 0;
    els.expansionRateDisplay.textContent = localizeProjectsText(
      'projectsTab.projects.dyson.collectorsPerSecond',
      { value: formatNumber(rate, true, 3) },
      `${formatNumber(rate, true, 3)} collectors/s`
    );
  }
  if (els.startButton) {
    els.startButton.parentElement.style.display = '';
  }
  if (els.autoCheckbox) {
    const canAuto = project.unlocked || project.collectors > 0;
    els.autoCheckbox.parentElement.style.display = canAuto ? '' : 'none';
    els.autoCheckbox.disabled = !canAuto;
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
  // Check if in continuous mode
  if (project.isCollectorContinuous()) {
    if (project.autoDeployCollectors && (project.isCompleted || project.collectors > 0)) {
      els.startButton.textContent = localizeProjectsText('projectsTab.status.continuousNoSuffix', null, 'Continuous');
      els.startButton.style.background = '#4caf50';
    } else {
      els.startButton.textContent = localizeProjectsText('projectsTab.status.stopped', null, 'Stopped');
      els.startButton.style.background = '#f44336';
    }
    els.startButton.disabled = true;
  } else if (project.collectorProgress > 0) {
    const pct = ((project.collectorDuration - project.collectorProgress) / project.collectorDuration) * 100;
    const secs = Math.max(0, project.collectorProgress / 1000).toFixed(2);
    els.startButton.textContent = `Deploying (${secs}s)`;
    els.startButton.style.background = `linear-gradient(to right, #4caf50 ${pct}%, #ccc ${pct}%)`;
  } else {
    const can = project.canStartCollector();
    const dur = Math.round(project.collectorDuration / 1000);
    els.startButton.textContent = localizeProjectsText(
      'projectsTab.projects.dyson.deployCollector',
      { seconds: dur },
      `Deploy Collector (${dur}s)`
    );
    els.startButton.style.background = can ? '#4caf50' : '#f44336';
    els.startButton.disabled = !can;
  }
  els.autoCheckbox.checked = project.autoDeployCollectors;
  if (els.autoStartTravelResetCheckbox) {
    els.autoStartTravelResetCheckbox.checked = project.autoStartUncheckOnTravel === true;
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.renderDysonSwarmUI = renderDysonSwarmUI;
  globalThis.updateDysonSwarmUI = updateDysonSwarmUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderDysonSwarmUI, updateDysonSwarmUI };
}
