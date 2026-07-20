const WORKSHOP_ITEM_STATE = Object.freeze({
  subscribed: 1,
  installed: 4,
  needsUpdate: 8,
  downloading: 16,
  downloadPending: 32
});

function wait(delayMs) {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

function getItemStatus(workshop, itemId) {
  const state = workshop.state(itemId);
  const installed = (state & WORKSHOP_ITEM_STATE.installed) !== 0;
  const updating = (state & (
    WORKSHOP_ITEM_STATE.needsUpdate
    | WORKSHOP_ITEM_STATE.downloading
    | WORKSHOP_ITEM_STATE.downloadPending
  )) !== 0;
  return { state, ready: installed && !updating };
}

function getDownloadProgress(workshop, itemId) {
  const info = workshop.downloadInfo(itemId);
  if (!info) {
    return null;
  }
  return {
    current: info.current.toString(),
    total: info.total.toString()
  };
}

function createPublicItem(itemId) {
  return {
    workshopId: itemId.toString(),
    state: 0,
    status: 'checking',
    download: null,
    message: ''
  };
}

async function resolveSubscribedWorkshopMods(steamIntegration, options = {}) {
  const timeoutMs = options.timeoutMs === undefined ? 30000 : options.timeoutMs;
  const pollIntervalMs = options.pollIntervalMs === undefined ? 250 : options.pollIntervalMs;
  const status = {
    enabled: steamIntegration.enabled,
    initialized: steamIntegration.initialized,
    error: steamIntegration.error,
    items: []
  };
  const installedMods = [];

  if (!steamIntegration.initialized) {
    return { installedMods, status };
  }

  const workshop = steamIntegration.client.workshop;
  let subscribedItems;
  try {
    subscribedItems = workshop.getSubscribedItems();
  } catch (error) {
    status.error = error && error.message ? error.message : String(error);
    return { installedMods, status };
  }

  const records = subscribedItems
    .map(itemId => ({ itemId, publicItem: createPublicItem(itemId), complete: false }))
    .sort((a, b) => a.publicItem.workshopId.localeCompare(b.publicItem.workshopId, 'en', { numeric: true }));
  status.items = records.map(record => record.publicItem);
  if (options.onUpdate) {
    options.onUpdate(status);
  }

  function finishInstalled(record) {
    const installInfo = workshop.installInfo(record.itemId);
    if (!installInfo || !installInfo.folder) {
      record.publicItem.status = 'failed';
      record.publicItem.message = 'Steam reported the item as installed but did not provide its install folder.';
      record.complete = true;
      return;
    }
    record.publicItem.status = 'installed';
    record.publicItem.download = null;
    record.complete = true;
    installedMods.push({
      workshopId: record.publicItem.workshopId,
      folder: installInfo.folder,
      sizeOnDisk: installInfo.sizeOnDisk.toString(),
      timestamp: installInfo.timestamp
    });
  }

  records.forEach(record => {
    try {
      const itemStatus = getItemStatus(workshop, record.itemId);
      record.publicItem.state = itemStatus.state;
      if (itemStatus.ready) {
        finishInstalled(record);
        return;
      }

      record.publicItem.status = 'downloading';
      record.publicItem.download = getDownloadProgress(workshop, record.itemId);
      if (!workshop.download(record.itemId, true)) {
        record.publicItem.message = 'Steam did not accept the download request; waiting for its item state to change.';
      }
    } catch (error) {
      record.publicItem.status = 'failed';
      record.publicItem.message = error && error.message ? error.message : String(error);
      record.complete = true;
    }
  });
  if (options.onUpdate) {
    options.onUpdate(status);
  }

  const deadline = Date.now() + timeoutMs;
  while (records.some(record => !record.complete) && Date.now() < deadline) {
    await wait(Math.min(pollIntervalMs, Math.max(1, deadline - Date.now())));
    records.filter(record => !record.complete).forEach(record => {
      try {
        const itemStatus = getItemStatus(workshop, record.itemId);
        record.publicItem.state = itemStatus.state;
        if (itemStatus.ready) {
          finishInstalled(record);
          return;
        }
        record.publicItem.download = getDownloadProgress(workshop, record.itemId);
      } catch (error) {
        record.publicItem.status = 'failed';
        record.publicItem.message = error && error.message ? error.message : String(error);
        record.complete = true;
      }
    });
    if (options.onUpdate) {
      options.onUpdate(status);
    }
  }

  records.filter(record => !record.complete).forEach(record => {
    if (record.publicItem.state === 0) {
      record.publicItem.status = 'untracked';
      record.publicItem.message = 'Steam returned item state 0. Confirm that ISteamUGC file transfer is enabled and published for this app in Steamworks.';
    } else {
      record.publicItem.status = 'timed-out';
      record.publicItem.message = 'The Workshop download did not finish before game startup continued.';
    }
    record.complete = true;
  });
  if (options.onUpdate) {
    options.onUpdate(status);
  }

  return { installedMods, status };
}

module.exports = { WORKSHOP_ITEM_STATE, resolveSubscribedWorkshopMods };
