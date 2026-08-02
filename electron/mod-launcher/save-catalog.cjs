const fs = require('fs');
const path = require('path');

const SAVE_SLOTS = ['autosave', 'exitsave', 'pretravel', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5'];
const DEFAULT_SLOT_NAMES = {
  autosave: 'Autosave',
  exitsave: 'Exit Save',
  pretravel: 'Pre-travel',
  slot1: 'Slot 1',
  slot2: 'Slot 2',
  slot3: 'Slot 3',
  slot4: 'Slot 4',
  slot5: 'Slot 5'
};

function readMetadataFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return value && value.constructor === Object ? value : {};
  } catch (_error) {
    return {};
  }
}

function createSaveCatalog(userDataPath) {
  const savesPath = path.join(userDataPath, 'saves');
  const dates = readMetadataFile(path.join(savesPath, 'slot-dates.json'));
  const names = readMetadataFile(path.join(savesPath, 'slot-names.json'));
  const saves = [];

  SAVE_SLOTS.forEach(slot => {
    const filePath = path.join(savesPath, `${slot}.json`);
    if (!fs.existsSync(filePath)) {
      return;
    }
    const stats = fs.statSync(filePath);
    try {
      const gameState = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const savedAt = Number(gameState.savedAt) || Number(dates[slot]) || stats.mtimeMs;
      const savedSpace = gameState.spaceManager || gameState.spaceState || {};
      saves.push({
        selectionId: `slot:${slot}`,
        slot,
        label: String(names[slot] || DEFAULT_SLOT_NAMES[slot]),
        timestamp: savedAt,
        world: String(
          savedSpace.currentRandomName
          || savedSpace.currentArtificialKey
          || savedSpace.currentPlanetKey
          || gameState.defaultPlanet
          || 'Mars'
        ),
        gameCompleted: gameState.gameCompleted === true,
        playTimeSeconds: Number(
          gameState.totalRealPlayTimeSeconds
          || gameState.totalPlayTimeSeconds
          || gameState.playTimeSeconds
          || 0
        ),
        size: stats.size,
        valid: true,
        error: ''
      });
    } catch (error) {
      saves.push({
        selectionId: `slot:${slot}`,
        slot,
        label: String(names[slot] || DEFAULT_SLOT_NAMES[slot]),
        timestamp: Number(dates[slot]) || stats.mtimeMs,
        world: '',
        gameCompleted: false,
        playTimeSeconds: 0,
        size: stats.size,
        valid: false,
        error: `Invalid save JSON: ${error.message}`
      });
    }
  });

  saves.sort((a, b) => b.timestamp - a.timestamp || SAVE_SLOTS.indexOf(a.slot) - SAVE_SLOTS.indexOf(b.slot));
  const latest = saves.find(save => save.valid);
  return {
    saves,
    defaultSelection: latest ? latest.selectionId : 'new'
  };
}

function createTemporarySave(saveData, label) {
  const gameState = JSON.parse(saveData);
  if (!gameState || gameState.constructor !== Object) {
    throw new Error('Save data must be a JSON object.');
  }
  const savedSpace = gameState.spaceManager || gameState.spaceState || {};
  return {
    selectionId: 'temporary',
    slot: '',
    label,
    timestamp: Number(gameState.savedAt) || Date.now(),
    world: String(
      savedSpace.currentRandomName
      || savedSpace.currentArtificialKey
      || savedSpace.currentPlanetKey
      || gameState.defaultPlanet
      || 'Mars'
    ),
    gameCompleted: gameState.gameCompleted === true,
    playTimeSeconds: Number(
      gameState.totalRealPlayTimeSeconds
      || gameState.totalPlayTimeSeconds
      || gameState.playTimeSeconds
      || 0
    ),
    size: Buffer.byteLength(saveData, 'utf8'),
    valid: true,
    temporary: true,
    error: ''
  };
}

module.exports = { createSaveCatalog, createTemporarySave };
