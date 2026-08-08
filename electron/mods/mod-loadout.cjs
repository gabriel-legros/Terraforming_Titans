const fs = require('fs');
const path = require('path');

const LOADOUT_SCHEMA_VERSION = 1;

function getLoadoutPath(userDataPath) {
  return path.join(userDataPath, 'mods', 'loadout.json');
}

function readModLoadout(userDataPath) {
  const loadoutPath = getLoadoutPath(userDataPath);
  if (!fs.existsSync(loadoutPath)) {
    return { schemaVersion: LOADOUT_SCHEMA_VERSION, order: [], disabled: [], runScriptsOnStart: true };
  }
  try {
    const data = JSON.parse(fs.readFileSync(loadoutPath, 'utf8'));
    if (data.schemaVersion !== LOADOUT_SCHEMA_VERSION || !Array.isArray(data.order) || !Array.isArray(data.disabled)) {
      throw new Error('Unsupported mod loadout format.');
    }
    return {
      schemaVersion: LOADOUT_SCHEMA_VERSION,
      order: [...new Set(data.order.map(value => String(value)))],
      disabled: [...new Set(data.disabled.map(value => String(value)))],
      runScriptsOnStart: data.runScriptsOnStart !== false
    };
  } catch (error) {
    return {
      schemaVersion: LOADOUT_SCHEMA_VERSION,
      order: [],
      disabled: [],
      runScriptsOnStart: true,
      error: error.message
    };
  }
}

function persistModLoadout(userDataPath, data) {
  const loadoutPath = getLoadoutPath(userDataPath);
  fs.mkdirSync(path.dirname(loadoutPath), { recursive: true });
  const temporaryPath = `${loadoutPath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(temporaryPath, loadoutPath);
  return data;
}

function reconcileModLoadout(entries, loadout) {
  const byId = new Map(entries.map(entry => [entry.instanceId, entry]));
  const ordered = [];
  const included = new Set();
  loadout.order.forEach(instanceId => {
    const entry = byId.get(instanceId);
    if (entry) {
      ordered.push(entry);
      included.add(instanceId);
    }
  });
  entries.forEach(entry => {
    if (!included.has(entry.instanceId)) {
      ordered.push(entry);
    }
  });
  const disabled = new Set(loadout.disabled);
  return {
    ordered,
    disabled,
    publicItems: ordered.map(entry => ({
      instanceId: entry.instanceId,
      enabled: entry.valid && !disabled.has(entry.instanceId)
    }))
  };
}

function writeModLoadout(userDataPath, previousLoadout, availableIds, order, disabledIds, runScriptsOnStart) {
  const available = new Set(availableIds);
  if (order.length !== available.size || new Set(order).size !== order.length || order.some(id => !available.has(id))) {
    throw new Error('The submitted mod order does not match the available mod catalog.');
  }

  let cursor = 0;
  const mergedOrder = previousLoadout.order.map(instanceId => (
    available.has(instanceId) ? order[cursor++] : instanceId
  ));
  while (cursor < order.length) {
    mergedOrder.push(order[cursor++]);
  }

  const disabled = new Set(previousLoadout.disabled.filter(instanceId => !available.has(instanceId)));
  disabledIds.forEach(instanceId => {
    if (!available.has(instanceId)) {
      throw new Error(`Unknown disabled mod ${instanceId}.`);
    }
    disabled.add(instanceId);
  });

  const data = {
    schemaVersion: LOADOUT_SCHEMA_VERSION,
    order: [...new Set(mergedOrder)],
    disabled: [...disabled],
    runScriptsOnStart: runScriptsOnStart === undefined
      ? previousLoadout.runScriptsOnStart !== false
      : runScriptsOnStart === true
  };
  return persistModLoadout(userDataPath, data);
}

function writeRunScriptsOnStart(userDataPath, previousLoadout, enabled) {
  return persistModLoadout(userDataPath, {
    schemaVersion: LOADOUT_SCHEMA_VERSION,
    order: previousLoadout.order,
    disabled: previousLoadout.disabled,
    runScriptsOnStart: enabled === true
  });
}

module.exports = { readModLoadout, reconcileModLoadout, writeModLoadout, writeRunScriptsOnStart };
