function renderOrbitalRingUI(project, container) {
  const card = document.createElement('div');
  card.classList.add('orbital-ring-card');
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">${localizeProjectsText('projectsParameters.orbitalRing.name', null, 'Orbital Ring')}</span>
    </div>
    <div class="card-body">
      <div class="stats-grid four-col">
        <div class="stat-item"><span class="stat-label">${localizeProjectsText('projectsTab.projects.orbitalRing.ringsBuilt', null, 'Rings Built:')}</span><span id="or-rings-built"></span></div>
        <div class="stat-item"><span class="stat-label">${localizeProjectsText('projectsTab.projects.orbitalRing.maxRings', null, 'Max Rings:')}</span><span id="or-max-rings"></span></div>
        <div class="stat-item"><span class="stat-label">${localizeProjectsText('projectsTab.projects.orbitalRing.currentWorldRing', null, 'Current World Ring:')}</span><span id="or-current-world"></span></div>
        <div class="stat-item">
          <span class="stat-label">${localizeProjectsText('projectsTab.projects.orbitalRing.prepaidRings', null, 'Prepaid Rings:')}</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="or-prepaid-rings"></span>
            <button id="or-prepay-button" style="padding: 2px 10px; font-size: 0.85em; line-height: 1.2;">${localizeProjectsText('projectsTab.projects.orbitalRing.prepay', null, 'Prepay')}</button>
          </div>
        </div>
      </div>
    </div>`;
  container.appendChild(card);

  const prepayButton = card.querySelector('#or-prepay-button');
  prepayButton.addEventListener('click', () => {
    if (project.prepayRing()) {
      updateOrbitalRingUI(project);
    }
  });

  projectElements[project.name] = {
    ...projectElements[project.name],
    ringCard: card,
    ringsBuiltDisplay: card.querySelector('#or-rings-built'),
    maxRingsDisplay: card.querySelector('#or-max-rings'),
    currentWorldDisplay: card.querySelector('#or-current-world'),
    prepaidRingsDisplay: card.querySelector('#or-prepaid-rings'),
    prepayButton: prepayButton,
  };
}

function updateOrbitalRingUI(project) {
  const els = projectElements[project.name];
  if (!els) return;

  els.ringsBuiltDisplay.textContent = project.ringCount;
  const terraformedWorlds =
    typeof spaceManager !== 'undefined' && typeof spaceManager.getUnmodifiedTerraformedWorldCount === 'function'
      ? spaceManager.getUnmodifiedTerraformedWorldCount({ countArtificial: false })
      : 0;
  els.maxRingsDisplay.textContent = terraformedWorlds;
  if (spaceManager && spaceManager.currentArtificialKey !== null) {
    els.currentWorldDisplay.textContent = localizeProjectsText('projectsTab.projects.orbitalRing.notAllowedOnArtificial', null, 'Not allowed on artificial');
  } else {
    els.currentWorldDisplay.textContent = project.currentWorldHasRing
      ? localizeProjectsText('projectsTab.labels.yes', null, 'Yes')
      : localizeProjectsText('projectsTab.labels.no', null, 'No');
  }
  
  els.prepaidRingsDisplay.textContent = project.prepaidRings;
  
  const maxPrepay = project.getMaxPrepayableRings();
  const cost = project.getScaledCost();
  const storageProj = project.attributes.canUseSpaceStorage && projectManager?.projects?.spaceStorage;
  
  let canAfford = true;
  for (const category in cost) {
    for (const resource in cost[category]) {
      const required = cost[category][resource];
      if (storageProj) {
        const key = resource === 'water' ? 'liquidWater' : resource;
        const usable = storageProj.getAvailableStoredResource(key);
        const available = resources[category][resource].value + usable;
        if (available < required) {
          canAfford = false;
          break;
        }
      } else if (resources[category][resource].value < required) {
        canAfford = false;
        break;
      }
    }
    if (!canAfford) break;
  }
  
  els.prepayButton.disabled = maxPrepay <= 0 || !canAfford;
}

if (typeof globalThis !== 'undefined') {
  globalThis.renderOrbitalRingUI = renderOrbitalRingUI;
  globalThis.updateOrbitalRingUI = updateOrbitalRingUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderOrbitalRingUI, updateOrbitalRingUI };
}
