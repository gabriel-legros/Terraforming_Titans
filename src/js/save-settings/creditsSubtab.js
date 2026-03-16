const settingsCreditsEntries = [
  { label: 'Game by', name: 'Thratur' },
  { label: 'World Visualizer Concept', name: 'Jebarus' },
  { label: 'Art', name: 'Oleksandra Lukashenko (eklaell)' },
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
    line.appendChild(document.createTextNode(entry.label));
    line.appendChild(document.createElement('br'));
    line.appendChild(document.createTextNode(entry.name));
    creditsList.appendChild(line);
  });
}
