class ZeusBattleProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.battleFrames = this.buildBattleFrames(config.attributes && config.attributes.battleFrames);
    this.currentFrameIndex = 0;
    this.targetFrameIndex = 0;
    this.lastUnlockedFrame = 0;
    this.animationFrameId = 0;
    this.animationStartTime = 0;
    this.animationDuration = 700;
    this.animationFromFrameIndex = 0;
    this.animationToFrameIndex = 0;
    this.animationProgress = 1;
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    this.renderLoopId = 0;
    this.frameActivatedAt = Date.now();
    this.primaryBattleActivatedAt = 0;
    this.edmondTransitionFrom = null;
    this.edmondTransitionStartedAt = 0;
    this.ui = null;
  }

  getText(path, vars, fallback) {
    try {
      return t(path, vars, fallback);
    } catch (error) {
      return fallback;
    }
  }

  buildBattleFrames(rawFrames) {
    const frames = Array.isArray(rawFrames) ? rawFrames : [];
    const normalized = [];
    let previousFrame = this.createDefaultBattleFrame(0);

    for (let i = 0; i < frames.length; i += 1) {
      const baseFrame = frames[i] || {};
      const nextFrame = this.cloneBattleFrame(previousFrame);
      nextFrame.id = typeof baseFrame.id === "number" ? baseFrame.id : i;
      if (Array.isArray(baseFrame.units)) {
        nextFrame.units = baseFrame.units.map(unit => ({ ...unit }));
      }
      normalized.push(nextFrame);
      previousFrame = nextFrame;
    }

    if (normalized.length === 0) {
      normalized.push(this.createDefaultBattleFrame(0));
    }

    return normalized;
  }

  createDefaultBattleFrame(id) {
    return {
      id: id,
      units: []
    };
  }

  cloneBattleFrame(frame) {
    return {
      id: frame.id,
      units: Array.isArray(frame.units) ? frame.units.map(unit => ({ ...unit })) : []
    };
  }

  getMaxUnlockedFrame() {
    return Math.min(this.repeatCount || 0, Math.max(0, this.battleFrames.length - 1));
  }

  renderUI(container) {
    const board = document.createElement("div");
    board.className = "zeus-battle-board";

    const canvasWrap = document.createElement("div");
    canvasWrap.className = "zeus-battle-canvas-wrap";

    const controls = document.createElement("div");
    controls.className = "zeus-battle-controls";

    const firstButton = this.createControlButton("|<", () => this.jumpToFrame(0));
    const prevButton = this.createControlButton("<", () => this.jumpToFrame(this.targetFrameIndex - 1));
    const nextButton = this.createControlButton(">", () => this.jumpToFrame(this.targetFrameIndex + 1));
    const lastButton = this.createControlButton(">|", () => this.jumpToFrame(this.getMaxUnlockedFrame()));

    controls.appendChild(firstButton);
    controls.appendChild(prevButton);
    controls.appendChild(nextButton);
    controls.appendChild(lastButton);

    const canvas = document.createElement("canvas");
    canvas.className = "zeus-battle-canvas";
    canvas.width = 720;
    canvas.height = 360;

    const footer = document.createElement("div");
    footer.className = "zeus-battle-footer";

    const frameLabel = document.createElement("span");
    frameLabel.className = "zeus-battle-frame-label";

    footer.appendChild(frameLabel);
    canvasWrap.appendChild(controls);
    canvasWrap.appendChild(canvas);
    board.appendChild(canvasWrap);
    board.appendChild(footer);
    container.appendChild(board);

    this.ui = {
      board: board,
      canvas: canvas,
      frameLabel: frameLabel,
      firstButton: firstButton,
      prevButton: prevButton,
      nextButton: nextButton,
      lastButton: lastButton
    };

    this.startRenderLoop();
    this.drawBattleFrame();
  }

  createControlButton(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "zeus-battle-control-button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  updateUI() {
    if (!this.ui) {
      return;
    }

    const maxUnlockedFrame = this.getMaxUnlockedFrame();
    const wasFollowingLatest = this.targetFrameIndex >= this.lastUnlockedFrame;
    if (maxUnlockedFrame > this.lastUnlockedFrame && wasFollowingLatest) {
      this.jumpToFrame(maxUnlockedFrame, true);
    } else if (this.targetFrameIndex > maxUnlockedFrame) {
      this.jumpToFrame(maxUnlockedFrame, false);
    } else {
      this.drawBattleFrame();
    }

    this.lastUnlockedFrame = maxUnlockedFrame;
    this.updateControls();
  }

  jumpToFrame(frameIndex, animate = true) {
    const maxUnlockedFrame = this.getMaxUnlockedFrame();
    const boundedFrame = Math.max(0, Math.min(maxUnlockedFrame, frameIndex));
    const previousBattleFrame = Math.max(this.currentFrameIndex, this.targetFrameIndex);
    const now = Date.now();

    if (boundedFrame === this.targetFrameIndex && !this.isAnimating()) {
      this.drawBattleFrame();
      this.updateControls();
      return;
    }

    this.captureEdmondTransitionState(previousBattleFrame, now);
    this.targetFrameIndex = boundedFrame;
    this.frameActivatedAt = now;
    if (boundedFrame >= 1 && previousBattleFrame < 1) {
      this.primaryBattleActivatedAt = this.frameActivatedAt;
    } else if (boundedFrame < 1) {
      this.primaryBattleActivatedAt = 0;
    }
    if (!animate || boundedFrame === this.currentFrameIndex) {
      this.stopAnimation();
      this.currentFrameIndex = boundedFrame;
      this.animationFromFrameIndex = boundedFrame;
      this.animationToFrameIndex = boundedFrame;
      this.animationProgress = 1;
      this.drawBattleFrame();
      this.updateControls();
      return;
    }

    this.animationFromFrameIndex = this.currentFrameIndex;
    this.animationToFrameIndex = boundedFrame;
    this.animationDuration = this.getTransitionDuration(this.animationFromFrameIndex, this.animationToFrameIndex);
    this.animationProgress = 0;
    this.animationStartTime = 0;
    this.startAnimation();
    this.updateControls();
  }

  getTransitionDuration(fromFrameIndex, toFrameIndex) {
    if (fromFrameIndex === 5 && toFrameIndex === 6) {
      return 10000;
    }
    return 700;
  }

  isAnimating() {
    return this.animationFrameId !== 0;
  }

  startAnimation() {
    this.stopAnimation();
    const tick = (timestamp) => {
      if (!this.animationStartTime) {
        this.animationStartTime = timestamp;
      }
      const elapsed = timestamp - this.animationStartTime;
      const progress = Math.max(0, Math.min(1, elapsed / this.animationDuration));
      this.animationProgress = progress;
      this.drawBattleFrame();

      if (progress >= 1) {
        this.currentFrameIndex = this.animationToFrameIndex;
        this.animationFromFrameIndex = this.currentFrameIndex;
        this.animationProgress = 1;
        this.animationFrameId = 0;
        this.drawBattleFrame();
        this.updateControls();
        return;
      }

      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  startRenderLoop() {
    if (this.renderLoopId) {
      return;
    }
    const render = () => {
      this.renderLoopId = 0;
      if (!this.ui || !this.ui.canvas || !this.ui.canvas.isConnected) {
        return;
      }
      this.drawBattleFrame();
      this.renderLoopId = requestAnimationFrame(render);
    };
    this.renderLoopId = requestAnimationFrame(render);
  }

  getRenderedFrameState() {
    const fromIndex = this.isAnimating() ? this.animationFromFrameIndex : this.currentFrameIndex;
    const toIndex = this.isAnimating() ? this.animationToFrameIndex : this.currentFrameIndex;
    const fromFrame = this.battleFrames[fromIndex] || this.battleFrames[0];
    const toFrame = this.battleFrames[toIndex] || fromFrame;
    const progress = this.isAnimating() ? this.easeInOut(this.animationProgress) : 1;

    if (fromIndex === toIndex || progress >= 1) {
      return {
        frameIndex: toIndex,
        units: toFrame.units.map(unit => ({ ...unit }))
      };
    }

    const units = [];
    const maxUnits = Math.max(fromFrame.units.length, toFrame.units.length);
    for (let i = 0; i < maxUnits; i += 1) {
      const fromUnit = fromFrame.units[i] || toFrame.units[i];
      const toUnit = toFrame.units[i] || fromFrame.units[i];
      units.push({
        ...toUnit,
        x: this.lerp(fromUnit.x, toUnit.x, progress),
        y: this.lerp(fromUnit.y, toUnit.y, progress),
        size: this.lerp(fromUnit.size || 0.04, toUnit.size || 0.04, progress),
        alpha: this.lerp(
          typeof fromUnit.alpha === "number" ? fromUnit.alpha : 1,
          typeof toUnit.alpha === "number" ? toUnit.alpha : 1,
          progress
        )
      });
    }

    return {
      frameIndex: toIndex,
      units: this.applyFrameSpecificUnitOverrides(units, toIndex)
    };
  }

  applyFrameSpecificUnitOverrides(units, frameIndex) {
    if (frameIndex === 9) {
      return units.map(unit => this.isMercyUnit(unit) ? { ...unit, alpha: 0 } : unit);
    }
    return units;
  }

  lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  easeInOut(value) {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  resizeCanvasIfNeeded(ctx) {
    if (!this.ui || !this.ui.canvas) {
      return;
    }

    const canvas = this.ui.canvas;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width || 720));
    const height = Math.max(220, Math.round(rect.height || 360));
    const pixelRatio = window.devicePixelRatio || 1;
    const targetWidth = Math.round(width * pixelRatio);
    const targetHeight = Math.round(height * pixelRatio);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      this.canvasWidth = width;
      this.canvasHeight = height;
    } else if (!this.canvasWidth || !this.canvasHeight) {
      this.canvasWidth = width;
      this.canvasHeight = height;
    }

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  drawBattleFrame() {
    if (!this.ui || !this.ui.canvas) {
      return;
    }

    const ctx = this.ui.canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    this.resizeCanvasIfNeeded(ctx);
    const width = this.canvasWidth || 720;
    const height = this.canvasHeight || 360;
    const frameState = this.getRenderedFrameState();

    ctx.clearRect(0, 0, width, height);

    const background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#08111f");
    background.addColorStop(1, "#14253d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    this.drawBackdropGrid(ctx, width, height);
    frameState.units.forEach(unit => this.drawUnit(ctx, unit, width, height));
    this.drawFrameEffects(ctx, frameState, width, height);

    if (this.ui.frameLabel) {
      const maxUnlockedFrame = this.getMaxUnlockedFrame();
      this.ui.frameLabel.textContent = this.getText(
        "ui.projects.zeusBattle.frameLabel",
        { current: this.targetFrameIndex, max: maxUnlockedFrame },
        "Frame {current} / {max}"
      );
    }
  }

  drawFrameEffects(ctx, frameState, width, height) {
    if (frameState.frameIndex === 1) {
      this.drawPrimaryBattleExchange(ctx, frameState, width, height);
      return;
    }

    if (frameState.frameIndex === 2) {
      this.drawPrimaryBattleExchange(ctx, frameState, width, height);
      return;
    }

    if (frameState.frameIndex === 3 || frameState.frameIndex === 4) {
      this.drawPrimaryBattleExchange(ctx, frameState, width, height);
      this.drawEdmondAmbush(ctx, frameState, width, height);
      return;
    }

    if (frameState.frameIndex === 5) {
      this.drawPrimaryBattleExchange(ctx, frameState, width, height);
      this.drawEdmondAmbush(ctx, frameState, width, height);
      this.drawSuperweaponArrival(ctx, frameState, width, height);
      return;
    }

    if (frameState.frameIndex === 6) {
      this.drawPrimaryBattleExchange(ctx, frameState, width, height);
      this.drawEdmondAmbush(ctx, frameState, width, height);
      this.drawSuperweaponArrival(ctx, frameState, width, height);
      this.drawSuperweaponStrike(ctx, frameState, width, height);
      return;
    }

    if (frameState.frameIndex === 7) {
      this.drawPrimaryBattleExchange(ctx, frameState, width, height);
      this.drawEdmondAmbush(ctx, frameState, width, height);
      this.drawSuperweaponArrival(ctx, frameState, width, height);
      this.drawFrameSevenWarp(ctx, frameState, width, height);
      return;
    }

    if (frameState.frameIndex === 8 || frameState.frameIndex === 9) {
      this.drawPrimaryBattleExchange(ctx, frameState, width, height);
      this.drawEdmondAmbush(ctx, frameState, width, height);
      this.drawSuperweaponArrival(ctx, frameState, width, height);
      if (frameState.frameIndex === 9) {
        this.drawMercyAdvance(ctx, frameState, width, height);
      }
      return;
    }

    if (frameState.frameIndex === 10) {
      this.drawPrimaryBattleExchange(ctx, frameState, width, height);
      this.drawEdmondAmbush(ctx, frameState, width, height);
      this.drawSuperweaponArrival(ctx, frameState, width, height);
      this.drawMercyStrike(ctx, frameState, width, height);
      return;
    }

    if (frameState.frameIndex === 11) {
      this.drawPrimaryBattleExchange(ctx, frameState, width, height);
      this.drawEdmondAmbush(ctx, frameState, width, height);
      this.drawSuperweaponArrival(ctx, frameState, width, height);
      this.drawCashmoneyStrike(ctx, frameState, width, height);
      return;
    }

    if (frameState.frameIndex === 12) {
      this.drawPrimaryBattleExchange(ctx, frameState, width, height);
      this.drawEdmondAmbush(ctx, frameState, width, height);
      this.drawSuperweaponArrival(ctx, frameState, width, height);
      return;
    }

    if (frameState.frameIndex === 13) {
      this.drawPrimaryBattleExchange(ctx, frameState, width, height);
      this.drawEdmondAmbush(ctx, frameState, width, height);
      this.drawSuperweaponDeath(ctx, frameState, width, height);
      return;
    }

    if (frameState.frameIndex === 14) {
      this.drawFrameFourteenAftermath(ctx, frameState, width, height);
      return;
    }
  }

  drawPrimaryBattleExchange(ctx, frameState, width, height) {
    const enemyUnits = frameState.units.filter(unit => unit.shape === "triangle");
    const alliedUnits = frameState.units.filter(unit => unit.kind !== "planet" && unit.kind !== "superweapon" && unit.shape !== "triangle" && unit.group !== "edmond" && (frameState.frameIndex < 6 || !this.isHorseUnit(unit)) && (frameState.frameIndex < 10 || !this.isMercyUnit(unit)) && (frameState.frameIndex < 11 || !this.isCashmoneyUnit(unit)));
    if (!enemyUnits.length || !alliedUnits.length) {
      return;
    }

    const averageEnemyAlpha = enemyUnits.reduce((sum, unit) => sum + (typeof unit.alpha === "number" ? unit.alpha : 1), 0) / enemyUnits.length;
    const intensity = Math.max(0, Math.min(1, averageEnemyAlpha));
    if (intensity <= 0) {
      return;
    }

    const waitMs = 2000;
    if (!this.primaryBattleActivatedAt) {
      return;
    }
    const elapsedSinceFrameActivation = this.getEffectElapsedMs(
      frameState.frameIndex,
      1,
      this.primaryBattleActivatedAt,
      waitMs + 5000
    );
    if (elapsedSinceFrameActivation < waitMs) {
      return;
    }

    const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(Date.now() / 140));
    const alpha = intensity * pulse;
    const combatElapsedMs = Math.max(0, elapsedSinceFrameActivation - waitMs);

    this.drawProjectileSet(ctx, enemyUnits, alliedUnits, width, height, {
      color: "rgba(255, 140, 120, " + (0.32 + alpha * 0.45) + ")",
      trailColor: "rgba(255, 180, 160, " + (0.08 + alpha * 0.18) + ")",
      seedOffset: 0,
      combatElapsedMs: combatElapsedMs
    });
    this.drawProjectileSet(ctx, alliedUnits, enemyUnits, width, height, {
      color: "rgba(160, 220, 255, " + (0.28 + alpha * 0.4) + ")",
      trailColor: "rgba(190, 235, 255, " + (0.08 + alpha * 0.16) + ")",
      seedOffset: 100,
      combatElapsedMs: combatElapsedMs
    });
  }

  drawEdmondAmbush(ctx, frameState, width, height) {
    const edmondUnits = frameState.units.filter(unit => unit.group === "edmond");
    const enemyUnits = frameState.units.filter(unit => unit.shape === "triangle");
    if (!edmondUnits.length || !enemyUnits.length) {
      return;
    }

    const waitMs = 1400;
    const fadeInMs = 900;
    const elapsedSinceFrameActivation = this.getEffectElapsedMs(
      frameState.frameIndex,
      3,
      this.frameActivatedAt,
      waitMs + fadeInMs + 3500
    );
    if (elapsedSinceFrameActivation < waitMs) {
      return;
    }

    const ambushElapsedMs = elapsedSinceFrameActivation - waitMs;
    const time = ambushElapsedMs / 1000;
    const visibleUnits = [];
    const firingUnits = [];
    for (let i = 0; i < edmondUnits.length; i += 1) {
      const unit = edmondUnits[i];
      if (unit.destroyed) {
        continue;
      }
      if (frameState.frameIndex === 7 && this.isWarpBeamSourceEdmond(unit)) {
        continue;
      }
      const alpha = this.getEdmondAmbushAlpha(i, ambushElapsedMs, fadeInMs, time);
      const smoothedAlpha = this.getSmoothedEdmondAlpha(frameState.frameIndex, i, alpha);

      if (smoothedAlpha > 0.08) {
        this.drawUnit(ctx, { ...unit, alpha: smoothedAlpha }, width, height);
        firingUnits.push({
          ...unit,
          projectileAlpha: Math.max(0.25, smoothedAlpha),
          projectileSeed: i
        });
      }
      if (smoothedAlpha > 0.45) {
        visibleUnits.push({ ...unit, alpha: smoothedAlpha });
      }
    }

    if (!firingUnits.length) {
      return;
    }

    this.drawProjectileSet(ctx, firingUnits, enemyUnits, width, height, {
      color: "rgba(235, 240, 255, 0.7)",
      trailColor: "rgba(210, 220, 255, 0.14)",
      seedOffset: 200,
      combatElapsedMs: ambushElapsedMs,
      startFromOrigin: true
    });
  }

  drawSuperweaponArrival(ctx, frameState, width, height) {
    const superweaponUnit = frameState.units.find(unit => unit.kind === "superweapon");
    if (!superweaponUnit) {
      return;
    }

    const waitMs = 250;
    const fadeMs = 1400;
    const elapsedSinceFrameActivation = this.getEffectElapsedMs(
      frameState.frameIndex,
      5,
      this.frameActivatedAt,
      waitMs + fadeMs
    );
    if (elapsedSinceFrameActivation < waitMs) {
      return;
    }

    const alpha = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - waitMs) / fadeMs));
    this.drawUnit(ctx, { ...superweaponUnit, alpha: alpha }, width, height);
  }

  drawSuperweaponStrike(ctx, frameState, width, height) {
    const superweaponUnit = frameState.units.find(unit => unit.kind === "superweapon");
    const horseUnit = this.getHorseReferenceUnit(frameState);
    if (!superweaponUnit || !horseUnit) {
      return;
    }

    const elapsedSinceFrameActivation = this.getEffectElapsedMs(
      frameState.frameIndex,
      6,
      this.frameActivatedAt,
      5200
    );
    const beamDelayMs = 220;
    const beamRampMs = 420;
    const beamHoldMs = 860;
    const explosionDelayMs = 760;
    const explosionDurationMs = 820;
    const fadeDelayMs = 980;
    const fadeDurationMs = 1200;
    const aftermathDurationMs = 5000;

    const beamProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - beamDelayMs) / beamRampMs));
    const beamActive = elapsedSinceFrameActivation >= beamDelayMs;
    const beamHoldProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - beamDelayMs - beamRampMs) / beamHoldMs));
    const horseFadeProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - fadeDelayMs) / fadeDurationMs));
    const horseAlpha = Math.max(0, 1 - horseFadeProgress);
    const beamEndMs = beamDelayMs + beamRampMs + beamHoldMs;
    const beamAftermathProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - beamEndMs) / aftermathDurationMs));
    const beamAfterglow = elapsedSinceFrameActivation > beamEndMs ? 1 - beamAftermathProgress : 1;
    const explosionEndMs = explosionDelayMs + explosionDurationMs;
    const explosionAftermathProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - explosionEndMs) / aftermathDurationMs));
    const explosionAfterglow = elapsedSinceFrameActivation > explosionEndMs ? 1 - explosionAftermathProgress : 1;

    if (horseAlpha > 0) {
      this.drawUnit(ctx, { ...horseUnit, alpha: horseAlpha, forceDraw: true }, width, height);
    }

    if (beamActive && beamAfterglow > 0) {
      const beamIntensity = Math.max(0.08, Math.min(1, beamProgress * (1 - beamHoldProgress * 0.12))) * beamAfterglow;
      this.drawSuperweaponBeam(ctx, superweaponUnit, horseUnit, width, height, beamIntensity);
    }

    const explosionElapsedMs = elapsedSinceFrameActivation - explosionDelayMs;
    if (explosionElapsedMs > 0 && explosionAfterglow > 0) {
      const explosionProgress = Math.max(0, Math.min(1, explosionElapsedMs / explosionDurationMs));
      this.drawHorseExplosion(ctx, horseUnit, width, height, explosionProgress, explosionAfterglow);
    }
  }

  drawFrameSevenWarp(ctx, frameState, width, height) {
    const superweaponUnit = frameState.units.find(unit => unit.kind === "superweapon");
    const sourceEdmond = this.getWarpBeamSourceUnit(frameState);
    const okoUnit = this.getWarpBeamTargetUnit(frameState);
    if (!superweaponUnit || !sourceEdmond || !okoUnit) {
      return;
    }

    const elapsedSinceFrameActivation = this.getEffectElapsedMs(
      frameState.frameIndex,
      7,
      this.frameActivatedAt,
      10400
    );
    const beamDelayMs = 360;
    const beamRampMs = 720;
    const warpDelayMs = 1040;
    const redirectDelayMs = 1520;
    const explosionDelayMs = 3500;
    const explosionDurationMs = 1800;
    const fadeDurationMs = 4400;

    const sourceAlpha = elapsedSinceFrameActivation < explosionDelayMs
      ? 1
      : Math.max(0, 1 - (elapsedSinceFrameActivation - explosionDelayMs) / fadeDurationMs);
    const warpCopy = {
      ...sourceEdmond,
      x: okoUnit.x - 0.055,
      y: okoUnit.y - 0.06
    };
    const copyAlpha = elapsedSinceFrameActivation < warpDelayMs
      ? 0
      : elapsedSinceFrameActivation < explosionDelayMs
        ? 1
        : Math.max(0, 1 - (elapsedSinceFrameActivation - explosionDelayMs) / fadeDurationMs);

    this.drawUnit(ctx, { ...okoUnit, stroke: "#ffb86c" }, width, height);
    if (sourceAlpha > 0) {
      this.drawUnit(ctx, { ...sourceEdmond, alpha: sourceAlpha }, width, height);
    }
    if (copyAlpha > 0) {
      this.drawUnit(ctx, { ...warpCopy, alpha: copyAlpha }, width, height);
    }

    const beamProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - beamDelayMs) / beamRampMs));
    if (beamProgress > 0 && sourceAlpha > 0) {
      this.drawSuperweaponBeam(ctx, superweaponUnit, sourceEdmond, width, height, beamProgress, true);
    }

    if (elapsedSinceFrameActivation >= warpDelayMs && sourceAlpha > 0 && copyAlpha > 0) {
      this.drawWarpDottedLine(ctx, sourceEdmond, warpCopy, width, height);
    }

    const redirectProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - redirectDelayMs) / 420));
    if (redirectProgress > 0 && copyAlpha > 0) {
      this.drawRedirectBeam(ctx, warpCopy, okoUnit, width, height, redirectProgress);
    }

    const explosionElapsedMs = elapsedSinceFrameActivation - explosionDelayMs;
    if (explosionElapsedMs > 0) {
      const explosionProgress = Math.max(0, Math.min(1, explosionElapsedMs / explosionDurationMs));
      this.drawEdmondExplosion(ctx, sourceEdmond, width, height, explosionProgress, sourceAlpha);
      this.drawEdmondExplosion(ctx, warpCopy, width, height, explosionProgress, copyAlpha);
    }
  }

  drawMercyAdvance(ctx, frameState, width, height) {
    const mercyStartUnit = this.getMercyFrameUnit(8);
    const mercyEndUnit = this.getMercyFrameUnit(9);
    if (!mercyStartUnit || !mercyEndUnit) {
      return;
    }

    const elapsedSinceFrameActivation = this.getEffectElapsedMs(
      frameState.frameIndex,
      9,
      this.frameActivatedAt,
      10000
    );
    const mercyMoveProgress = Math.max(0, Math.min(1, elapsedSinceFrameActivation / 10000));

    this.drawUnit(ctx, {
      ...mercyEndUnit,
      x: this.lerp(mercyStartUnit.x, mercyEndUnit.x, mercyMoveProgress),
      y: this.lerp(mercyStartUnit.y, mercyEndUnit.y, mercyMoveProgress),
      forceDraw: true
    }, width, height);
  }

  drawMercyStrike(ctx, frameState, width, height) {
    const superweaponUnit = frameState.units.find(unit => unit.kind === "superweapon");
    const mercyUnit = this.getMercyReferenceUnit(frameState);
    const cashmoneyStartUnit = this.getCashmoneyReferenceUnit(9);
    const cashmoneyEndUnit = this.getCashmoneyReferenceUnit(10);
    if (!superweaponUnit || !mercyUnit) {
      return;
    }

    const elapsedSinceFrameActivation = this.getEffectElapsedMs(
      frameState.frameIndex,
      10,
      this.frameActivatedAt,
      5200
    );
    const beamDelayMs = 220;
    const beamRampMs = 420;
    const beamHoldMs = 860;
    const explosionDelayMs = 760;
    const explosionDurationMs = 820;
    const fadeDelayMs = 980;
    const fadeDurationMs = 1200;
    const aftermathDurationMs = 5000;
    const cashmoneyMoveDelayMs = explosionDelayMs + explosionDurationMs;
    const cashmoneyMoveDurationMs = 10000;

    const beamProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - beamDelayMs) / beamRampMs));
    const beamActive = elapsedSinceFrameActivation >= beamDelayMs;
    const beamHoldProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - beamDelayMs - beamRampMs) / beamHoldMs));
    const mercyFadeProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - fadeDelayMs) / fadeDurationMs));
    const mercyAlpha = Math.max(0, 1 - mercyFadeProgress);
    const beamEndMs = beamDelayMs + beamRampMs + beamHoldMs;
    const beamAftermathProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - beamEndMs) / aftermathDurationMs));
    const beamAfterglow = elapsedSinceFrameActivation > beamEndMs ? 1 - beamAftermathProgress : 1;
    const explosionEndMs = explosionDelayMs + explosionDurationMs;
    const explosionAftermathProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - explosionEndMs) / aftermathDurationMs));
    const explosionAfterglow = elapsedSinceFrameActivation > explosionEndMs ? 1 - explosionAftermathProgress : 1;

    if (mercyAlpha > 0) {
      this.drawUnit(ctx, { ...mercyUnit, alpha: mercyAlpha, forceDraw: true }, width, height);
    }

    if (cashmoneyStartUnit && cashmoneyEndUnit) {
      const cashmoneyMoveProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - cashmoneyMoveDelayMs) / cashmoneyMoveDurationMs));
      this.drawUnit(ctx, {
        ...cashmoneyEndUnit,
        x: this.lerp(cashmoneyStartUnit.x, cashmoneyEndUnit.x, cashmoneyMoveProgress),
        y: this.lerp(cashmoneyStartUnit.y, cashmoneyEndUnit.y, cashmoneyMoveProgress),
        forceDraw: true
      }, width, height);
    }

    if (beamActive && beamAfterglow > 0) {
      const beamIntensity = Math.max(0.08, Math.min(1, beamProgress * (1 - beamHoldProgress * 0.12))) * beamAfterglow;
      this.drawSuperweaponBeam(ctx, superweaponUnit, mercyUnit, width, height, beamIntensity);
    }

    const explosionElapsedMs = elapsedSinceFrameActivation - explosionDelayMs;
    if (explosionElapsedMs > 0 && explosionAfterglow > 0) {
      const explosionProgress = Math.max(0, Math.min(1, explosionElapsedMs / explosionDurationMs));
      this.drawHorseExplosion(ctx, mercyUnit, width, height, explosionProgress, explosionAfterglow);
    }
  }

  drawCashmoneyStrike(ctx, frameState, width, height) {
    const superweaponUnit = frameState.units.find(unit => unit.kind === "superweapon");
    const cashmoneyUnit = this.getCashmoneyReferenceUnit(10);
    if (!superweaponUnit || !cashmoneyUnit) {
      return;
    }

    const elapsedSinceFrameActivation = this.getEffectElapsedMs(
      frameState.frameIndex,
      11,
      this.frameActivatedAt,
      5200
    );
    const beamDelayMs = 220;
    const beamRampMs = 420;
    const beamHoldMs = 860;
    const explosionDelayMs = 760;
    const explosionDurationMs = 820;
    const fadeDelayMs = 980;
    const fadeDurationMs = 1200;
    const aftermathDurationMs = 5000;

    const beamProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - beamDelayMs) / beamRampMs));
    const beamActive = elapsedSinceFrameActivation >= beamDelayMs;
    const beamHoldProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - beamDelayMs - beamRampMs) / beamHoldMs));
    const cashmoneyFadeProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - fadeDelayMs) / fadeDurationMs));
    const cashmoneyAlpha = Math.max(0, 1 - cashmoneyFadeProgress);
    const beamEndMs = beamDelayMs + beamRampMs + beamHoldMs;
    const beamAftermathProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - beamEndMs) / aftermathDurationMs));
    const beamAfterglow = elapsedSinceFrameActivation > beamEndMs ? 1 - beamAftermathProgress : 1;
    const explosionEndMs = explosionDelayMs + explosionDurationMs;
    const explosionAftermathProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - explosionEndMs) / aftermathDurationMs));
    const explosionAfterglow = elapsedSinceFrameActivation > explosionEndMs ? 1 - explosionAftermathProgress : 1;

    if (cashmoneyAlpha > 0) {
      this.drawUnit(ctx, { ...cashmoneyUnit, alpha: cashmoneyAlpha, forceDraw: true }, width, height);
    }

    if (beamActive && beamAfterglow > 0) {
      const beamIntensity = Math.max(0.08, Math.min(1, beamProgress * (1 - beamHoldProgress * 0.12))) * beamAfterglow;
      this.drawSuperweaponBeam(ctx, superweaponUnit, cashmoneyUnit, width, height, beamIntensity);
    }

    const explosionElapsedMs = elapsedSinceFrameActivation - explosionDelayMs;
    if (explosionElapsedMs > 0 && explosionAfterglow > 0) {
      const explosionProgress = Math.max(0, Math.min(1, explosionElapsedMs / explosionDurationMs));
      this.drawHorseExplosion(ctx, cashmoneyUnit, width, height, explosionProgress, explosionAfterglow);
    }
  }

  drawSuperweaponDeath(ctx, frameState, width, height) {
    const superweaponUnit = frameState.units.find(unit => unit.kind === "superweapon");
    if (!superweaponUnit) {
      return;
    }

    const elapsedSinceFrameActivation = this.getEffectElapsedMs(
      frameState.frameIndex,
      13,
      this.frameActivatedAt,
      9000
    );
    const detonationDelayMs = 420;
    const coreBuildMs = 900;
    const burstDurationMs = 2200;
    const fadeDurationMs = 5200;
    const debrisStartMs = detonationDelayMs + burstDurationMs * 0.7;

    let preBurstAlpha = elapsedSinceFrameActivation < detonationDelayMs
      ? 1
      : elapsedSinceFrameActivation < detonationDelayMs + coreBuildMs
        ? 1 - ((elapsedSinceFrameActivation - detonationDelayMs) / coreBuildMs) * 0.35
        : 0.65;
    if (elapsedSinceFrameActivation >= debrisStartMs) {
      preBurstAlpha = 0;
    }
    if (preBurstAlpha > 0) {
      this.drawUnit(ctx, { ...superweaponUnit, alpha: preBurstAlpha, forceDraw: true }, width, height);
    }

    const burstElapsedMs = elapsedSinceFrameActivation - detonationDelayMs;
    if (burstElapsedMs <= 0) {
      return;
    }

    const burstProgress = Math.max(0, Math.min(1, burstElapsedMs / burstDurationMs));
    const afterglow = Math.max(0, 1 - Math.max(0, burstElapsedMs - burstDurationMs) / fadeDurationMs);
    const x = superweaponUnit.x * width;
    const y = superweaponUnit.y * height;
    const torusSize = (superweaponUnit.heightScale || 0.675) * height;
    const blastRadius = torusSize * (0.28 + burstProgress * 0.72);
    const coreRadius = torusSize * (0.08 + burstProgress * 0.22);

    ctx.save();

    const outerShock = ctx.createRadialGradient(x, y, 0, x, y, blastRadius * 1.45);
    outerShock.addColorStop(0, "rgba(255, 252, 240, " + (0.98 * afterglow) + ")");
    outerShock.addColorStop(0.18, "rgba(255, 214, 145, " + (0.88 * afterglow) + ")");
    outerShock.addColorStop(0.42, "rgba(255, 110, 70, " + (0.62 * afterglow) + ")");
    outerShock.addColorStop(0.72, "rgba(142, 215, 255, " + (0.26 * afterglow) + ")");
    outerShock.addColorStop(1, "rgba(142, 215, 255, 0)");
    ctx.fillStyle = outerShock;
    ctx.beginPath();
    ctx.arc(x, y, blastRadius * 1.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 240, 220, " + (0.8 * afterglow) + ")";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, blastRadius * 0.96, 0, Math.PI * 2);
    ctx.stroke();

    const coreGlow = ctx.createRadialGradient(x, y, 0, x, y, coreRadius * 2.1);
    coreGlow.addColorStop(0, "rgba(255, 250, 240, " + (1 * afterglow) + ")");
    coreGlow.addColorStop(0.28, "rgba(255, 205, 120, " + (0.88 * afterglow) + ")");
    coreGlow.addColorStop(0.58, "rgba(255, 128, 88, " + (0.55 * afterglow) + ")");
    coreGlow.addColorStop(1, "rgba(255, 128, 88, 0)");
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(x, y, coreRadius * 2.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 248, 236, " + (0.95 * afterglow) + ")";
    ctx.beginPath();
    ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 194, 120, " + (0.75 * afterglow) + ")";
    ctx.lineWidth = 3;
    for (let i = 0; i < 14; i += 1) {
      const angle = -0.4 + i * 0.46;
      const inner = coreRadius * 1.15;
      const outer = blastRadius * (0.75 + (i % 3) * 0.14);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
      ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(180, 220, 255, " + (0.55 * afterglow) + ")";
    for (let i = 0; i < 18; i += 1) {
      const angle = i * 0.35;
      const distance = blastRadius * (0.55 + (i % 4) * 0.12);
      const fragmentSize = 2 + (i % 3);
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle + burstProgress * 0.6) * distance,
        y + Math.sin(angle + burstProgress * 0.6) * distance,
        fragmentSize,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    if (elapsedSinceFrameActivation >= debrisStartMs) {
      const debrisProgress = Math.max(0, Math.min(1, (elapsedSinceFrameActivation - debrisStartMs) / fadeDurationMs));
      this.drawSuperweaponDebris(ctx, superweaponUnit, width, height, 1 - debrisProgress * 0.75);
    }

    ctx.restore();
  }

  drawFrameFourteenAftermath(ctx, frameState, width, height) {
    const superweaponUnit = frameState.units.find(unit => unit.kind === "superweapon");
    const edmondUnits = frameState.units.filter(unit => unit.group === "edmond" && !unit.destroyed);
    const imperialUnits = frameState.units.filter(unit => unit.shape === "triangle");
    const alliedUnits = frameState.units.filter(unit => unit.kind !== "planet" && unit.kind !== "superweapon" && unit.shape !== "triangle" && unit.group !== "edmond" && !this.isHorseUnit(unit) && !this.isMercyUnit(unit) && !this.isCashmoneyUnit(unit));
    const elapsedMs = this.getEffectElapsedMs(
      frameState.frameIndex,
      14,
      this.frameActivatedAt,
      3600
    );

    if (superweaponUnit) {
      this.drawSuperweaponDebris(ctx, superweaponUnit, width, height, 0.68);
    }

    const aftermathFade = Math.max(0, 1 - elapsedMs / 2200);
    const primaryPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(Date.now() / 140));
    const primaryIntensity = imperialUnits.length
      ? Math.max(
        0,
        Math.min(
          1,
          imperialUnits.reduce((sum, unit) => sum + (typeof unit.alpha === "number" ? unit.alpha : 1), 0) / imperialUnits.length
        )
      )
      : 0;
    const primaryAlpha = primaryIntensity * primaryPulse;
    const primaryBattleWaitMs = 2000;
    const primaryBattleElapsedMs = this.primaryBattleActivatedAt
      ? this.getEffectElapsedMs(
        frameState.frameIndex,
        1,
        this.primaryBattleActivatedAt,
        primaryBattleWaitMs + 5000
      )
      : 0;
    const primaryCombatElapsedMs = Math.max(0, primaryBattleElapsedMs - primaryBattleWaitMs);
    const edmondWaitMs = 1400;
    const edmondElapsedMs = this.getEffectElapsedMs(
      frameState.frameIndex,
      3,
      this.frameActivatedAt,
      edmondWaitMs + 900 + 3500
    );
    const edmondCombatElapsedMs = Math.max(0, edmondElapsedMs - edmondWaitMs);
    const edmondTime = edmondCombatElapsedMs / 1000;
    const edmondFadeInMs = 900;

    for (let i = 0; i < edmondUnits.length; i += 1) {
      const alpha = this.getSmoothedEdmondAlpha(frameState.frameIndex, i, 1);
      this.drawUnit(ctx, {
        ...edmondUnits[i],
        alpha: alpha,
        forceDraw: true
      }, width, height);
    }

    for (let i = 0; i < imperialUnits.length; i += 1) {
      const unit = imperialUnits[i];
      const warpExitState = this.getImperialWarpExitState(elapsedMs, i);

      if (warpExitState.alpha <= 0) {
        continue;
      }

      this.drawImperialWarpExitEffect(ctx, unit, width, height, warpExitState);
      this.drawUnit(ctx, {
        ...unit,
        x: unit.x + warpExitState.offsetX,
        y: unit.y + warpExitState.offsetY,
        size: unit.size ? unit.size * warpExitState.scale : unit.size,
        alpha: warpExitState.alpha,
        forceDraw: true
      }, width, height);
    }

    if (aftermathFade > 0 && imperialUnits.length && alliedUnits.length) {
      this.drawProjectileSet(ctx, imperialUnits, alliedUnits, width, height, {
        color: "rgba(255, 140, 120, " + ((0.32 + primaryAlpha * 0.45) * aftermathFade) + ")",
        trailColor: "rgba(255, 180, 160, " + ((0.08 + primaryAlpha * 0.18) * aftermathFade) + ")",
        seedOffset: 0,
        combatElapsedMs: primaryCombatElapsedMs
      });
      this.drawProjectileSet(ctx, alliedUnits, imperialUnits, width, height, {
        color: "rgba(160, 220, 255, " + ((0.28 + primaryAlpha * 0.4) * aftermathFade) + ")",
        trailColor: "rgba(190, 235, 255, " + ((0.08 + primaryAlpha * 0.16) * aftermathFade) + ")",
        seedOffset: 100,
        combatElapsedMs: primaryCombatElapsedMs
      });
      this.drawProjectileSet(ctx, edmondUnits.map(unit => ({
        ...unit,
        projectileAlpha: aftermathFade
      })), imperialUnits, width, height, {
        color: "rgba(235, 240, 255, " + (0.7 * aftermathFade) + ")",
        trailColor: "rgba(210, 220, 255, " + (0.14 * aftermathFade) + ")",
        seedOffset: 200,
        combatElapsedMs: edmondCombatElapsedMs
      });
    }
  }

  getImperialWarpExitState(elapsedMs, unitIndex) {
    const warpDelayMs = unitIndex * 220;
    const warpElapsedMs = Math.max(0, elapsedMs - warpDelayMs);
    const warpDurationMs = 1500;

    if (warpElapsedMs <= 0) {
      return {
        alpha: 1,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        progress: 0,
        flare: 0
      };
    }

    const progress = Math.max(0, Math.min(1, warpElapsedMs / warpDurationMs));
    const chargeProgress = Math.max(0, Math.min(1, progress / 0.22));
    const vanishProgress = Math.max(0, (progress - 0.22) / 0.78);
    const flare = Math.sin(chargeProgress * Math.PI);
    const alpha = progress < 0.22
      ? Math.min(1, 0.88 + flare * 0.2)
      : Math.max(0, 1 - Math.pow(vanishProgress, 0.55));
    const scale = progress < 0.22
      ? 1 + flare * 0.18
      : Math.max(0.08, 1 - Math.pow(vanishProgress, 0.72) * 0.92);
    const driftStrength = progress < 0.22 ? 0.003 * chargeProgress : 0.003 + vanishProgress * 0.014;

    return {
      alpha: progress >= 1 ? 0 : alpha,
      scale: scale,
      offsetX: (0.40 - 0.5) * driftStrength,
      offsetY: -driftStrength * 0.2,
      progress: progress,
      flare: flare
    };
  }

  drawImperialWarpExitEffect(ctx, unit, width, height, warpExitState) {
    const x = (unit.x + warpExitState.offsetX) * width;
    const y = (unit.y + warpExitState.offsetY) * height;
    const unitSize = (unit.size || 0.045) * width;
    const warpRadius = unitSize * (0.9 + warpExitState.progress * 1.7 + warpExitState.flare * 0.35);
    const flareAlpha = Math.max(0, Math.min(1, 0.14 + warpExitState.flare * 0.55 + (1 - warpExitState.alpha) * 0.2));
    const streakAlpha = Math.max(0, Math.min(1, 0.08 + warpExitState.progress * 0.24));

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, warpRadius * 2.1);
    glowGradient.addColorStop(0, "rgba(255, 255, 255, " + (flareAlpha * 0.85) + ")");
    glowGradient.addColorStop(0.22, "rgba(255, 210, 160, " + (flareAlpha * 0.8) + ")");
    glowGradient.addColorStop(0.58, "rgba(120, 220, 255, " + (flareAlpha * 0.34) + ")");
    glowGradient.addColorStop(1, "rgba(120, 220, 255, 0)");
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, warpRadius * 2.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(180, 235, 255, " + (0.25 + flareAlpha * 0.55) + ")";
    ctx.lineWidth = 1.5 + flareAlpha * 2.6;
    ctx.beginPath();
    ctx.ellipse(x, y, warpRadius * 1.15, warpRadius * 0.62, -0.16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 170, 120, " + (0.18 + flareAlpha * 0.42) + ")";
    ctx.lineWidth = 1 + flareAlpha * 1.8;
    ctx.beginPath();
    ctx.ellipse(x, y, warpRadius * 0.82, warpRadius * 0.38, -0.16, 0, Math.PI * 2);
    ctx.stroke();

    const streakLength = warpRadius * (1.2 + warpExitState.progress * 1.6);
    ctx.strokeStyle = "rgba(220, 245, 255, " + streakAlpha + ")";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i += 1) {
      const streakOffset = (i - 1) * warpRadius * 0.2;
      ctx.beginPath();
      ctx.moveTo(x - streakLength * 0.9, y + streakOffset);
      ctx.lineTo(x + streakLength * 0.28, y + streakOffset * 0.4);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawSuperweaponDebris(ctx, superweaponUnit, width, height, alpha) {
    const x = superweaponUnit.x * width;
    const y = superweaponUnit.y * height;
    const torusSize = (superweaponUnit.heightScale || 0.675) * height;
    const pieces = [
      { dx: -torusSize * 0.1, dy: -torusSize * 0.16, w: 18, h: 8, r: -0.7 },
      { dx: torusSize * 0.02, dy: -torusSize * 0.22, w: 14, h: 6, r: 0.4 },
      { dx: torusSize * 0.12, dy: -torusSize * 0.08, w: 20, h: 9, r: 0.9 },
      { dx: -torusSize * 0.16, dy: torusSize * 0.04, w: 16, h: 7, r: 0.2 },
      { dx: torusSize * 0.08, dy: torusSize * 0.12, w: 22, h: 10, r: -0.5 },
      { dx: -torusSize * 0.02, dy: torusSize * 0.2, w: 12, h: 6, r: 1.2 }
    ];

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    for (let i = 0; i < pieces.length; i += 1) {
      const piece = pieces[i];
      ctx.save();
      ctx.translate(x + piece.dx, y + piece.dy);
      ctx.rotate(piece.r);
      const gradient = ctx.createLinearGradient(-piece.w / 2, -piece.h / 2, piece.w / 2, piece.h / 2);
      gradient.addColorStop(0, "#141922");
      gradient.addColorStop(0.45, "#6d7686");
      gradient.addColorStop(1, "#242a35");
      ctx.fillStyle = gradient;
      ctx.strokeStyle = "rgba(220, 228, 242, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      ctx.strokeRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      ctx.restore();
    }
    ctx.restore();
  }

  getEffectElapsedMs(frameIndex, introFrameIndex, activatedAt, fastForwardMs) {
    const liveElapsedMs = Date.now() - activatedAt;
    if (frameIndex > introFrameIndex) {
      return fastForwardMs + liveElapsedMs;
    }
    return liveElapsedMs;
  }

  isHorseUnit(unit) {
    return unit && unit.label === "UHF1" && unit.subLabel === "Horse";
  }

  isMercyUnit(unit) {
    return unit && unit.label === "UHFA" && unit.subLabel === "Mercy";
  }

  isCashmoneyUnit(unit) {
    return unit && unit.label === "UHFA" && unit.subLabel === "Cashmoney";
  }

  isWarpBeamSourceEdmond(unit) {
    return unit && unit.group === "edmond" && Math.abs(unit.x - 0.34) < 0.005 && Math.abs(unit.y - 0.82) < 0.005;
  }

  getWarpBeamSourceUnit(frameState) {
    return frameState.units.find(unit => this.isWarpBeamSourceEdmond(unit)) || null;
  }

  getWarpBeamTargetUnit(frameState) {
    return frameState.units.find(unit => unit.label === "OKO" && unit.subLabel === "Okoth") || null;
  }

  getHorseReferenceUnit(frameState) {
    const frameHorse = frameState.units.find(unit => this.isHorseUnit(unit));
    if (frameHorse) {
      return frameHorse;
    }
    const frameFive = this.battleFrames[5];
    if (!frameFive || !Array.isArray(frameFive.units)) {
      return null;
    }
    return frameFive.units.find(unit => this.isHorseUnit(unit)) || null;
  }

  getMercyReferenceUnit(frameState) {
    const frameMercy = frameState.units.find(unit => this.isMercyUnit(unit));
    if (frameMercy) {
      return frameMercy;
    }
    return this.getMercyFrameUnit(9);
  }

  getMercyFrameUnit(frameIndex) {
    const frame = this.battleFrames[frameIndex];
    if (!frame || !Array.isArray(frame.units)) {
      return null;
    }
    return frame.units.find(unit => this.isMercyUnit(unit)) || null;
  }

  getCashmoneyReferenceUnit(frameIndex) {
    const frame = this.battleFrames[frameIndex];
    if (!frame || !Array.isArray(frame.units)) {
      return null;
    }
    return frame.units.find(unit => this.isCashmoneyUnit(unit)) || null;
  }

  getEdmondAmbushAlpha(unitIndex, ambushElapsedMs, fadeInMs, time) {
    const seed = (unitIndex + 1) * 1.713;
    const introDelayMs = 120 + ((unitIndex * 173) % 620);
    const introElapsedMs = ambushElapsedMs - introDelayMs;
    if (introElapsedMs <= 0) {
      return 0;
    }

    const introAlpha = Math.max(0, Math.min(1, introElapsedMs / fadeInMs));
    const noise = Math.sin(time * 1.2 + seed) + 0.45 * Math.sin(time * 2.3 + seed * 2.1);
    const randomAlpha = Math.max(0, Math.min(1, (noise + 0.85) / 1.55));
    return introElapsedMs < fadeInMs
      ? Math.max(introAlpha, randomAlpha * introAlpha)
      : randomAlpha;
  }

  getEffectElapsedMsAt(frameIndex, introFrameIndex, activatedAt, fastForwardMs, timestamp) {
    const liveElapsedMs = timestamp - activatedAt;
    if (frameIndex > introFrameIndex) {
      return fastForwardMs + liveElapsedMs;
    }
    return liveElapsedMs;
  }

  getEdmondFrameUnits(frameIndex) {
    const frame = this.battleFrames[frameIndex];
    if (!frame || !Array.isArray(frame.units)) {
      return [];
    }
    return frame.units.filter(unit => unit && unit.group === "edmond" && !unit.destroyed);
  }

  getEdmondTargetAlpha(frameIndex, unitIndex, timestamp, activatedAt) {
    if (frameIndex < 3) {
      return 0;
    }
    if (frameIndex >= 14) {
      return 1;
    }

    const waitMs = 1400;
    const fadeInMs = 900;
    const elapsedSinceFrameActivation = this.getEffectElapsedMsAt(
      frameIndex,
      3,
      activatedAt,
      waitMs + fadeInMs + 3500,
      timestamp
    );
    if (elapsedSinceFrameActivation < waitMs) {
      return 0;
    }

    const ambushElapsedMs = elapsedSinceFrameActivation - waitMs;
    const time = ambushElapsedMs / 1000;
    return this.getEdmondAmbushAlpha(unitIndex, ambushElapsedMs, fadeInMs, time);
  }

  captureEdmondTransitionState(frameIndex, timestamp) {
    const edmondUnits = this.getEdmondFrameUnits(frameIndex);
    this.edmondTransitionFrom = edmondUnits.map((unit, unitIndex) =>
      this.getEdmondTargetAlpha(frameIndex, unitIndex, timestamp, this.frameActivatedAt)
    );
    this.edmondTransitionStartedAt = timestamp;
  }

  getSmoothedEdmondAlpha(frameIndex, unitIndex, targetAlpha) {
    if (!this.edmondTransitionFrom || frameIndex < 3) {
      return targetAlpha;
    }

    const startAlpha = typeof this.edmondTransitionFrom[unitIndex] === "number"
      ? this.edmondTransitionFrom[unitIndex]
      : 0;
    const elapsedMs = Date.now() - this.edmondTransitionStartedAt;
    const progress = Math.max(0, Math.min(1, elapsedMs / this.animationDuration));
    if (progress >= 1) {
      return targetAlpha;
    }
    return this.lerp(startAlpha, targetAlpha, this.easeInOut(progress));
  }

  drawSuperweaponBeam(ctx, superweaponUnit, horseUnit, width, height, intensity, straight) {
    const torusSize = (superweaponUnit.heightScale || 0.675) * height;
    const sourceX = superweaponUnit.x * width + torusSize * 0.18;
    const sourceY = superweaponUnit.y * height - torusSize * 0.02;
    const targetX = horseUnit.x * width;
    const targetY = horseUnit.y * height;
    const controlX = sourceX + (targetX - sourceX) * 0.48;
    const controlY = sourceY + (targetY - sourceY) * 0.08 - 10;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = "rgba(110, 210, 255, " + (0.18 + intensity * 0.18) + ")";
    ctx.lineWidth = 26 + intensity * 14;
    ctx.beginPath();
    ctx.moveTo(sourceX, sourceY);
    if (straight) {
      ctx.lineTo(targetX, targetY);
    } else {
      ctx.quadraticCurveTo(controlX, controlY, targetX, targetY);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(160, 120, 255, " + (0.22 + intensity * 0.24) + ")";
    ctx.lineWidth = 14 + intensity * 8;
    ctx.beginPath();
    ctx.moveTo(sourceX, sourceY);
    if (straight) {
      ctx.lineTo(targetX, targetY);
    } else {
      ctx.quadraticCurveTo(controlX, controlY, targetX, targetY);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(245, 250, 255, " + (0.42 + intensity * 0.36) + ")";
    ctx.lineWidth = 6 + intensity * 5;
    ctx.beginPath();
    ctx.moveTo(sourceX, sourceY);
    if (straight) {
      ctx.lineTo(targetX, targetY);
    } else {
      ctx.quadraticCurveTo(controlX, controlY, targetX, targetY);
    }
    ctx.stroke();

    const muzzleGlow = ctx.createRadialGradient(sourceX, sourceY, 0, sourceX, sourceY, 34 + intensity * 18);
    muzzleGlow.addColorStop(0, "rgba(255, 245, 225, 0.95)");
    muzzleGlow.addColorStop(0.28, "rgba(168, 224, 255, 0.8)");
    muzzleGlow.addColorStop(1, "rgba(168, 224, 255, 0)");
    ctx.fillStyle = muzzleGlow;
    ctx.beginPath();
    ctx.arc(sourceX, sourceY, 34 + intensity * 18, 0, Math.PI * 2);
    ctx.fill();

    const impactGlow = ctx.createRadialGradient(targetX, targetY, 0, targetX, targetY, 28 + intensity * 20);
    impactGlow.addColorStop(0, "rgba(255, 252, 240, 0.95)");
    impactGlow.addColorStop(0.35, "rgba(255, 190, 140, 0.82)");
    impactGlow.addColorStop(1, "rgba(255, 190, 140, 0)");
    ctx.fillStyle = impactGlow;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 28 + intensity * 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawWarpDottedLine(ctx, fromUnit, toUnit, width, height) {
    const fromX = fromUnit.x * width;
    const fromY = fromUnit.y * height;
    const toX = toUnit.x * width;
    const toY = toUnit.y * height;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const steps = 10;

    ctx.save();
    for (let i = 0; i <= steps; i += 1) {
      const progress = i / steps;
      const x = fromX + dx * progress;
      const y = fromY + dy * progress;
      const radius = i % 2 === 0 ? 3 : 2;
      ctx.fillStyle = i % 2 === 0 ? "rgba(210, 240, 255, 0.9)" : "rgba(150, 200, 255, 0.55)";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawRedirectBeam(ctx, fromUnit, toUnit, width, height, intensity) {
    const fromX = fromUnit.x * width;
    const fromY = fromUnit.y * height;
    const toX = toUnit.x * width;
    const toY = toUnit.y * height;

    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255, 196, 120, " + (0.2 + intensity * 0.28) + ")";
    ctx.lineWidth = 8 + intensity * 4;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 245, 220, " + (0.45 + intensity * 0.35) + ")";
    ctx.lineWidth = 3 + intensity * 2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.restore();
  }

  drawEdmondExplosion(ctx, unit, width, height, progress, alpha) {
    const x = unit.x * width;
    const y = unit.y * height;
    const radius = 8 + progress * 18;
    const fade = Math.max(0, (1 - progress) * alpha);

    ctx.save();
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, "rgba(255, 248, 236, " + (0.95 * fade) + ")");
    glow.addColorStop(0.35, "rgba(255, 170, 110, " + (0.72 * fade) + ")");
    glow.addColorStop(1, "rgba(255, 170, 110, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawHorseExplosion(ctx, horseUnit, width, height, progress, afterglow) {
    const x = horseUnit.x * width;
    const y = horseUnit.y * height;
    const blastRadius = 12 + progress * 34;
    const coreRadius = 6 + progress * 14;
    const fade = (1 - progress) * afterglow;

    ctx.save();
    const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, blastRadius);
    outerGlow.addColorStop(0, "rgba(255, 252, 235, " + (0.92 * fade) + ")");
    outerGlow.addColorStop(0.24, "rgba(255, 200, 130, " + (0.85 * fade) + ")");
    outerGlow.addColorStop(0.55, "rgba(255, 114, 72, " + (0.55 * fade) + ")");
    outerGlow.addColorStop(1, "rgba(255, 114, 72, 0)");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(x, y, blastRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 248, 235, " + (0.95 * fade) + ")";
    ctx.beginPath();
    ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 214, 170, " + (0.75 * fade) + ")";
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 7; i += 1) {
      const angle = -0.7 + i * 0.92;
      const inner = 8 + progress * 6;
      const outer = 20 + progress * 28 + (i % 2) * 5;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
      ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawProjectileSet(ctx, fromUnits, toUnits, width, height, options) {
    ctx.save();
    for (let i = 0; i < fromUnits.length; i += 1) {
      const fromUnit = fromUnits[i];
      const sourceSeedBase = typeof fromUnit.projectileSeed === "number"
        ? fromUnit.projectileSeed * 11
        : i * 11;
      for (let shot = 0; shot < 3; shot += 1) {
        const shotSeed = options.seedOffset + sourceSeedBase + shot * 17;
        const toUnit = toUnits[(sourceSeedBase + shot) % toUnits.length];
        this.drawProjectile(ctx, fromUnit, toUnit, width, height, shotSeed, options);
      }
    }
    ctx.restore();
  }

  drawProjectileAftermathSet(ctx, fromUnits, toUnits, width, height, options) {
    ctx.save();
    for (let i = 0; i < fromUnits.length; i += 1) {
      const fromUnit = fromUnits[i];
      const sourceSeedBase = typeof fromUnit.projectileSeed === "number"
        ? fromUnit.projectileSeed * 11
        : i * 11;
      for (let shot = 0; shot < 2; shot += 1) {
        const shotSeed = options.seedOffset + sourceSeedBase + shot * 17;
        const toUnit = toUnits[(sourceSeedBase + shot) % toUnits.length];
        this.drawAftermathProjectile(ctx, fromUnit, toUnit, width, height, shotSeed, options);
      }
    }
    ctx.restore();
  }

  drawProjectile(ctx, fromUnit, toUnit, width, height, seed, options) {
    const fromX = fromUnit.x * width;
    const fromY = fromUnit.y * height;
    const toX = toUnit.x * width;
    const toY = toUnit.y * height;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const travelMs = 6200;
    const launchOffsetMs = (seed % 11) * 220;
    const cycleElapsedMs = options.startFromOrigin
      ? options.combatElapsedMs - launchOffsetMs
      : (options.combatElapsedMs + launchOffsetMs);
    if (cycleElapsedMs < 0) {
      return;
    }
    const progress = Math.max(0, Math.min(1, (cycleElapsedMs % travelMs) / travelMs));
    const arcHeight = ((seed % 2 === 0) ? -1 : 1) * (10 + (seed % 4) * 4);
    const lateralOffset = ((seed % 5) - 2) * 3;
    const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const normalX = -dy / length;
    const normalY = dx / length;
    const baseX = fromX + dx * progress;
    const baseY = fromY + dy * progress;
    const curve = Math.sin(progress * Math.PI);
    const x = baseX + normalX * (lateralOffset + curve * 2);
    const y = baseY + normalY * (lateralOffset + curve * arcHeight);
    const radius = 1.8 + (seed % 3) * 0.65;
    const projectileAlpha = typeof fromUnit.projectileAlpha === "number" ? fromUnit.projectileAlpha : 1;

    ctx.fillStyle = this.applyProjectileAlpha(options.trailColor, projectileAlpha);
    ctx.beginPath();
    const trailProgress = Math.max(0, progress - 0.04);
    const trailCurve = Math.sin(trailProgress * Math.PI);
    ctx.arc(
      fromX + dx * trailProgress + normalX * (lateralOffset + trailCurve * 2),
      fromY + dy * trailProgress + normalY * (lateralOffset + trailCurve * arcHeight),
      radius * 1.8,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = this.applyProjectileAlpha(options.color, projectileAlpha);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawAftermathProjectile(ctx, fromUnit, toUnit, width, height, seed, options) {
    const fromX = fromUnit.x * width;
    const fromY = fromUnit.y * height;
    const toX = toUnit.x * width;
    const toY = toUnit.y * height;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const travelMs = 1700;
    const initialProgress = 0.18 + ((seed % 7) * 0.1);
    const progress = initialProgress + (options.elapsedMs / travelMs);
    if (progress >= 1) {
      return;
    }

    const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const normalX = -dy / length;
    const normalY = dx / length;
    const arcHeight = ((seed % 2 === 0) ? -1 : 1) * (10 + (seed % 4) * 4);
    const lateralOffset = ((seed % 5) - 2) * 3;
    const baseX = fromX + dx * progress;
    const baseY = fromY + dy * progress;
    const curve = Math.sin(progress * Math.PI);
    const x = baseX + normalX * (lateralOffset + curve * 2);
    const y = baseY + normalY * (lateralOffset + curve * arcHeight);
    const radius = 1.8 + (seed % 3) * 0.65;
    const projectileAlpha = Math.max(0, options.fade * (1 - progress * 0.45));

    ctx.fillStyle = this.applyProjectileAlpha(options.trailColor, projectileAlpha);
    ctx.beginPath();
    const trailProgress = Math.max(0, progress - 0.05);
    const trailCurve = Math.sin(trailProgress * Math.PI);
    ctx.arc(
      fromX + dx * trailProgress + normalX * (lateralOffset + trailCurve * 2),
      fromY + dy * trailProgress + normalY * (lateralOffset + trailCurve * arcHeight),
      radius * 1.8,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = this.applyProjectileAlpha(options.color, projectileAlpha);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  applyProjectileAlpha(color, alphaMultiplier) {
    if (typeof color !== "string" || color.indexOf("rgba(") !== 0) {
      return color;
    }
    const match = color.match(/^rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)$/);
    if (!match) {
      return color;
    }
    const baseAlpha = Number(match[4]);
    const alpha = Math.max(0, Math.min(1, baseAlpha * alphaMultiplier));
    return "rgba(" + match[1] + "," + match[2] + "," + match[3] + "," + alpha + ")";
  }

  drawBackdropGrid(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i += 1) {
      const x = (width / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, 16);
      ctx.lineTo(x, height - 16);
      ctx.stroke();
    }
    for (let i = 1; i < 5; i += 1) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(16, y);
      ctx.lineTo(width - 16, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawUnit(ctx, unit, width, height) {
    const x = unit.x * width;
    const y = unit.y * height;
    const alpha = typeof unit.alpha === "number" ? unit.alpha : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (this.shouldSkipBaseUnitDraw(unit)) {
      ctx.restore();
      return;
    }

    if (unit.kind === "superweapon") {
      const torusSize = (unit.heightScale || 0.675) * height;
      const outerRx = torusSize * 0.30;
      const outerRy = torusSize * 0.22;
      const innerRx = outerRx * 0.46;
      const innerRy = outerRy * 0.42;
      const rotation = -0.32;
      const labelY = y + torusSize * 0.36;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      const haloGradient = ctx.createRadialGradient(0, 0, innerRx * 0.3, 0, 0, outerRx * 1.45);
      haloGradient.addColorStop(0, "rgba(255, 175, 110, 0.24)");
      haloGradient.addColorStop(0.42, "rgba(132, 214, 255, 0.14)");
      haloGradient.addColorStop(1, "rgba(132, 214, 255, 0)");
      ctx.fillStyle = haloGradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, outerRx * 1.35, outerRy * 1.28, 0, 0, Math.PI * 2);
      ctx.fill();

      const outerShellGradient = ctx.createLinearGradient(-outerRx, -outerRy, outerRx, outerRy);
      outerShellGradient.addColorStop(0, "#1d2430");
      outerShellGradient.addColorStop(0.18, "#5a6677");
      outerShellGradient.addColorStop(0.36, "#cbd7ea");
      outerShellGradient.addColorStop(0.52, "#7b879b");
      outerShellGradient.addColorStop(0.7, "#2c3341");
      outerShellGradient.addColorStop(1, "#0e131d");
      ctx.fillStyle = outerShellGradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, outerRx, outerRy, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(224, 233, 255, 0.75)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, outerRx, outerRy, 0, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 6; i += 1) {
        const angle = -Math.PI / 2 + i * (Math.PI / 3);
        const segmentX = Math.cos(angle) * outerRx * 0.92;
        const segmentY = Math.sin(angle) * outerRy * 0.92;
        ctx.save();
        ctx.translate(segmentX, segmentY);
        ctx.rotate(angle);
        const finGradient = ctx.createLinearGradient(-8, 0, 14, 0);
        finGradient.addColorStop(0, "#0b1018");
        finGradient.addColorStop(0.5, "#8c97aa");
        finGradient.addColorStop(1, "#202733");
        ctx.fillStyle = finGradient;
        ctx.beginPath();
        ctx.moveTo(-8, -7);
        ctx.lineTo(14, -3);
        ctx.lineTo(14, 3);
        ctx.lineTo(-8, 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.ellipse(0, 0, innerRx, innerRy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      ctx.strokeStyle = "rgba(240, 246, 255, 0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, innerRx, innerRy, 0, 0, Math.PI * 2);
      ctx.stroke();

      const trenchGradient = ctx.createLinearGradient(-innerRx, 0, innerRx, 0);
      trenchGradient.addColorStop(0, "rgba(62, 86, 126, 0)");
      trenchGradient.addColorStop(0.5, "rgba(122, 196, 255, 0.85)");
      trenchGradient.addColorStop(1, "rgba(62, 86, 126, 0)");
      ctx.strokeStyle = trenchGradient;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 0, innerRx * 0.78, innerRy * 0.72, 0, 0.12, Math.PI - 0.12);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 202, 140, 0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, outerRx * 0.72, outerRy * 0.54, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();

      const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRx * 0.95);
      coreGradient.addColorStop(0, "rgba(255, 248, 208, 1)");
      coreGradient.addColorStop(0.16, "rgba(190, 255, 255, 0.96)");
      coreGradient.addColorStop(0.42, "rgba(114, 203, 255, 0.82)");
      coreGradient.addColorStop(0.68, "rgba(137, 93, 255, 0.38)");
      coreGradient.addColorStop(1, "rgba(137, 93, 255, 0)");
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, innerRx * 0.86, innerRy * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-innerRx * 0.66, 0);
      ctx.lineTo(innerRx * 0.66, 0);
      ctx.moveTo(0, -innerRy * 0.62);
      ctx.lineTo(0, innerRy * 0.62);
      ctx.stroke();

      ctx.restore();

      ctx.fillStyle = "#f6f3ea";
      ctx.font = "600 15px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(unit.label || "Antimatter Superweapon", x, labelY);
      ctx.restore();
      return;
    }

    if (unit.kind === "planet") {
      const radius = (unit.size || 0.1) * Math.min(width, height);
      const gradient = ctx.createRadialGradient(x - radius * 0.25, y - radius * 0.25, radius * 0.2, x, y, radius);
      gradient.addColorStop(0, "#f1d279");
      gradient.addColorStop(0.4, "#c28a3a");
      gradient.addColorStop(1, "#5a2d10");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 240, 200, 0.75)";
      ctx.stroke();
      ctx.fillStyle = "#f6f3ea";
      ctx.font = "600 13px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(unit.label || "Zeus", x, y + radius + 18);
      ctx.restore();
      return;
    }

    const size = (unit.size || 0.045) * Math.min(width, height);
    ctx.fillStyle = unit.fill || "#8db3ff";
    ctx.strokeStyle = unit.stroke || "#dfe8ff";
    ctx.lineWidth = 2;
    if (unit.shape === "triangle") {
      ctx.beginPath();
      ctx.moveTo(x, y - size / 2);
      ctx.lineTo(x + size / 2, y + size / 2);
      ctx.lineTo(x - size / 2, y + size / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
      ctx.strokeRect(x - size / 2, y - size / 2, size, size);
    }

    ctx.fillStyle = "#f8fbff";
    ctx.textAlign = "left";
    ctx.font = "600 12px Georgia, serif";
    if (unit.label) {
      ctx.fillText(unit.label, x + size / 2 + 8, y - 2);
    }
    if (unit.subLabel) {
      ctx.font = "11px Georgia, serif";
      ctx.fillStyle = "rgba(248, 251, 255, 0.85)";
      ctx.fillText(unit.subLabel, x + size / 2 + 8, y + 12);
    }
    ctx.restore();
  }

  shouldSkipBaseUnitDraw(unit) {
    if (unit && unit.forceDraw) {
      return false;
    }
    return (this.targetFrameIndex === 6 && this.isHorseUnit(unit))
      || (this.targetFrameIndex === 9 && this.isMercyUnit(unit))
      || (this.targetFrameIndex === 10 && (this.isMercyUnit(unit) || this.isCashmoneyUnit(unit)))
      || (this.targetFrameIndex === 11 && this.isCashmoneyUnit(unit))
      || (this.targetFrameIndex === 14 && unit && unit.shape === "triangle");
  }

  updateControls() {
    if (!this.ui) {
      return;
    }

    const maxUnlockedFrame = this.getMaxUnlockedFrame();
    const current = this.targetFrameIndex;
    this.ui.firstButton.disabled = current <= 0;
    this.ui.prevButton.disabled = current <= 0;
    this.ui.nextButton.disabled = current >= maxUnlockedFrame;
    this.ui.lastButton.disabled = current >= maxUnlockedFrame;
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.ZeusBattleProject = ZeusBattleProject;
}

if (typeof module !== "undefined") {
  module.exports = ZeusBattleProject;
}
