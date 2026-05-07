(function () {
  if (!DEBUG_MODE) {
    return;
  }

  function getDebugRuntimeText(path, vars, fallback) {
    return t(path, vars, fallback);
  }

  const monitorState = {
    enabled: false,
    intervalMs: 5000,
    timerId: null,
    samples: [],
    maxSamples: 720,
    panel: null,
    panelFields: null,
    uaMemoryPending: false,
    uaMemoryLastBytes: null,
    uaMemoryLastJSBytes: null,
    uaMemoryLastError: '',
    listenerTrackingInstalled: false,
    listenerSeq: 1,
    listenerIds: new WeakMap(),
    listenersByTarget: new WeakMap(),
    listenerActiveCount: 0,
    listenerAddCalls: 0,
    listenerRemoveCalls: 0,
    addsByType: {},
    removeCallsByType: {},
    activeByType: {},
    addsByTarget: {},
    removeCallsByTarget: {},
    activeByTarget: {},
    addsByTypeTarget: {},
    removeCallsByTypeTarget: {},
    activeByTypeTarget: {},
    domTrackingEnabled: false,
    domObserver: null,
    domAddsByContainer: {},
    domAddsByNode: {},
    domAddsByContainerNode: {},
    domRemovedByContainer: {},
    domNetByContainer: {},
    stackTrackingEnabled: false,
    stackSampleRate: 0.05,
    maxTrackedStacks: 200,
    addsByStack: {},
    removesByStack: {}
  };

  function formatBytes(bytes) {
    if (!(bytes >= 0)) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
  }

  function formatTimestamp(ms) {
    if (!(ms >= 0)) return '-';
    const date = new Date(ms);
    return `${date.toLocaleTimeString()} (${date.toLocaleDateString()})`;
  }

  function getDomNodeCount() {
    const nodes = document.getElementsByTagName('*');
    return nodes ? nodes.length : 0;
  }

  function getHeapMemory() {
    const perf = window.performance;
    const memory = perf && perf.memory ? perf.memory : null;
    if (!memory) {
      return { usedJSHeapSize: null, totalJSHeapSize: null, jsHeapSizeLimit: null };
    }
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    };
  }

  function getListenerId(listener) {
    if (!listener) return 0;
    const isObject = typeof listener === 'object';
    const isFunction = typeof listener === 'function';
    if (!isObject && !isFunction) return 0;
    let existing = monitorState.listenerIds.get(listener);
    if (!existing) {
      existing = monitorState.listenerSeq;
      monitorState.listenerSeq += 1;
      monitorState.listenerIds.set(listener, existing);
    }
    return existing;
  }

  function isCaptureOption(options) {
    if (options === true) return true;
    if (!options || options === false) return false;
    return options.capture === true;
  }

  function installListenerTracking() {
    if (monitorState.listenerTrackingInstalled) return;
    monitorState.listenerTrackingInstalled = true;

    const originalAdd = EventTarget.prototype.addEventListener;
    const originalRemove = EventTarget.prototype.removeEventListener;

    EventTarget.prototype.addEventListener = function (type, listener, options) {
      originalAdd.call(this, type, listener, options);
      monitorState.listenerAddCalls += 1;
      const targetBucket = getTargetBucket(this);
      const typeTargetBucket = `${type} @ ${targetBucket}`;
      incrementCounter(monitorState.addsByType, type, 1);
      incrementCounter(monitorState.addsByTarget, targetBucket, 1);
      incrementCounter(monitorState.addsByTypeTarget, typeTargetBucket, 1);
      maybeTrackAddStack();

      const listenerId = getListenerId(listener);
      if (!listenerId) return;

      let targetMap = monitorState.listenersByTarget.get(this);
      if (!targetMap) {
        targetMap = new Map();
        monitorState.listenersByTarget.set(this, targetMap);
      }

      const key = `${type}|${isCaptureOption(options) ? 1 : 0}|${listenerId}`;
      if (!targetMap.has(key)) {
        targetMap.set(key, true);
        monitorState.listenerActiveCount += 1;
        incrementCounter(monitorState.activeByType, type, 1);
        incrementCounter(monitorState.activeByTarget, targetBucket, 1);
        incrementCounter(monitorState.activeByTypeTarget, typeTargetBucket, 1);
      }
    };

    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      originalRemove.call(this, type, listener, options);
      monitorState.listenerRemoveCalls += 1;
      const targetBucket = getTargetBucket(this);
      const typeTargetBucket = `${type} @ ${targetBucket}`;
      incrementCounter(monitorState.removeCallsByType, type, 1);
      incrementCounter(monitorState.removeCallsByTarget, targetBucket, 1);
      incrementCounter(monitorState.removeCallsByTypeTarget, typeTargetBucket, 1);
      maybeTrackRemoveStack();

      const listenerId = getListenerId(listener);
      if (!listenerId) return;

      const targetMap = monitorState.listenersByTarget.get(this);
      if (!targetMap) return;

      const key = `${type}|${isCaptureOption(options) ? 1 : 0}|${listenerId}`;
      if (targetMap.has(key)) {
        targetMap.delete(key);
        monitorState.listenerActiveCount = Math.max(0, monitorState.listenerActiveCount - 1);
        incrementCounter(monitorState.activeByType, type, -1);
        incrementCounter(monitorState.activeByTarget, targetBucket, -1);
        incrementCounter(monitorState.activeByTypeTarget, typeTargetBucket, -1);
      }
    };
  }

  function incrementCounter(map, key, delta) {
    const next = (map[key] || 0) + delta;
    if (next <= 0) {
      delete map[key];
    } else {
      map[key] = next;
    }
  }

  function getTargetBucket(target) {
    if (target === window) return 'window';
    if (target === document) return 'document';
    if (target && target.nodeType === 1) {
      if (target.id) return `#${target.id}`;
      if (target.classList && target.classList.length > 0) {
        return `.${target.classList[0]}`;
      }
      if (target.tagName) return target.tagName.toLowerCase();
    }
    if (target && target.nodeType === 9) return 'document';
    return Object.prototype.toString.call(target);
  }

  function maybeTrackAddStack() {
    if (!monitorState.stackTrackingEnabled) return;
    if (Math.random() > monitorState.stackSampleRate) return;
    const stackText = (new Error().stack || '').split('\n').slice(2, 8).join('\n');
    if (!stackText) return;
    const trackedCount = Object.keys(monitorState.addsByStack).length;
    if (!monitorState.addsByStack[stackText] && trackedCount >= monitorState.maxTrackedStacks) return;
    incrementCounter(monitorState.addsByStack, stackText, 1);
  }

  function maybeTrackRemoveStack() {
    if (!monitorState.stackTrackingEnabled) return;
    if (Math.random() > monitorState.stackSampleRate) return;
    const stackText = (new Error().stack || '').split('\n').slice(2, 8).join('\n');
    if (!stackText) return;
    const trackedCount = Object.keys(monitorState.removesByStack).length;
    if (!monitorState.removesByStack[stackText] && trackedCount >= monitorState.maxTrackedStacks) return;
    incrementCounter(monitorState.removesByStack, stackText, 1);
  }

  function getTopEntries(counterMap, limit) {
    const topLimit = Math.max(1, Math.floor(limit || 10));
    return Object.entries(counterMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topLimit)
      .map(([key, value]) => ({ key, value }));
  }

  function getDomContainerBucket(node) {
    if (!node || !node.parentElement) return '[no-parent]';
    const parent = node.parentElement;
    if (parent.id) return `#${parent.id}`;
    if (parent.classList && parent.classList.length > 0) return `.${parent.classList[0]}`;
    if (parent.tagName) return parent.tagName.toLowerCase();
    return '[unknown-parent]';
  }

  function getDomNodeBucket(node) {
    if (!node) return '[unknown-node]';
    if (node.nodeType === 3) return '#text';
    if (node.nodeType !== 1) return `nodeType:${node.nodeType}`;
    const tag = node.tagName ? node.tagName.toLowerCase() : 'element';
    if (node.id) return `${tag}#${node.id}`;
    if (node.classList && node.classList.length > 0) return `${tag}.${node.classList[0]}`;
    return tag;
  }

  function applyDomDelta(containerBucket, nodeBucket, delta) {
    const containerNodeBucket = `${containerBucket} <- ${nodeBucket}`;
    if (delta > 0) {
      incrementCounter(monitorState.domAddsByContainer, containerBucket, delta);
      incrementCounter(monitorState.domAddsByNode, nodeBucket, delta);
      incrementCounter(monitorState.domAddsByContainerNode, containerNodeBucket, delta);
    } else if (delta < 0) {
      incrementCounter(monitorState.domRemovedByContainer, containerBucket, -delta);
    }
    incrementCounter(monitorState.domNetByContainer, containerBucket, delta);
  }

  function forEachAddedNode(node, callback) {
    if (!node) return;
    callback(node);
    if (node.querySelectorAll) {
      const descendants = node.querySelectorAll('*');
      for (let index = 0; index < descendants.length; index += 1) {
        callback(descendants[index]);
      }
    }
  }

  function startDomTracking() {
    if (monitorState.domObserver) return;
    monitorState.domTrackingEnabled = true;
    const observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i += 1) {
        const record = mutations[i];
        if (!record) continue;
        const added = record.addedNodes || [];
        for (let j = 0; j < added.length; j += 1) {
          const addedNode = added[j];
          forEachAddedNode(addedNode, (trackedNode) => {
            const containerBucket = getDomContainerBucket(trackedNode);
            const nodeBucket = getDomNodeBucket(trackedNode);
            applyDomDelta(containerBucket, nodeBucket, 1);
          });
        }
        const removed = record.removedNodes || [];
        for (let j = 0; j < removed.length; j += 1) {
          const removedNode = removed[j];
          const containerBucket = getDomContainerBucket(record.target);
          const nodeBucket = getDomNodeBucket(removedNode);
          applyDomDelta(containerBucket, nodeBucket, -1);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    monitorState.domObserver = observer;
  }

  function stopDomTracking() {
    if (!monitorState.domObserver) return;
    monitorState.domObserver.disconnect();
    monitorState.domObserver = null;
  }

  function collectSample() {
    const now = Date.now();
    const heap = getHeapMemory();
    const sample = {
      ts: now,
      domNodes: getDomNodeCount(),
      listenerActiveCount: monitorState.listenerActiveCount,
      listenerAddCalls: monitorState.listenerAddCalls,
      listenerRemoveCalls: monitorState.listenerRemoveCalls,
      topActiveTypes: getTopEntries(monitorState.activeByType, 5),
      topActiveTargets: getTopEntries(monitorState.activeByTarget, 5),
      topActiveTypeTargets: getTopEntries(monitorState.activeByTypeTarget, 5),
      usedJSHeapSize: heap.usedJSHeapSize,
      totalJSHeapSize: heap.totalJSHeapSize,
      jsHeapSizeLimit: heap.jsHeapSizeLimit,
      uaBytes: monitorState.uaMemoryLastBytes,
      uaJSBytes: monitorState.uaMemoryLastJSBytes,
      uaError: monitorState.uaMemoryLastError
    };

    monitorState.samples.push(sample);
    if (monitorState.samples.length > monitorState.maxSamples) {
      monitorState.samples.splice(0, monitorState.samples.length - monitorState.maxSamples);
    }
    return sample;
  }

  async function updateUAMemorySample() {
    if (monitorState.uaMemoryPending) return;
    if (!window.crossOriginIsolated) {
      monitorState.uaMemoryLastError = getDebugRuntimeText(
        'ui.debugRuntime.uaMemoryUnavailableCrossOrigin',
        null,
        ''
      );
      return;
    }
    if (!window.performance || !window.performance.measureUserAgentSpecificMemory) {
      monitorState.uaMemoryLastError = getDebugRuntimeText(
        'ui.debugRuntime.uaMemoryUnavailableApi',
        null,
        ''
      );
      return;
    }

    monitorState.uaMemoryPending = true;
    monitorState.uaMemoryLastError = '';
    try {
      const result = await window.performance.measureUserAgentSpecificMemory();
      monitorState.uaMemoryLastBytes = result.bytes;

      let jsBytes = 0;
      if (result.breakdown && result.breakdown.length > 0) {
        result.breakdown.forEach((entry) => {
          if (!entry || !entry.types || !entry.types.length) return;
          if (entry.types.includes('JS') || entry.types.includes('JavaScript')) {
            jsBytes += entry.bytes || 0;
          }
        });
      }
      monitorState.uaMemoryLastJSBytes = jsBytes > 0 ? jsBytes : null;
    } catch (error) {
      monitorState.uaMemoryLastError = error && error.message ? error.message : String(error);
    } finally {
      monitorState.uaMemoryPending = false;
      refreshPanel();
    }
  }

  function ensurePanel() {
    if (monitorState.panel) return monitorState.panel;

    const panel = document.createElement('div');
    panel.id = 'debug-runtime-monitor-panel';
    panel.style.position = 'fixed';
    panel.style.right = '10px';
    panel.style.bottom = '10px';
    panel.style.zIndex = '5000';
    panel.style.width = '330px';
    panel.style.background = 'rgba(0, 0, 0, 0.9)';
    panel.style.color = '#e8ffe8';
    panel.style.fontFamily = 'monospace';
    panel.style.fontSize = '12px';
    panel.style.lineHeight = '1.35';
    panel.style.border = '1px solid #4f8156';
    panel.style.borderRadius = '6px';
    panel.style.padding = '8px';
    panel.style.display = 'none';

    const title = document.createElement('div');
    title.textContent = getDebugRuntimeText('ui.debugRuntime.panelTitle', null, '');
    title.style.fontWeight = '700';
    title.style.marginBottom = '6px';
    panel.appendChild(title);

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '6px';
    controls.style.marginBottom = '8px';

    const stopButton = document.createElement('button');
    stopButton.textContent = getDebugRuntimeText('ui.debugRuntime.stop', null, '');
    stopButton.addEventListener('click', () => {
      runtimeDebugMonitor.disable();
    });
    controls.appendChild(stopButton);

    const sampleButton = document.createElement('button');
    sampleButton.textContent = getDebugRuntimeText('ui.debugRuntime.sampleNow', null, '');
    sampleButton.addEventListener('click', async () => {
      collectSample();
      await updateUAMemorySample();
      refreshPanel();
    });
    controls.appendChild(sampleButton);

    const clearButton = document.createElement('button');
    clearButton.textContent = getDebugRuntimeText('ui.debugRuntime.clear', null, '');
    clearButton.addEventListener('click', () => {
      monitorState.samples = [];
      refreshPanel();
    });
    controls.appendChild(clearButton);

    panel.appendChild(controls);

    const fields = {};
    const fieldDefs = [
      ['status', 'ui.debugRuntime.status'],
      ['samples', 'ui.debugRuntime.samples'],
      ['interval', 'ui.debugRuntime.interval'],
      ['domNodes', 'ui.debugRuntime.domNodes'],
      ['listenerActive', 'ui.debugRuntime.listenerActive'],
      ['listenerCalls', 'ui.debugRuntime.listenerCalls'],
      ['heapUsed', 'ui.debugRuntime.heapUsed'],
      ['heapTotal', 'ui.debugRuntime.heapTotal'],
      ['uaBytes', 'ui.debugRuntime.uaBytes'],
      ['uaJSBytes', 'ui.debugRuntime.uaJSBytes'],
      ['lastSample', 'ui.debugRuntime.lastSample']
    ];

    fieldDefs.forEach(([fieldKey, labelKey]) => {
      const row = document.createElement('div');
      const label = document.createElement('span');
      label.textContent = `${getDebugRuntimeText(labelKey, null, '')}: `;
      const value = document.createElement('span');
      value.textContent = '-';
      row.appendChild(label);
      row.appendChild(value);
      panel.appendChild(row);
      fields[fieldKey] = value;
    });

    document.body.appendChild(panel);
    monitorState.panel = panel;
    monitorState.panelFields = fields;
    return panel;
  }

  function refreshPanel() {
    if (!monitorState.panel || !monitorState.panelFields) return;

    const latest = monitorState.samples.length ? monitorState.samples[monitorState.samples.length - 1] : null;
    const f = monitorState.panelFields;
    f.status.textContent = monitorState.enabled
      ? getDebugRuntimeText('ui.debugRuntime.running', null, '')
      : getDebugRuntimeText('ui.debugRuntime.stopped', null, '');
    f.samples.textContent = String(monitorState.samples.length);
    f.interval.textContent = `${monitorState.intervalMs} ms`;
    f.domNodes.textContent = latest ? `${latest.domNodes}` : '-';
    f.listenerActive.textContent = latest ? `${latest.listenerActiveCount}` : '-';
    f.listenerCalls.textContent = latest
      ? `${latest.listenerAddCalls} / ${latest.listenerRemoveCalls}`
      : '-';
    f.heapUsed.textContent = latest ? formatBytes(latest.usedJSHeapSize) : '-';
    f.heapTotal.textContent = latest ? formatBytes(latest.totalJSHeapSize) : '-';
    if (monitorState.uaMemoryLastError) {
      f.uaBytes.textContent = monitorState.uaMemoryLastError;
      f.uaJSBytes.textContent = '-';
    } else {
      f.uaBytes.textContent = formatBytes(monitorState.uaMemoryLastBytes);
      f.uaJSBytes.textContent = formatBytes(monitorState.uaMemoryLastJSBytes);
    }
    f.lastSample.textContent = latest ? formatTimestamp(latest.ts) : '-';
  }

  async function runSamplerTick() {
    collectSample();
    await updateUAMemorySample();
    refreshPanel();
  }

  function startSampling() {
    if (monitorState.timerId) return;
    runSamplerTick();
    monitorState.timerId = window.setInterval(() => {
      runSamplerTick();
    }, monitorState.intervalMs);
  }

  function stopSampling() {
    if (!monitorState.timerId) return;
    window.clearInterval(monitorState.timerId);
    monitorState.timerId = null;
  }

  const runtimeDebugMonitor = {
    enable() {
      installListenerTracking();
      startDomTracking();
      monitorState.enabled = true;
      const panel = ensurePanel();
      panel.style.display = 'block';
      startSampling();
      refreshPanel();
    },
    disable() {
      monitorState.enabled = false;
      stopSampling();
      stopDomTracking();
      if (monitorState.panel) {
        monitorState.panel.style.display = 'none';
      }
      refreshPanel();
    },
    toggle() {
      if (monitorState.enabled) {
        this.disable();
      } else {
        this.enable();
      }
    },
    snapshot() {
      const latest = collectSample();
      refreshPanel();
      return latest;
    },
    clearSamples() {
      monitorState.samples = [];
      refreshPanel();
    },
    setIntervalMs(ms) {
      const next = Math.max(500, Math.floor(ms));
      monitorState.intervalMs = next;
      if (monitorState.enabled) {
        stopSampling();
        startSampling();
      }
      refreshPanel();
      return next;
    },
    getSamples() {
      return monitorState.samples.slice();
    },
    status() {
      return {
        enabled: monitorState.enabled,
        intervalMs: monitorState.intervalMs,
        sampleCount: monitorState.samples.length,
        activeListeners: monitorState.listenerActiveCount,
        addCalls: monitorState.listenerAddCalls,
        removeCalls: monitorState.listenerRemoveCalls,
        topAddedTypes: getTopEntries(monitorState.addsByType, 5),
        topRemoveCallTypes: getTopEntries(monitorState.removeCallsByType, 5),
        topActiveTypes: getTopEntries(monitorState.activeByType, 5),
        topAddedTargets: getTopEntries(monitorState.addsByTarget, 5),
        topRemoveCallTargets: getTopEntries(monitorState.removeCallsByTarget, 5),
        topActiveTargets: getTopEntries(monitorState.activeByTarget, 5),
        topRemoveCallTypeTargets: getTopEntries(monitorState.removeCallsByTypeTarget, 5),
        topActiveTypeTargets: getTopEntries(monitorState.activeByTypeTarget, 5),
        topDomNetContainers: getTopEntries(monitorState.domNetByContainer, 5),
        topDomAddsByContainerNode: getTopEntries(monitorState.domAddsByContainerNode, 5),
        lastUAMemoryBytes: monitorState.uaMemoryLastBytes,
        lastUAMemoryJSBytes: monitorState.uaMemoryLastJSBytes,
        lastUAMemoryError: monitorState.uaMemoryLastError
      };
    },
    getTopListenerAdds(limit) {
      return {
        byType: getTopEntries(monitorState.addsByType, limit),
        byTarget: getTopEntries(monitorState.addsByTarget, limit),
        byTypeTarget: getTopEntries(monitorState.addsByTypeTarget, limit)
      };
    },
    getTopListenerRemoveCalls(limit) {
      return {
        byType: getTopEntries(monitorState.removeCallsByType, limit),
        byTarget: getTopEntries(monitorState.removeCallsByTarget, limit),
        byTypeTarget: getTopEntries(monitorState.removeCallsByTypeTarget, limit)
      };
    },
    getTopDomGrowth(limit) {
      return {
        byContainerNet: getTopEntries(monitorState.domNetByContainer, limit),
        byContainerAdds: getTopEntries(monitorState.domAddsByContainer, limit),
        byNodeTypeAdds: getTopEntries(monitorState.domAddsByNode, limit),
        byContainerNodeAdds: getTopEntries(monitorState.domAddsByContainerNode, limit),
        byContainerRemovals: getTopEntries(monitorState.domRemovedByContainer, limit)
      };
    },
    getTopActiveListeners(limit) {
      return {
        byType: getTopEntries(monitorState.activeByType, limit),
        byTarget: getTopEntries(monitorState.activeByTarget, limit),
        byTypeTarget: getTopEntries(monitorState.activeByTypeTarget, limit)
      };
    },
    setStackTracking(enabled, sampleRate) {
      monitorState.stackTrackingEnabled = enabled === true;
      if (sampleRate > 0 && sampleRate <= 1) {
        monitorState.stackSampleRate = sampleRate;
      }
      return {
        enabled: monitorState.stackTrackingEnabled,
        sampleRate: monitorState.stackSampleRate
      };
    },
    getTopAddStacks(limit) {
      return getTopEntries(monitorState.addsByStack, limit);
    },
    getTopRemoveStacks(limit) {
      return getTopEntries(monitorState.removesByStack, limit);
    },
    clearAttributionCounters() {
      monitorState.addsByType = {};
      monitorState.removeCallsByType = {};
      monitorState.activeByType = {};
      monitorState.addsByTarget = {};
      monitorState.removeCallsByTarget = {};
      monitorState.activeByTarget = {};
      monitorState.addsByTypeTarget = {};
      monitorState.removeCallsByTypeTarget = {};
      monitorState.activeByTypeTarget = {};
      monitorState.addsByStack = {};
      monitorState.removesByStack = {};
      monitorState.domAddsByContainer = {};
      monitorState.domAddsByNode = {};
      monitorState.domAddsByContainerNode = {};
      monitorState.domRemovedByContainer = {};
      monitorState.domNetByContainer = {};
    }
  };

  window.runtimeDebugMonitor = runtimeDebugMonitor;
  console.log(getDebugRuntimeText('ui.debugRuntime.consoleHelp', null, ''));
})();
