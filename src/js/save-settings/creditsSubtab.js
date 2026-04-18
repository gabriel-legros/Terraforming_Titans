const settingsCreditsEntries = [
  {
    labelKey: 'ui.settings.creditsGameByLabel',
    labelFallback: 'Game by',
    nameKey: 'ui.settings.creditsGameByName',
    nameFallback: 'Thratur',
  },
  {
    labelKey: 'ui.settings.creditsWorldVisualizerConceptLabel',
    labelFallback: 'World Visualizer Concept',
    nameKey: 'ui.settings.creditsWorldVisualizerConceptName',
    nameFallback: 'Jebarus',
  },
  {
    labelKey: 'ui.settings.creditsArtLabel',
    labelFallback: 'Art',
    nameKey: 'ui.settings.creditsArtName',
    nameFallback: 'Oleksandra Lukashenko (eklaell)',
  },
];

function initializeCreditsSubtab() {
  const creditsList = document.getElementById('settings-credits-list');
  if (!creditsList) {
    return;
  }

  creditsList.innerHTML = '';
  settingsCreditsEntries.forEach(entry => {
    const line = document.createElement('p');
    line.className = 'settings-stat-line';
    line.appendChild(document.createTextNode(t(entry.labelKey, null, entry.labelFallback)));
    line.appendChild(document.createElement('br'));
    line.appendChild(document.createTextNode(t(entry.nameKey, null, entry.nameFallback)));
    creditsList.appendChild(line);
  });
}
