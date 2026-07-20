const fs = require('fs');
const path = require('path');

const CREATOR_SCHEMA_VERSION = 1;
const MAX_PREVIEW_BYTES = 1000000;
const WORKSHOP_VISIBILITIES = new Set([0, 1, 2, 3]);
const UPDATE_STATUS_LABELS = [
  'Starting upload',
  'Preparing configuration',
  'Preparing content',
  'Uploading content',
  'Uploading preview image',
  'Publishing changes'
];

function getErrorMessage(error) {
  return error && error.message ? error.message : String(error);
}

function getCreatorDataPath(userDataPath) {
  return path.join(userDataPath, 'mods', 'creator-items.json');
}

function readCreatorData(userDataPath) {
  const dataPath = getCreatorDataPath(userDataPath);
  if (!fs.existsSync(dataPath)) {
    return { schemaVersion: CREATOR_SCHEMA_VERSION, links: [] };
  }
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (data.schemaVersion !== CREATOR_SCHEMA_VERSION || !Array.isArray(data.links)) {
    throw new Error('Unsupported Workshop creator data format.');
  }
  return {
    schemaVersion: CREATOR_SCHEMA_VERSION,
    links: data.links
      .map(link => ({ modId: String(link.modId || ''), workshopId: String(link.workshopId || '') }))
      .filter(link => /^[a-z0-9][a-z0-9._-]{2,79}$/.test(link.modId) && /^[1-9]\d*$/.test(link.workshopId))
  };
}

function writeCreatorData(userDataPath, data) {
  const dataPath = getCreatorDataPath(userDataPath);
  const temporaryPath = `${dataPath}.tmp`;
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(temporaryPath, dataPath);
}

function serializeWorkshopItem(item) {
  return {
    workshopId: item.publishedFileId.toString(),
    title: item.title || '',
    description: item.description || '',
    visibility: Number(item.visibility),
    tags: Array.isArray(item.tags) ? item.tags.map(tag => String(tag)) : [],
    timeCreated: Number(item.timeCreated) * 1000,
    timeUpdated: Number(item.timeUpdated) * 1000,
    previewUrl: item.previewUrl || '',
    banned: item.banned === true
  };
}

function validateText(value, label, maximumLength, required) {
  const text = String(value || '').trim();
  if (required && !text) {
    throw new Error(`${label} is required.`);
  }
  if (text.length > maximumLength) {
    throw new Error(`${label} must be ${maximumLength.toLocaleString()} characters or fewer.`);
  }
  return text;
}

function validateTags(values) {
  const tags = [...new Set((Array.isArray(values) ? values : [])
    .map(value => String(value).trim())
    .filter(Boolean))];
  if (tags.length > 20) {
    throw new Error('Use no more than 20 Workshop tags.');
  }
  if (tags.some(tag => tag.length > 255)) {
    throw new Error('Workshop tags must be 255 characters or fewer.');
  }
  return tags;
}

function formatMegabytes(bytes) {
  return `${(bytes / 1000000).toFixed(2)} MB`;
}

function getWorkshopUploadError(error) {
  const message = getErrorMessage(error);
  if (/limit exceeded/i.test(message)) {
    return new Error("Steam rejected the upload because a limit was exceeded. Preview images must be smaller than 1 MB; if the preview is already below that limit, increase the app's per-user Steam Cloud quota in Steamworks or free some Steam Cloud space.");
  }
  return error;
}

function createWorkshopPublisher(options) {
  const appId = options.appId;
  const userDataPath = options.userDataPath;
  const steamIntegration = options.steamIntegration;
  const getLocalEntries = options.getLocalEntries;
  const onStateChanged = options.onStateChanged;
  const onProgress = options.onProgress;
  let publishedItems = [];
  let queryError = '';
  let creatorDataError = '';
  let refreshing = false;
  let busy = false;
  let refreshPromise = null;
  const previewPaths = new Map();
  let creatorData;

  try {
    creatorData = readCreatorData(userDataPath);
  } catch (error) {
    creatorData = { schemaVersion: CREATOR_SCHEMA_VERSION, links: [] };
    creatorDataError = getErrorMessage(error);
  }

  function emitState() {
    if (onStateChanged) {
      onStateChanged(getState());
    }
  }

  function setLink(modId, workshopId) {
    creatorData.links = creatorData.links.filter(link => link.modId !== modId);
    creatorData.links.push({ modId, workshopId });
    creatorData.links.sort((a, b) => a.modId.localeCompare(b.modId));
    writeCreatorData(userDataPath, creatorData);
    creatorDataError = '';
  }

  function getLocalMod(instanceId) {
    const mod = getLocalEntries().find(entry => entry.source === 'local' && entry.instanceId === instanceId);
    if (!mod) {
      throw new Error('The selected local mod is no longer available. Refresh Creator Tools.');
    }
    if (!mod.valid) {
      throw new Error(`The selected mod is invalid: ${mod.validationError}`);
    }
    return mod;
  }

  function getState() {
    const links = new Map(creatorData.links.map(link => [link.modId, link.workshopId]));
    return {
      appId,
      steamEnabled: steamIntegration.enabled,
      steamInitialized: steamIntegration.initialized,
      busy,
      refreshing,
      error: steamIntegration.error || creatorDataError || queryError,
      localMods: getLocalEntries()
        .filter(entry => entry.source === 'local')
        .map(entry => ({
          instanceId: entry.instanceId,
          id: entry.id,
          name: entry.name,
          version: entry.version,
          folderName: entry.folderName,
          contentHash: entry.contentHash,
          valid: entry.valid,
          validationError: entry.validationError,
          linkedWorkshopId: links.get(entry.id) || '',
          previewName: previewPaths.has(entry.instanceId) ? path.basename(previewPaths.get(entry.instanceId)) : ''
        })),
      publishedItems: publishedItems.slice()
    };
  }

  async function queryPublishedItems() {
    if (!steamIntegration.initialized) {
      publishedItems = [];
      return;
    }
    const workshop = steamIntegration.client.workshop;
    const accountId = steamIntegration.client.localplayer.getSteamId().accountId;
    const items = [];
    const knownIds = new Set();
    let page = 1;
    let totalResults = 1;
    while (items.length < totalResults && page <= 100) {
      const result = await workshop.getUserItems(
        page,
        accountId,
        0,
        0,
        3,
        { creator: appId, consumer: appId },
        { includeLongDescription: true }
      );
      totalResults = Number(result.totalResults);
      const pageItems = result.items.filter(Boolean);
      pageItems.forEach(item => {
        const publicItem = serializeWorkshopItem(item);
        if (!knownIds.has(publicItem.workshopId)) {
          knownIds.add(publicItem.workshopId);
          items.push(publicItem);
        }
      });
      if (!pageItems.length || items.length >= totalResults) {
        break;
      }
      page += 1;
    }
    publishedItems = items.sort((a, b) => b.timeUpdated - a.timeUpdated || b.workshopId.localeCompare(a.workshopId, 'en', { numeric: true }));
  }

  function refreshPublishedItems() {
    if (refreshPromise) {
      return refreshPromise;
    }
    refreshing = true;
    queryError = '';
    emitState();
    refreshPromise = queryPublishedItems()
      .catch(error => {
        queryError = getErrorMessage(error);
      })
      .finally(() => {
        refreshing = false;
        refreshPromise = null;
        emitState();
      });
    return refreshPromise;
  }

  function setPreview(instanceId, filePath) {
    const mod = getLocalMod(instanceId);
    const extension = path.extname(filePath).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.gif'].includes(extension)) {
      throw new Error('Preview images must be PNG, JPEG, or GIF files.');
    }
    const realPath = fs.realpathSync(filePath);
    const fileStats = fs.statSync(realPath);
    if (!fileStats.isFile()) {
      throw new Error('The selected preview is not a file.');
    }
    if (fileStats.size >= MAX_PREVIEW_BYTES) {
      throw new Error(`Steam Workshop preview images must be smaller than 1 MB. The selected image is ${formatMegabytes(fileStats.size)}.`);
    }
    previewPaths.set(mod.instanceId, realPath);
    emitState();
  }

  function clearPreview(instanceId) {
    previewPaths.delete(instanceId);
    emitState();
  }

  async function verifyItemOwnership(workshopId) {
    const item = await steamIntegration.client.workshop.getItem(BigInt(workshopId), { includeLongDescription: true });
    if (!item) {
      throw new Error(`Workshop item ${workshopId} was not found.`);
    }
    const accountId = steamIntegration.client.localplayer.getSteamId().accountId;
    if (item.owner.accountId !== accountId) {
      throw new Error(`Workshop item ${workshopId} is not owned by the signed-in Steam user.`);
    }
    if ((item.creatorAppId && item.creatorAppId !== appId) || (item.consumerAppId && item.consumerAppId !== appId)) {
      throw new Error(`Workshop item ${workshopId} belongs to another app.`);
    }
  }

  function submitUpdate(workshopId, details, instanceId) {
    return new Promise((resolve, reject) => {
      steamIntegration.client.workshop.updateItemWithCallback(
        BigInt(workshopId),
        details,
        appId,
        resolve,
        reject,
        progress => {
          if (onProgress) {
            onProgress({
              instanceId,
              workshopId,
              status: Number(progress.status),
              label: UPDATE_STATUS_LABELS[Number(progress.status)] || 'Uploading',
              processed: progress.progress.toString(),
              total: progress.total.toString()
            });
          }
        },
        200
      );
    });
  }

  async function publish(request) {
    if (!steamIntegration.initialized) {
      throw new Error(steamIntegration.error || 'Steamworks is not available. Launch the Steam build through Steam.');
    }
    if (busy) {
      throw new Error('A Workshop upload is already in progress.');
    }
    const mod = getLocalMod(String(request.instanceId));
    const title = validateText(request.title, 'Title', 128, true);
    const description = validateText(request.description, 'Description', 8000, true);
    const changeNote = validateText(request.changeNote, 'Change note', 8000, false);
    const tags = validateTags(request.tags);
    const visibility = Number(request.visibility);
    if (!WORKSHOP_VISIBILITIES.has(visibility)) {
      throw new Error('Choose a valid Workshop visibility.');
    }
    const requestedWorkshopId = String(request.workshopId || '');
    if (requestedWorkshopId && !/^[1-9]\d*$/.test(requestedWorkshopId)) {
      throw new Error('Choose a valid Workshop item.');
    }
    const previewPath = previewPaths.get(mod.instanceId);
    if (!requestedWorkshopId && !previewPath) {
      throw new Error('Choose a preview image before creating a Workshop item.');
    }

    busy = true;
    queryError = '';
    emitState();
    let workshopId = requestedWorkshopId;
    let created = false;
    let needsToAcceptAgreement = false;
    try {
      if (workshopId) {
        await verifyItemOwnership(workshopId);
      } else {
        const creation = await steamIntegration.client.workshop.createItem(appId);
        workshopId = creation.itemId.toString();
        needsToAcceptAgreement = creation.needsToAcceptAgreement === true;
        created = true;
        setLink(mod.id, workshopId);
      }

      const details = {
        title,
        description,
        changeNote,
        contentPath: mod.modRoot,
        tags,
        visibility
      };
      if (previewPath) {
        details.previewPath = previewPath;
      }
      const result = await submitUpdate(workshopId, details, mod.instanceId);
      needsToAcceptAgreement = needsToAcceptAgreement || result.needsToAcceptAgreement === true;
      setLink(mod.id, workshopId);
      previewPaths.delete(mod.instanceId);
      try {
        await queryPublishedItems();
      } catch (error) {
        queryError = getErrorMessage(error);
      }
      return { success: true, workshopId, created, needsToAcceptAgreement };
    } catch (error) {
      if (created) {
        try {
          await queryPublishedItems();
        } catch (queryFailure) {
          queryError = getErrorMessage(queryFailure);
        }
      }
      throw getWorkshopUploadError(error);
    } finally {
      busy = false;
      emitState();
    }
  }

  return {
    getState,
    refreshPublishedItems,
    setPreview,
    clearPreview,
    publish,
    getModFolder(instanceId) {
      return getLocalMod(instanceId).modRoot;
    },
    isBusy() {
      return busy;
    }
  };
}

module.exports = { createWorkshopPublisher };
