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

function getDysonSphereText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

function renderDysonSphereUI(project, container) {
  const card = document.createElement('div');
  card.classList.add('dyson-sphere-card');
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">${getDysonSphereText('ui.projects.dysonSphere.title', 'Dyson Sphere Collectors')}</span>
    </div>
    <div class="card-body">
      <div class="stats-grid three-col project-summary-grid">
        <div class="stat-item project-summary-box"><span class="stat-label">${getDysonSphereText('ui.projects.dysonSphere.collectors', 'Collectors:')}</span><span id="dsph-collectors" class="stat-value"></span></div>
        <div class="stat-item project-summary-box"><span class="stat-label">${getDysonSphereText('ui.projects.dysonSphere.powerPerCollector', 'Power/Collector:')}</span><span id="dsph-power-per" class="stat-value"></span></div>
        <div class="stat-item project-summary-box"><span class="stat-label">${getDysonSphereText('ui.projects.dysonSphere.totalPower', 'Total Power:')}</span><span id="dsph-total-power" class="stat-value"></span></div>
      </div>
      <div class="stats-grid three-col project-summary-grid">
        <div class="stat-item project-summary-box"><span class="stat-label">${getDysonSphereText('ui.projects.dysonSphere.sphereCount', 'Sphere Count:')}</span><span id="dsph-sphere-count" class="stat-value"></span></div>
        <div class="stat-item project-summary-box"><span class="stat-label">${getDysonSphereText('ui.projects.dysonSphere.maxSpheres', 'Max Spheres:')}</span><span id="dsph-max-spheres" class="stat-value"></span></div>
        <div class="stat-item project-summary-box"><span class="stat-label">${getDysonSphereText('ui.projects.dysonSphere.maxPower', 'Max Power:')}</span><span id="dsph-max-power" class="stat-value"></span></div>
      </div>
      <div class="stats-grid two-col collector-cost-container project-summary-grid">
        <div class="stat-item project-summary-box">
          <span class="stat-label" id="dsph-collector-cost-label">${getDysonSphereText('ui.projects.dysonSphere.collectorCost', 'Collector Cost:')}</span>
          <span id="dsph-collector-cost" class="stat-value"></span>
        </div>
        <div class="stat-item project-summary-box">
          <span class="stat-label">${getDysonSphereText('ui.projects.dysonSphere.expansion', 'Expansion')}</span>
          <span id="dsph-expansion-rate" class="stat-value"></span>
        </div>
      </div>
      <div class="progress-button-container dyson-progress-container"><button id="dsph-start" class="progress-button"></button></div>
      <div class="checkbox-container">
        <input type="checkbox" id="dsph-auto">
        <label for="dsph-auto">${getDysonSphereText('ui.projects.autoStart', 'Auto start')}</label>
        <input type="checkbox" id="dsph-auto-travel-reset">
        <label for="dsph-auto-travel-reset">${getDysonSphereText('ui.projects.uncheckOnTravel', 'Uncheck on travelling')}</label>
      </div>
    </div>`;
  if (typeof makeCollapsibleCard === 'function') makeCollapsibleCard(card);
  container.appendChild(card);

  const autoCheckbox = card.querySelector('#dsph-auto');
  const travelResetCheckbox = card.querySelector('#dsph-auto-travel-reset');
  const startButton = card.querySelector('#dsph-start');
  const collectorCostLabel = card.querySelector('#dsph-collector-cost-label');
  let collectorCostTooltipContent = null;
  if (collectorCostLabel && typeof attachDynamicInfoTooltip === 'function') {
    const collectorCostInfo = document.createElement('span');
    collectorCostInfo.className = 'info-tooltip-icon';
    collectorCostInfo.innerHTML = '&#9432;';
    collectorCostLabel.appendChild(collectorCostInfo);
    collectorCostTooltipContent = attachDynamicInfoTooltip(
      collectorCostInfo,
      getDysonSphereText('ui.projects.dysonSphere.collectorCostTooltip', 'After the first sphere worth of power (5e25), Dyson Sphere collector expansion adds a fixed superalloy cost per collector to build additional frames.')
    );
  }

  projectElements[project.name] = {
    ...projectElements[project.name],
    sphereCard: card,
    collectorsDisplay: card.querySelector('#dsph-collectors'),
    powerPerDisplay: card.querySelector('#dsph-power-per'),
    totalPowerDisplay: card.querySelector('#dsph-total-power'),
    sphereCountDisplay: card.querySelector('#dsph-sphere-count'),
    maxSpheresDisplay: card.querySelector('#dsph-max-spheres'),
    maxPowerDisplay: card.querySelector('#dsph-max-power'),
    costDisplay: card.querySelector('#dsph-collector-cost'),
    costTooltipContent: collectorCostTooltipContent,
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
      project.autoContinuousOperation = !project.autoContinuousOperation;
      updateDysonSphereUI(project);
      return;
    }
    project.startCollector();
  });
  autoCheckbox.addEventListener('change', e => { project.autoContinuousOperation = e.target.checked; });
  travelResetCheckbox.addEventListener('change', e => {
    project.autoStartUncheckOnTravel = e.target.checked;
    updateDysonSphereUI(project);
  });
}

function updateCollectorCostDisplay(project, costDisplay) {
  const items = [];
  const attributes = project.attributes || {};
  const storageProj = attributes.canUseSpaceStorage ? projectManager.projects.spaceStorage : null;
  const collectorCost = typeof project.getCollectorCost === 'function'
    ? project.getCollectorCost()
    : project.collectorCost;

  for (const category in collectorCost) {
    const categoryCost = collectorCost[category];
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
  const total = project.getTotalCollectorPower();
  els.totalPowerDisplay.textContent = formatNumber(total, false, 2);
  if (els.sphereCountDisplay) {
    const count = typeof project.getDysonSphereCount === 'function' ? project.getDysonSphereCount() : 0;
    els.sphereCountDisplay.textContent = formatNumber(count, true, 2);
  }
  if (els.maxSpheresDisplay) {
    const maxSpheres = typeof project.getAllowedMaxSphereCount === 'function'
      ? project.getAllowedMaxSphereCount()
      : 1;
    els.maxSpheresDisplay.textContent = formatNumber(maxSpheres, false, 2);
  }
  if (els.maxPowerDisplay) {
    const maxPower = typeof project.getMaximumPowerValue === 'function'
      ? project.getMaximumPowerValue()
      : 0;
    els.maxPowerDisplay.textContent = formatNumber(maxPower, false, 2);
  }

  if (els.costDisplay) {
    updateCollectorCostDisplay(project, els.costDisplay);
  }
  if (els.expansionRateDisplay) {
    const atOrOverMax = project.getCollectorHeadroom() <= 0;
    const active = project.isCollectorContinuous()
      ? project.autoContinuousOperation && (project.isCompleted || collectors > 0)
      : project.collectorProgress > 0;
    const rate = (!atOrOverMax && active) ? (1000 / project.collectorDuration) : 0;
    els.expansionRateDisplay.textContent = getDysonSphereText('ui.projects.dysonSphere.collectorsPerSecond', '{value} collectors/s', {
      value: formatNumber(rate, true, 3)
    });
  }

  if (els.autoCheckbox) {
    const canAuto = project.isCompleted || project.collectors > 0;
    els.autoCheckbox.parentElement.style.display = canAuto ? '' : 'none';
    els.autoCheckbox.disabled = !canAuto;
    els.autoCheckbox.checked = project.autoContinuousOperation;
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
    els.totalPowerDisplay.parentElement.style.display = '';
  }

  if (!els.startButton) {
    return;
  }
  if (!project.isCompleted) {
    els.startButton.textContent = getDysonSphereText('ui.projects.dysonSphere.buildFrame', 'Build the frame to deploy collectors');
    els.startButton.style.background = '#f44336';
    els.startButton.disabled = true;
    return;
  }

  els.startButton.disabled = false;
  if (project.isCollectorContinuous()) {
    if (project.autoContinuousOperation && (project.isCompleted || project.collectors > 0)) {
      els.startButton.textContent = getDysonSphereText('ui.projects.dysonSphere.continuousOn', 'Continuous (On)');
      els.startButton.style.background = '#4caf50';
    } else {
      els.startButton.textContent = getDysonSphereText('ui.projects.dysonSphere.continuousOff', 'Continuous (Off)');
      els.startButton.style.background = '#f44336';
    }
  } else if (project.collectorProgress > 0) {
    const pct = ((project.collectorDuration - project.collectorProgress) / project.collectorDuration) * 100;
    const secs = Math.max(0, project.collectorProgress / 1000).toFixed(2);
    els.startButton.textContent = getDysonSphereText('ui.projects.dysonSphere.deploying', 'Deploying ({time}s)', { time: secs });
    els.startButton.style.background = `linear-gradient(to right, #4caf50 ${pct}%, #ccc ${pct}%)`;
  } else {
    const can = project.canStartCollector();
    const dur = Math.round(project.collectorDuration / 1000);
    els.startButton.textContent = getDysonSphereText('ui.projects.dysonSphere.deployCollector', 'Deploy Collector ({time}s)', { time: dur });
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
