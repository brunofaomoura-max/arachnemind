/**
 * ARACHNEMIND - SPIDER OVERLAY ENGINE (spider-overlay.js)
 * Motor Gráfico HTML5 Canvas com Cinemática Inversa (2-Bone IK),
 * DOM Raycasting em Tempo Real, Simulação de Digitação/Clique e Efeitos Visuais.
 */
(function () {
  if (window.__ARACHNEMIND_INJECTED__) return;
  window.__ARACHNEMIND_INJECTED__ = true;

  const CONFIG = {
    legCount: 8,
    femurLength: 52,
    tibiaLength: 68,
    stepTriggerDist: 65,
    stepDurationMs: 185,
    stepArcHeight: 32,
    bodySpring: 0.065,
    bodyDamping: 0.78,
    domScanIntervalMs: 300,
    colors: {
      wireframePrimary: '#00f3ff',
      wireframeSecondary: '#a855f7',
      coreGlow: '#ff007f',
      jointFill: '#08101e',
      footAnchor: '#10b981',
      beamScan: '#00f3ff',
      beamExtract: '#f43f5e',
      beamConfirm: '#10b981',
      beamClick: '#facc15',
      beamPrice: '#10b981',
      beamBestDeal: '#facc15'
    }
  };

  const state = {
    canvas: null,
    ctx: null,
    width: window.innerWidth,
    height: window.innerHeight,
    statusText: 'ARACHNEMIND // AUTONOMOUS SPIDER ONLINE',
    actionBadge: 'IDLE',
    body: {
      x: window.scrollX + window.innerWidth * 0.5,
      y: window.scrollY + window.innerHeight * 0.35,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      targetX: window.scrollX + window.innerWidth * 0.5,
      targetY: window.scrollY + window.innerHeight * 0.35,
      targetAngle: -Math.PI / 2,
      breathPhase: 0
    },
    legs: [],
    domPlatforms: [],
    beams: [],
    highlights: [],
    pulses: [],
    trail: [],
    magnifier: null,
    lastDomScan: 0,
    lastFrameTime: performance.now()
  };

  const LEG_SPECS = [
    { side: -1, mountAngle: -1.05, restAngle: -1.15, restReach: 82, gaitGroup: 0 },
    { side: -1, mountAngle: -1.42, restAngle: -1.52, restReach: 92, gaitGroup: 1 },
    { side: -1, mountAngle: -1.78, restAngle: -1.86, restReach: 92, gaitGroup: 0 },
    { side: -1, mountAngle: -2.15, restAngle: -2.25, restReach: 84, gaitGroup: 1 },
    { side:  1, mountAngle:  1.05, restAngle:  1.15, restReach: 82, gaitGroup: 1 },
    { side:  1, mountAngle:  1.42, restAngle:  1.52, restReach: 92, gaitGroup: 0 },
    { side:  1, mountAngle:  1.78, restAngle:  1.86, restReach: 92, gaitGroup: 1 },
    { side:  1, mountAngle:  2.15, restAngle:  2.25, restReach: 84, gaitGroup: 0 }
  ];

  function initLegs() {
    state.legs = LEG_SPECS.map((spec, idx) => {
      const worldAngle = state.body.angle + spec.restAngle;
      const footX = state.body.x + Math.cos(worldAngle) * spec.restReach;
      const footY = state.body.y + Math.sin(worldAngle) * spec.restReach;
      return {
        index: idx,
        spec,
        hipX: state.body.x,
        hipY: state.body.y,
        kneeX: (state.body.x + footX) / 2,
        kneeY: (state.body.y + footY) / 2,
        footX,
        footY,
        stepStartX: footX,
        stepStartY: footY,
        stepTargetX: footX,
        stepTargetY: footY,
        stepProgress: 1,
        stepStartTime: 0,
        anchoredElementTag: null
      };
    });
  }

  function mountOverlay() {
    if (!document.body) {
      requestAnimationFrame(mountOverlay);
      return;
    }

    if (document.getElementById('arachnemind-canvas-overlay')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'arachnemind-injected-styles';
    styleEl.textContent = `
      html.arachnemind-contrast-mode {
        scroll-behavior: smooth;
      }
      #arachnemind-canvas-overlay {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
        background: radial-gradient(circle at center, rgba(6, 11, 25, 0.04) 0%, rgba(2, 6, 17, 0.24) 100%);
      }
    `;
    (document.head || document.documentElement).appendChild(styleEl);
    document.documentElement.classList.add('arachnemind-contrast-mode');

    const canvas = document.createElement('canvas');
    canvas.id = 'arachnemind-canvas-overlay';
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    document.documentElement.appendChild(canvas);

    state.canvas = canvas;
    state.ctx = canvas.getContext('2d');
    state.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    window.addEventListener('resize', handleResize, { passive: true });
  }

  function handleResize() {
    if (!state.canvas) return;
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.canvas.width = state.width * window.devicePixelRatio;
    state.canvas.height = state.height * window.devicePixelRatio;
    state.ctx.setTransform(1, 0, 0, 1, 0, 0);
    state.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  function scanDomPlatforms() {
    const selectors = 'input, textarea, button, a, span, p, h1, h2, h3, li, td';
    const elements = document.querySelectorAll(selectors);
    const platforms = [];
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (el.id === 'arachnemind-canvas-overlay') continue;
      const rect = el.getBoundingClientRect();

      if (
        rect.width < 12 ||
        rect.height < 10 ||
        rect.bottom < -120 ||
        rect.top > vh + 120 ||
        rect.right < -120 ||
        rect.left > vw + 120
      ) {
        continue;
      }

      platforms.push({
        left: rect.left + scrollX,
        top: rect.top + scrollY,
        right: rect.right + scrollX,
        bottom: rect.bottom + scrollY,
        width: rect.width,
        height: rect.height,
        cx: rect.left + scrollX + rect.width / 2,
        cy: rect.top + scrollY + rect.height / 2,
        tag: el.tagName.toLowerCase()
      });

      if (platforms.length >= 240) break;
    }

    state.domPlatforms = platforms;
  }

  function findBestDomFoothold(idealX, idealY, maxSnapRadius = 56) {
    let bestPoint = { x: idealX, y: idealY, tag: null, snapped: false };
    let minScore = maxSnapRadius;

    for (let i = 0; i < state.domPlatforms.length; i++) {
      const box = state.domPlatforms[i];
      const clampedX = Math.max(box.left, Math.min(idealX, box.right));
      const clampedY = Math.max(box.top, Math.min(idealY, box.bottom));

      let edgeX = clampedX;
      let edgeY = clampedY;

      const inside =
        idealX >= box.left &&
        idealX <= box.right &&
        idealY >= box.top &&
        idealY <= box.bottom;

      if (inside) {
        const dTop = Math.abs(idealY - box.top);
        const dBottom = Math.abs(box.bottom - idealY);
        const dLeft = Math.abs(idealX - box.left);
        const dRight = Math.abs(box.right - idealX);
        const m = Math.min(dTop, dBottom, dLeft, dRight);
        if (m === dTop) edgeY = box.top;
        else if (m === dBottom) edgeY = box.bottom;
        else if (m === dLeft) edgeX = box.left;
        else edgeX = box.right;
      }

      const dist = Math.hypot(edgeX - idealX, edgeY - idealY);
      if (dist < minScore) {
        minScore = dist;
        bestPoint = {
          x: edgeX,
          y: edgeY,
          tag: box.tag,
          snapped: true
        };
      }
    }

    return bestPoint;
  }

  function solveTwoBoneIK(hipX, hipY, footX, footY, L1, L2, bendDirection) {
    const dx = footX - hipX;
    const dy = footY - hipY;
    const rawDist = Math.hypot(dx, dy);
    const maxReach = (L1 + L2) * 0.992;
    const minReach = Math.abs(L1 - L2) + 4;
    const d = Math.max(minReach, Math.min(maxReach, rawDist));

    const baseAngle = Math.atan2(dy, dx);
    const cosAngle = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    const elbowAngle = Math.acos(clampedCos);

    const finalAngle = baseAngle + bendDirection * elbowAngle;
    return {
      kneeX: hipX + Math.cos(finalAngle) * L1,
      kneeY: hipY + Math.sin(finalAngle) * L1
    };
  }

  function updateSpiderPhysics(now) {
    const b = state.body;
    b.breathPhase += 0.065;

    const dx = b.targetX - b.x;
    const dy = b.targetY - b.y;
    const distToTarget = Math.hypot(dx, dy);

    b.vx = (b.vx + dx * CONFIG.bodySpring) * CONFIG.bodyDamping;
    b.vy = (b.vy + dy * CONFIG.bodySpring) * CONFIG.bodyDamping;

    const speed = Math.hypot(b.vx, b.vy);
    const maxSpeed = 12;
    if (speed > maxSpeed) {
      b.vx = (b.vx / speed) * maxSpeed;
      b.vy = (b.vy / speed) * maxSpeed;
    }

    b.x += b.vx;
    b.y += b.vy;

    // Rastro de seda luminosa (Web Silk Trail)
    if (speed > 1.2) {
      const lastPoint = state.trail[state.trail.length - 1];
      if (!lastPoint || Math.hypot(b.x - lastPoint.x, b.y - lastPoint.y) > 14) {
        state.trail.push({ x: b.x, y: b.y, createdAt: now });
        if (state.trail.length > 45) state.trail.shift();
      }
    }

    if (distToTarget > 4) {
      b.targetAngle = Math.atan2(dy, dx);
    }
    let angleDiff = b.targetAngle - b.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    b.angle += angleDiff * 0.14;

    const groupStepping = { 0: false, 1: false };
    for (let i = 0; i < state.legs.length; i++) {
      if (state.legs[i].stepProgress < 1) {
        groupStepping[state.legs[i].spec.gaitGroup] = true;
      }
    }

    for (let i = 0; i < state.legs.length; i++) {
      const leg = state.legs[i];
      const spec = leg.spec;

      const hipMountRadius = 16;
      const mountWorldAngle = b.angle + spec.mountAngle;
      leg.hipX = b.x + Math.cos(mountWorldAngle) * hipMountRadius;
      leg.hipY = b.y + Math.sin(mountWorldAngle) * hipMountRadius;

      const restWorldAngle = b.angle + spec.restAngle;
      const velocityLeadX = b.vx * 3.8;
      const velocityLeadY = b.vy * 3.8;
      const idealFootX = b.x + Math.cos(restWorldAngle) * spec.restReach + velocityLeadX;
      const idealFootY = b.y + Math.sin(restWorldAngle) * spec.restReach + velocityLeadY;

      if (leg.stepProgress >= 1) {
        const distFromIdeal = Math.hypot(leg.footX - idealFootX, leg.footY - idealFootY);
        const oppositeGroup = spec.gaitGroup === 0 ? 1 : 0;
        const canStep = !groupStepping[oppositeGroup] || distFromIdeal > CONFIG.stepTriggerDist * 1.4;

        if (distFromIdeal > CONFIG.stepTriggerDist && canStep) {
          const domAnchor = findBestDomFoothold(idealFootX, idealFootY, 58);
          leg.stepStartX = leg.footX;
          leg.stepStartY = leg.footY;
          leg.stepTargetX = domAnchor.x;
          leg.stepTargetY = domAnchor.y;
          leg.anchoredElementTag = domAnchor.tag;
          leg.stepProgress = 0;
          leg.stepStartTime = now;
          groupStepping[spec.gaitGroup] = true;
        }
      } else {
        const elapsed = now - leg.stepStartTime;
        const t = Math.min(1, elapsed / CONFIG.stepDurationMs);
        const ease = t * t * (3 - 2 * t);
        const arcLift = Math.sin(t * Math.PI) * CONFIG.stepArcHeight;

        const stepDx = leg.stepTargetX - leg.stepStartX;
        const stepDy = leg.stepTargetY - leg.stepStartY;
        const stepLen = Math.hypot(stepDx, stepDy) || 1;
        const perpX = (-stepDy / stepLen) * spec.side;
        const perpY = (stepDx / stepLen) * spec.side;

        leg.footX = leg.stepStartX + stepDx * ease + perpX * arcLift * 0.45;
        leg.footY = leg.stepStartY + stepDy * ease - Math.abs(arcLift) * 0.75 + perpY * arcLift * 0.25;
        leg.stepProgress = t;

        if (t >= 1) {
          state.pulses.push({
            x: leg.footX,
            y: leg.footY,
            radius: 2,
            maxRadius: leg.anchoredElementTag ? 15 : 8,
            color: leg.anchoredElementTag ? CONFIG.colors.footAnchor : CONFIG.colors.wireframePrimary,
            alpha: 0.8
          });
        }
      }

      const bendDir = spec.side * (i % 2 === 0 ? 1 : 0.85);
      const ik = solveTwoBoneIK(
        leg.hipX,
        leg.hipY,
        leg.footX,
        leg.footY,
        CONFIG.femurLength,
        CONFIG.tibiaLength,
        bendDir
      );
      leg.kneeX = ik.kneeX;
      leg.kneeY = ik.kneeY;
    }
  }

  function renderFrame(now) {
    const ctx = state.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, state.width, state.height);

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // 0. Renderiza Fio de Seda Luminosa (Rastro de Caminhada da Aranha)
    if (state.trail.length > 1) {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < state.trail.length; i++) {
        const pt = state.trail[i];
        const sx = pt.x - scrollX;
        const sy = pt.y - scrollY;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.lineTo(state.body.x - scrollX, state.body.y - scrollY);
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
    }

    // 1. Renderiza sutis marcadores de ancoragem nas caixas DOM próximas à aranha
    ctx.save();
    for (let i = 0; i < state.domPlatforms.length; i++) {
      const p = state.domPlatforms[i];
      const dist = Math.hypot(p.cx - state.body.x, p.cy - state.body.y);
      if (dist < 240) {
        const alpha = (1 - dist / 240) * 0.26;
        ctx.strokeStyle = `rgba(0, 243, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(p.left - scrollX, p.top - scrollY, p.width, p.height);
      }
    }
    ctx.restore();

    // 2. Renderiza Highlights de elementos DOM escaneados
    for (let i = state.highlights.length - 1; i >= 0; i--) {
      const h = state.highlights[i];
      const age = now - h.createdAt;
      if (age >= h.duration) {
        state.highlights.splice(i, 1);
        continue;
      }
      const progress = age / h.duration;
      const alpha = Math.sin((1 - progress) * Math.PI * 0.5);

      const sx = h.x - scrollX;
      const sy = h.y - scrollY;

      ctx.save();
      ctx.strokeStyle = h.color;
      ctx.globalAlpha = alpha * 0.95;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = h.color;
      ctx.shadowBlur = 14;
      ctx.strokeRect(sx - 3, sy - 3, h.width + 6, h.height + 6);

      ctx.fillStyle = h.color;
      ctx.globalAlpha = alpha * 0.15;
      ctx.fillRect(sx - 3, sy - 3, h.width + 6, h.height + 6);

      if (h.tagLabel) {
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillStyle = h.color;
        ctx.fillText(h.tagLabel, sx - 2, sy - 8);
      }
      ctx.restore();
    }

    // 3. Renderiza Pulsos de Passo e Extração
    for (let i = state.pulses.length - 1; i >= 0; i--) {
      const p = state.pulses[i];
      p.radius += 0.9;
      p.alpha *= 0.92;
      if (p.radius >= p.maxRadius || p.alpha < 0.03) {
        state.pulses.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x - scrollX, p.y - scrollY, p.radius, 0, Math.PI * 2);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    }

    // 4. Renderiza Feixes de Laser (Visual Scraping Beams)
    for (let i = state.beams.length - 1; i >= 0; i--) {
      const beam = state.beams[i];
      const age = now - beam.createdAt;
      if (age >= beam.duration) {
        state.beams.splice(i, 1);
        continue;
      }
      const progress = age / beam.duration;
      const startX = state.body.x - scrollX;
      const startY = state.body.y - scrollY;
      const endX = beam.targetX - scrollX;
      const endY = beam.targetY - scrollY;

      ctx.save();
      ctx.strokeStyle = beam.color;
      ctx.shadowColor = beam.color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 2.8 * (1 - progress * 0.45);
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -age * 0.14;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const packetT = 1 - progress;
      const px = startX + (endX - startX) * packetT;
      const py = startY + (endY - startY) * packetT;
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Renderiza as 8 Patas Articuladas
    for (let i = 0; i < state.legs.length; i++) {
      const leg = state.legs[i];
      const hx = leg.hipX - scrollX;
      const hy = leg.hipY - scrollY;
      const kx = leg.kneeX - scrollX;
      const ky = leg.kneeY - scrollY;
      const fx = leg.footX - scrollX;
      const fy = leg.footY - scrollY;

      ctx.save();
      ctx.strokeStyle = CONFIG.colors.wireframeSecondary;
      ctx.shadowColor = CONFIG.colors.wireframeSecondary;
      ctx.shadowBlur = 9;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(kx, ky);
      ctx.stroke();

      ctx.strokeStyle = CONFIG.colors.wireframePrimary;
      ctx.shadowColor = CONFIG.colors.wireframePrimary;
      ctx.shadowBlur = 11;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(fx, fy);
      ctx.stroke();

      ctx.fillStyle = CONFIG.colors.jointFill;
      ctx.strokeStyle = CONFIG.colors.wireframePrimary;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(kx, ky, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = leg.anchoredElementTag
        ? CONFIG.colors.footAnchor
        : CONFIG.colors.wireframePrimary;
      ctx.beginPath();
      ctx.arc(fx, fy, leg.stepProgress < 1 ? 2.4 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Renderiza o Corpo Wireframe da Aranha
    const bx = state.body.x - scrollX;
    const by = state.body.y - scrollY;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(state.body.angle);

    const pulseScale = 1 + Math.sin(state.body.breathPhase) * 0.06;
    ctx.save();
    ctx.scale(pulseScale, pulseScale);
    ctx.strokeStyle = CONFIG.colors.wireframeSecondary;
    ctx.fillStyle = 'rgba(13, 18, 38, 0.9)';
    ctx.shadowColor = CONFIG.colors.wireframeSecondary;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(-25, -15);
    ctx.lineTo(-44, -11);
    ctx.lineTo(-50, 0);
    ctx.lineTo(-44, 11);
    ctx.lineTo(-25, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = CONFIG.colors.coreGlow;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(-42, 0);
    ctx.moveTo(-28, -8);
    ctx.lineTo(-36, 8);
    ctx.moveTo(-28, 8);
    ctx.lineTo(-36, -8);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = CONFIG.colors.wireframePrimary;
    ctx.fillStyle = 'rgba(8, 16, 32, 0.94)';
    ctx.shadowColor = CONFIG.colors.wireframePrimary;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 2.3;

    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(11, -14);
    ctx.lineTo(-10, -16);
    ctx.lineTo(-16, 0);
    ctx.lineTo(-10, 16);
    ctx.lineTo(11, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(19, -5);
    ctx.lineTo(29, -2);
    ctx.moveTo(19, 5);
    ctx.lineTo(29, 2);
    ctx.stroke();

    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 8;
    const eyeCoords = [
      [16, -3], [16, 3],
      [13, -6], [13, 6],
      [10, -8], [10, 8]
    ];
    for (let e = 0; e < eyeCoords.length; e++) {
      ctx.beginPath();
      ctx.arc(eyeCoords[e][0], eyeCoords[e][1], 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 7. Renderiza a Lupa de Ampliação de Texto (Magnifier HUD)
    if (state.magnifier && now - state.magnifier.createdAt < state.magnifier.duration) {
      const mag = state.magnifier;
      const mx = Math.min(state.width - 340, Math.max(20, bx + 42));
      const my = Math.max(64, by - 90);

      ctx.save();
      ctx.fillStyle = 'rgba(9, 13, 26, 0.94)';
      ctx.strokeStyle = mag.color;
      ctx.shadowColor = mag.color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.roundRect(mx, my, 315, 68, 8);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = mag.color;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText(`🕷️ ${mag.header || 'INSIGHT EXTRAÍDO'} [<${mag.tag.toUpperCase()}>]`, mx + 12, my + 19);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px "Inter", system-ui, sans-serif';
      const cleanSnippet = mag.text.length > 42 ? mag.text.slice(0, 42) + '...' : mag.text;
      ctx.fillText(cleanSnippet, mx + 12, my + 40);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`DOM XY: (${Math.round(mag.x)}, ${Math.round(mag.y)})`, mx + 12, my + 57);
      ctx.restore();
    }

    // 8. Barra Superior de Telemetria da Aranha
    ctx.save();
    ctx.fillStyle = 'rgba(7, 11, 22, 0.9)';
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(16, 14, 520, 36, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(32, 32, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(state.statusText.slice(0, 66), 46, 36);
    ctx.restore();
  }

  function tick(now) {
    if (!state.canvas || !document.getElementById('arachnemind-canvas-overlay')) {
      mountOverlay();
    }

    if (now - state.lastDomScan > CONFIG.domScanIntervalMs) {
      scanDomPlatforms();
      state.lastDomScan = now;
    }

    updateSpiderPhysics(now);
    renderFrame(now);

    state.lastFrameTime = now;
    requestAnimationFrame(tick);
  }

  // ============================================================================
  // API PÚBLICA EXPOSTA NO WINDOW PARA O ORQUESTRADOR PLAYWRIGHT
  // ============================================================================

  window.moveSpiderToElement = async function (targetDescriptor) {
    mountOverlay();
    scanDomPlatforms();

    let rect = null;
    let tag = 'node';
    let textSnippet = '';

    if (typeof targetDescriptor === 'string') {
      const el = document.querySelector(targetDescriptor);
      if (el) {
        rect = el.getBoundingClientRect();
        tag = el.tagName.toLowerCase();
        textSnippet = (el.innerText || el.value || el.textContent || '').trim();
      }
    } else if (targetDescriptor && typeof targetDescriptor === 'object') {
      if (targetDescriptor.selector) {
        const el = document.querySelector(targetDescriptor.selector);
        if (el) {
          rect = el.getBoundingClientRect();
          tag = el.tagName.toLowerCase();
          textSnippet = (el.innerText || el.value || el.textContent || '').trim();
        }
      }
      if (!rect && typeof targetDescriptor.x === 'number') {
        rect = {
          left: targetDescriptor.x - window.scrollX,
          top: targetDescriptor.y - window.scrollY,
          width: targetDescriptor.width || 60,
          height: targetDescriptor.height || 24
        };
        tag = targetDescriptor.tag || 'data';
        textSnippet = targetDescriptor.text || '';
      }
    }

    if (!rect) return false;

    const targetPageX = rect.left + window.scrollX + Math.min(rect.width / 2, 110);
    const targetPageY = rect.top + window.scrollY + rect.height / 2;

    const desiredScrollY = Math.max(0, targetPageY - window.innerHeight * 0.45);
    if (Math.abs(window.scrollY - desiredScrollY) > 95) {
      window.scrollTo({ top: desiredScrollY, behavior: 'smooth' });
    }

    state.statusText =
      (targetDescriptor && targetDescriptor.statusLabel) ||
      `CAMINHANDO -> <${tag.toUpperCase()}> (${Math.round(targetPageX)}, ${Math.round(targetPageY)})`;
    state.body.targetX = targetPageX;
    state.body.targetY = targetPageY;

    const startWait = performance.now();
    await new Promise((resolve) => {
      function checkArrival() {
        const dist = Math.hypot(
          state.body.x - state.body.targetX,
          state.body.y - state.body.targetY
        );
        if (dist < 24 || performance.now() - startWait > 1750) {
          resolve();
        } else {
          requestAnimationFrame(checkArrival);
        }
      }
      checkArrival();
    });

    const beamMode =
      (targetDescriptor && targetDescriptor.mode) ||
      (tag === 'a' ? 'link' : 'extract');

    window.triggerSpiderBeam({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
      tag,
      header: targetDescriptor && targetDescriptor.header,
      text: (targetDescriptor && targetDescriptor.text) || textSnippet || tag,
      mode: beamMode
    });

    return true;
  };

  window.triggerSpiderBeam = function (payload) {
    const now = performance.now();
    const color =
      payload.mode === 'link'
        ? CONFIG.colors.beamScan
        : payload.mode === 'click'
        ? CONFIG.colors.beamClick
        : payload.mode === 'confirm'
        ? CONFIG.colors.beamConfirm
        : payload.mode === 'price'
        ? CONFIG.colors.beamPrice
        : payload.mode === 'best_deal'
        ? CONFIG.colors.beamBestDeal
        : CONFIG.colors.beamExtract;

    const centerX = payload.x + (payload.width || 40) / 2;
    const centerY = payload.y + (payload.height || 20) / 2;

    state.beams.push({
      targetX: centerX,
      targetY: centerY,
      color,
      createdAt: now,
      duration: 680
    });

    state.highlights.push({
      x: payload.x,
      y: payload.y,
      width: Math.max(24, payload.width || 60),
      height: Math.max(16, payload.height || 22),
      color,
      tagLabel: `<${payload.tag || 'dom'}>`,
      createdAt: now,
      duration: 1450
    });

    state.pulses.push({
      x: centerX,
      y: centerY,
      radius: 4,
      maxRadius: 42,
      color,
      alpha: 0.95
    });

    if (payload.text) {
      state.magnifier = {
        x: centerX,
        y: centerY,
        tag: payload.tag || 'dom',
        header: payload.header || (payload.mode === 'click' ? 'CLIQUE AUTÔNOMO' : 'DADO RASPADO'),
        text: payload.text.replace(/\s+/g, ' ').trim(),
        color,
        createdAt: now,
        duration: 1650
      };
    }
  };

  initLegs();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mountOverlay();
      scanDomPlatforms();
      requestAnimationFrame(tick);
    });
  } else {
    mountOverlay();
    scanDomPlatforms();
    requestAnimationFrame(tick);
  }
})();
