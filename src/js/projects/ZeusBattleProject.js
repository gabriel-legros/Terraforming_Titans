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

    if (boundedFrame === this.targetFrameIndex && !this.isAnimating()) {
      this.drawBattleFrame();
      this.updateControls();
      return;
    }

    this.targetFrameIndex = boundedFrame;
    this.frameActivatedAt = Date.now();
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
    this.animationProgress = 0;
    this.animationStartTime = 0;
    this.startAnimation();
    this.updateControls();
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
      units: units
    };
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
      this.drawEdmondAmbush(ctx, frameState, width, height);
      return;
    }
  }

  drawPrimaryBattleExchange(ctx, frameState, width, height) {
    const enemyUnits = frameState.units.filter(unit => unit.shape === "triangle");
    const alliedUnits = frameState.units.filter(unit => unit.kind !== "planet" && unit.shape !== "triangle" && unit.group !== "edmond");
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
    const elapsedSinceFrameActivation = Date.now() - this.primaryBattleActivatedAt;
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
    const elapsedSinceFrameActivation = Date.now() - this.frameActivatedAt;
    if (elapsedSinceFrameActivation < waitMs) {
      return;
    }

    const ambushElapsedMs = elapsedSinceFrameActivation - waitMs;
    const time = ambushElapsedMs / 1000;
    const visibleUnits = [];
    const firingUnits = [];
    for (let i = 0; i < edmondUnits.length; i += 1) {
      const unit = edmondUnits[i];
      const seed = (i + 1) * 1.713;
      const introDelayMs = 120 + ((i * 173) % 620);
      const introElapsedMs = ambushElapsedMs - introDelayMs;
      let alpha = 0;

      if (introElapsedMs > 0) {
        const introAlpha = Math.max(0, Math.min(1, introElapsedMs / fadeInMs));
        const noise = Math.sin(time * 1.2 + seed) + 0.45 * Math.sin(time * 2.3 + seed * 2.1);
        const randomAlpha = Math.max(0, Math.min(1, (noise + 0.85) / 1.55));
        alpha = introElapsedMs < fadeInMs
          ? Math.max(introAlpha, randomAlpha * introAlpha)
          : randomAlpha;
      }

      if (alpha > 0.08) {
        this.drawUnit(ctx, { ...unit, alpha: alpha }, width, height);
        firingUnits.push({
          ...unit,
          projectileAlpha: Math.max(0.25, alpha),
          projectileSeed: i
        });
      }
      if (alpha > 0.45) {
        visibleUnits.push({ ...unit, alpha: alpha });
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
