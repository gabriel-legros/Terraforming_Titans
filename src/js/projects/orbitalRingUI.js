function renderOrbitalRingUI(project, container) {
  const card = document.createElement('div');
  card.classList.add('orbital-ring-card');
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">Orbital Ring</span>
    </div>
    <div class="card-body">
      <div class="stats-grid four-col">
        <div class="stat-item"><span class="stat-label">Rings Built:</span><span id="or-rings-built"></span></div>
        <div class="stat-item"><span class="stat-label">Max Rings:</span><span id="or-max-rings"></span></div>
        <div class="stat-item"><span class="stat-label">Current World Ring:</span><span id="or-current-world"></span></div>
        <div class="stat-item">
          <span class="stat-label">Prepaid Rings:</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="or-prepaid-rings"></span>
            <button id="or-prepay-button" style="padding: 2px 10px; font-size: 0.85em; line-height: 1.2;">Prepay</button>
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
    els.currentWorldDisplay.textContent = 'Not allowed on artificial';
  } else {
    els.currentWorldDisplay.textContent = project.currentWorldHasRing ? 'Yes' : 'No';
  }
  
  els.prepaidRingsDisplay.textContent = project.prepaidRings;
  
  const maxPrepay = project.getMaxPrepayableRings();
  const cost = project.getScaledCost();
  const storageProj = project.attributes.canUseSpaceStorage && projectManager?.projects?.spaceStorage;
  
  let canAfford = true;
  for (const category in cost) {
    for (const resource in cost[category]) {
      const required = cost[category][resource];
      const key = resource === 'water' ? 'liquidWater' : resource;
      const colonyAvailable = resources[category][resource].value;
      const available = getMegaProjectResourceAvailability(storageProj, key, colonyAvailable);
      if (available < required) {
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
