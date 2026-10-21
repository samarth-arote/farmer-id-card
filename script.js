// MODIFIED: Core Form DOM Elements Selection
const form = document.getElementById("cardForm");
const frontPreview = document.getElementById("frontPreview");
const backPreview = document.getElementById("backPreview");
const frontPreview3D = document.getElementById("frontPreview3D");
const backPreview3D = document.getElementById("backPreview3D");

const printStack = document.getElementById("printStack");
const frontTemplate = document.getElementById("frontTemplate");
const backTemplate = document.getElementById("backTemplate");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const pdfOperationLoader = document.getElementById("pdfOperationLoader");
const pdfLoaderMessage = document.getElementById("pdfLoaderMessage");

let photoDataUrl = "";
let currentViewMode = "drag"; // 'drag', 'spin', or 'both'

// 3D All-Direction Trackball Rotation State (X and Y axes)
let cardRotateY = 0;
let cardRotateX = 0;
let isDragging = false;
let isAutoSpinning = false;
let autoSpinAnimId = null;
let startX = 0;
let startY = 0;
let initialRotateY = 0;
let initialRotateX = 0;
let dragDistance = 0;
let pdfLoaderCompletionTimer = null;

function setPdfOperationLoading(isLoading, message = "Preparing your farmer card…") {
  if (!pdfOperationLoader) return;
  if (pdfLoaderCompletionTimer) {
    clearTimeout(pdfLoaderCompletionTimer);
    pdfLoaderCompletionTimer = null;
  }
  pdfOperationLoader.classList.toggle("hidden", !isLoading);
  pdfOperationLoader.classList.remove("is-complete");
  pdfOperationLoader.setAttribute("aria-hidden", String(!isLoading));
  if (pdfLoaderMessage) pdfLoaderMessage.textContent = message;
}

function completePdfOperation(message = "Your PDF is ready") {
  if (!pdfOperationLoader) return;
  pdfOperationLoader.classList.remove("hidden");
  pdfOperationLoader.classList.add("is-complete");
  pdfOperationLoader.setAttribute("aria-hidden", "false");
  if (pdfLoaderMessage) pdfLoaderMessage.textContent = message;
  pdfLoaderCompletionTimer = setTimeout(() => setPdfOperationLoading(false), 850);
}

// Helper function to generate YYYYMMDD_HHMMSS timestamp string
function getFormattedTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

// View Mode Switcher (3D Drag, 360 Spin, Both Cards)
function initViewModeControls() {
  const btnDrag = document.getElementById("btnModeFlip");
  const btnSpin = document.getElementById("btnModeAutoSpin");
  const btnBoth = document.getElementById("btnModeBoth");

  const singleContainer = document.getElementById("singleFlipContainer");
  const bothContainer = document.getElementById("bothCardsContainer");
  const noteText = document.getElementById("previewNoteText");

  if (!btnDrag || !btnBoth) return;

  function stopAutoSpin() {
    isAutoSpinning = false;
    if (autoSpinAnimId) cancelAnimationFrame(autoSpinAnimId);
  }

  function startAutoSpinLoop() {
    stopAutoSpin();
    isAutoSpinning = true;
    const inner = document.getElementById("flipCardInner");
    if (inner) inner.classList.add("no-transition");

    let stepCount = 0;
    function step() {
      if (!isAutoSpinning) return;
      if (!isDragging) {
        stepCount += 0.02;
        cardRotateY += 1.2;
        cardRotateX = Math.sin(stepCount) * 14;
        apply3DTransform(cardRotateY, cardRotateX);
      }
      autoSpinAnimId = requestAnimationFrame(step);
    }
    autoSpinAnimId = requestAnimationFrame(step);
  }

  btnDrag.addEventListener("click", () => {
    stopAutoSpin();
    currentViewMode = "drag";
    btnDrag.classList.add("active");
    if (btnSpin) btnSpin.classList.remove("active");
    btnBoth.classList.remove("active");
    singleContainer.classList.remove("hidden");
    bothContainer.classList.add("hidden");
    const previewPanel = document.querySelector(".preview-panel");
    if (previewPanel) previewPanel.style.overflowY = "hidden";
    if (noteText) noteText.textContent = "";
    updateCardScale();
  });

  if (btnSpin) {
    btnSpin.addEventListener("click", () => {
      currentViewMode = "spin";
      btnSpin.classList.add("active");
      btnDrag.classList.remove("active");
      btnBoth.classList.remove("active");
      singleContainer.classList.remove("hidden");
      bothContainer.classList.add("hidden");
      const previewPanel = document.querySelector(".preview-panel");
      if (previewPanel) previewPanel.style.overflowY = "hidden";
      if (noteText) noteText.textContent = "360° Multi-Axis Orbit Spin 🔄";
      updateCardScale();
      startAutoSpinLoop();
    });
  }

  btnBoth.addEventListener("click", () => {
    stopAutoSpin();
    currentViewMode = "both";
    btnBoth.classList.add("active");
    btnDrag.classList.remove("active");
    if (btnSpin) btnSpin.classList.remove("active");
    bothContainer.classList.remove("hidden");
    singleContainer.classList.add("hidden");
    const previewPanel = document.querySelector(".preview-panel");
    if (previewPanel) previewPanel.style.overflowY = "auto";
    if (noteText) noteText.textContent = "Interactive 3D preview • Move mouse over card to tilt";
    updateCardScale();
  });
}

function apply3DTransform(rotateY, rotateX = 0) {
  const inner = document.getElementById("flipCardInner");
  const sideBadge = document.getElementById("cardSideBadge");
  if (!inner) return;

  inner.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;

  if (sideBadge) {
    const normalizedDeg = Math.abs(Math.round(rotateY / 180));
    sideBadge.textContent = (normalizedDeg % 2 === 1) ? "BACK" : "FRONT";
  }
}

function updateCardScale() {
  const flipStage = document.querySelector(".flip-card-3d-stage");
  if (flipStage) {
    const parentWidth = flipStage.parentElement.clientWidth;
    const targetWidth = 1008;
    const defaultScale = 0.5;
    const defaultWidth = targetWidth * defaultScale;

    if (parentWidth < defaultWidth) {
      const scale = parentWidth / targetWidth;
      flipStage.style.height = `${650 * scale}px`;
      flipStage.querySelectorAll(".scaled-card-wrapper").forEach(w => w.style.height = `${650 * scale}px`);
      flipStage.querySelectorAll(".scaled-card").forEach(c => c.style.transform = `scale(${scale})`);
    } else {
      flipStage.style.height = `325px`;
      flipStage.querySelectorAll(".scaled-card-wrapper").forEach(w => w.style.height = `325px`);
      flipStage.querySelectorAll(".scaled-card").forEach(c => c.style.transform = `scale(${defaultScale})`);
    }
  }

  const cardShells = document.querySelectorAll("#bothCardsContainer .card-shell");
  cardShells.forEach((shell) => {
    const wrapper = shell.querySelector(".scaled-card-wrapper");
    const scaledCard = shell.querySelector(".scaled-card");
    if (!wrapper || !scaledCard) return;

    const containerWidth = shell.clientWidth;
    const originalCardWidth = 1008;
    const defaultScale = 0.5;
    const defaultWidth = originalCardWidth * defaultScale;

    if (containerWidth < defaultWidth) {
      const responsiveScale = containerWidth / originalCardWidth;
      scaledCard.style.transform = `scale(${responsiveScale})`;
      wrapper.style.height = `${650 * responsiveScale}px`;
    } else {
      scaledCard.style.transform = `scale(${defaultScale})`;
      wrapper.style.height = `325px`;
    }
  });
}

function init3DDragRotator() {
  const stage = document.getElementById("drag3dStage");
  const inner = document.getElementById("flipCardInner");
  const hintPill = document.getElementById("flipHintPill");

  if (!stage || !inner) return;

  function startDrag(e) {
    isDragging = true;
    dragDistance = 0;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    initialRotateY = cardRotateY;
    initialRotateX = cardRotateX;
    inner.classList.add("no-transition");
    stage.classList.add("is-dragging");
  }

  function moveDrag(e) {
    if (!isDragging) return;
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    dragDistance = Math.hypot(deltaX, deltaY);

    cardRotateY = initialRotateY + (deltaX * 0.75);
    cardRotateX = initialRotateX - (deltaY * 0.75);

    apply3DTransform(cardRotateY, cardRotateX);
  }

  function stopDrag() {
    if (!isDragging) return;
    isDragging = false;
    stage.classList.remove("is-dragging");
  }

  stage.addEventListener("mousedown", startDrag);
  window.addEventListener("mousemove", moveDrag);
  window.addEventListener("mouseup", stopDrag);

  stage.addEventListener("touchstart", startDrag, { passive: true });
  window.addEventListener("touchmove", moveDrag, { passive: true });
  window.addEventListener("touchend", stopDrag);

  stage.addEventListener("click", () => {
    if (dragDistance < 6) {
      cardRotateY += 180;
      cardRotateX = 0;
      inner.classList.remove("no-transition");
      apply3DTransform(cardRotateY, cardRotateX);
    }
  });

  if (hintPill) {
    hintPill.addEventListener("click", () => {
      cardRotateY += 180;
      cardRotateX = 0;
      inner.classList.remove("no-transition");
      apply3DTransform(cardRotateY, cardRotateX);
    });
  }

  apply3DTransform(0, 0);
}

window.addEventListener("resize", updateCardScale);

// Presentation-only theme control. It never changes form values, card markup,
// or the separate PDF rendering flow.
function initThemeToggle() {
  const toggles = [
    document.getElementById("themeToggle"),
    document.getElementById("authThemeToggle")
  ].filter(Boolean);
  if (!toggles.length) return;

  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let savedTheme = null;
  // Versioned preference starts every existing installation from the current
  // operating-system theme, while still remembering future manual changes.
  try { savedTheme = localStorage.getItem("farmerCardThemePreferenceV2"); } catch (_) {}

  const setTheme = (isDark, persist = false) => {
    document.body.classList.toggle("dark-mode", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    toggles.forEach((toggle) => {
      toggle.setAttribute("aria-pressed", String(isDark));
      toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
      toggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";
      const label = toggle.querySelector(".theme-toggle-label");
      if (label) label.textContent = isDark ? "Light Mode" : "Dark Mode";
    });
    if (persist) {
      savedTheme = isDark ? "dark" : "light";
      try { localStorage.setItem("farmerCardThemePreferenceV2", savedTheme); } catch (_) {}
    }
  };

  setTheme(savedTheme ? savedTheme === "dark" : systemTheme.matches);
  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => setTheme(!document.body.classList.contains("dark-mode"), true));
  });
  systemTheme.addEventListener("change", (event) => {
    if (!savedTheme) setTheme(event.matches);
  });
}

// A quiet Three.js field gives the preview studio depth without interacting
// with the actual farmer card, its layout, or its PDF capture.
function initAmbientFarmScene() {
  const canvas = document.getElementById("ambientFarmScene");
  const host = document.querySelector(".preview-panel");
  if (!canvas || !host || !window.THREE) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  const particleCount = 84;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const colorA = new THREE.Color("#71d99a");
  const colorB = new THREE.Color("#8fcff5");
  for (let i = 0; i < particleCount; i += 1) {
    const index = i * 3;
    positions[index] = (Math.random() - 0.5) * 18;
    positions[index + 1] = (Math.random() - 0.5) * 12;
    positions[index + 2] = (Math.random() - 0.5) * 5;
    const color = i % 3 === 0 ? colorB : colorA;
    colors[index] = color.r;
    colors[index + 1] = color.g;
    colors[index + 2] = color.b;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const particleMaterial = new THREE.PointsMaterial({ size: 0.075, vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  const leafGroup = new THREE.Group();
  const leafMaterial = new THREE.MeshBasicMaterial({ color: "#5bc482", transparent: true, opacity: 0.12, side: THREE.DoubleSide });
  const leafGeometry = new THREE.CircleGeometry(0.72, 24, 0, Math.PI);
  for (let i = 0; i < 7; i += 1) {
    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
    leaf.position.set(-6 + i * 2.1, -3.2 + (i % 2) * 5.9, -1.5 - (i % 3));
    leaf.rotation.z = (i % 2 ? 0.7 : -0.8);
    leaf.scale.set(1, 1.75, 1);
    leafGroup.add(leaf);
  }
  scene.add(leafGroup);

  const pointer = { x: 0, y: 0 };
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);
  host.addEventListener("pointermove", (event) => {
    const rect = host.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.45;
    pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.32;
  });

  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let tick = 0;
  const animate = () => {
    tick += 0.003;
    particles.rotation.y += 0.00055;
    particles.rotation.x += (pointer.y - particles.rotation.x) * 0.006;
    leafGroup.rotation.z = Math.sin(tick) * 0.08;
    leafGroup.position.x += (pointer.x * 1.3 - leafGroup.position.x) * 0.015;
    renderer.render(scene, camera);
    if (!reducedMotion) requestAnimationFrame(animate);
  };
  animate();
}

// Dhumketu / Chingari-inspired cursor embers. This runs independently from
// the card preview and changes palette immediately when the theme changes.
function initCometCursor() {
  const canvas = document.getElementById("cometCursorCanvas");
  const toggle = document.getElementById("cursorEffectToggle");
  const authModal = document.getElementById("authModal");
  if (!canvas || !window.matchMedia) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    canvas.classList.add("is-disabled");
    if (toggle) {
      toggle.setAttribute("aria-pressed", "false");
      toggle.disabled = true;
      toggle.title = "Cursor animation follows your reduced-motion setting";
      const label = toggle.querySelector("span");
      if (label) label.textContent = "Cursor FX Off";
    }
    return;
  }

  const context = canvas.getContext("2d");
  const particles = [];
  const ribbon = [];
  const cursor = { x: -100, y: -100, previousX: -100, previousY: -100, visible: false, lastSpawnX: -100, lastSpawnY: -100 };
  const maxParticles = 118;
  let frameId = null;
  let isRunning = false;
  let effectEnabled = true;

  try {
    effectEnabled = localStorage.getItem("farmerCardCursorEffect") !== "off";
  } catch (_) {}

  const isAuthVisible = () => Boolean(authModal && !authModal.classList.contains("hidden"));

  const updateToggle = () => {
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", String(effectEnabled));
    toggle.title = effectEnabled ? "Turn cursor animation off" : "Turn cursor animation on";
    const label = toggle.querySelector("span");
    if (label) label.textContent = effectEnabled ? "Cursor FX On" : "Cursor FX Off";
  };

  const stopEffect = () => {
    isRunning = false;
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    particles.length = 0;
    ribbon.length = 0;
    cursor.visible = false;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    canvas.classList.add("is-disabled");
  };

  const startEffect = () => {
    if (isRunning || !effectEnabled || isAuthVisible()) return;
    canvas.classList.remove("is-disabled");
    isRunning = true;
    frameId = requestAnimationFrame(animate);
  };

  const syncEffectState = () => {
    updateToggle();
    if (effectEnabled && !isAuthVisible()) startEffect();
    else stopEffect();
  };

  const palette = () => document.body.classList.contains("dark-mode")
    ? ["#7667ff", "#f34cda", "#38d6ff", "#ffd76a"]
    : ["#1f2636", "#c46605", "#f0a51d", "#3e587f"];

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const addParticle = (x, y, burst = false, direction = Math.PI) => {
    if (particles.length >= maxParticles) particles.splice(0, particles.length - maxParticles + 1);
    const angle = burst ? Math.random() * Math.PI * 2 : direction + (Math.random() - 0.5) * 1.15;
    const speed = burst ? 0.55 + Math.random() * 2.2 : 0.28 + Math.random() * 1.05;
    const life = burst ? 38 + Math.random() * 28 : 40 + Math.random() * 30;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: burst ? 1.4 + Math.random() * 2.4 : 0.8 + Math.random() * 1.7,
      life,
      maxLife: life,
      color: palette()[Math.floor(Math.random() * 4)],
      sparkle: burst || Math.random() > 0.48,
      drift: (Math.random() - 0.5) * 0.018
    });
  };

  const onPointerMove = (event) => {
    if (!isRunning) return;
    if (event.pointerType && event.pointerType !== "mouse") return;
    cursor.previousX = cursor.x;
    cursor.previousY = cursor.y;
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    cursor.visible = true;
    ribbon.unshift({ x: cursor.x, y: cursor.y, createdAt: performance.now() });
    if (ribbon.length > 24) ribbon.pop();

    const distance = Math.hypot(cursor.x - cursor.lastSpawnX, cursor.y - cursor.lastSpawnY);
    if (distance > 3) {
      const movementX = cursor.x - cursor.previousX;
      const movementY = cursor.y - cursor.previousY;
      const backwardAngle = Math.atan2(movementY, movementX) + Math.PI;
      addParticle(cursor.x, cursor.y, false, backwardAngle);
      addParticle(cursor.x, cursor.y, false, backwardAngle);
      if (Math.random() > 0.3) addParticle(cursor.x, cursor.y, false, backwardAngle);
      cursor.lastSpawnX = cursor.x;
      cursor.lastSpawnY = cursor.y;
    }
  };

  const onPointerDown = (event) => {
    if (!isRunning) return;
    if (event.pointerType && event.pointerType !== "mouse") return;
    for (let i = 0; i < 14; i += 1) addParticle(event.clientX, event.clientY, true);
  };

  const drawSparkle = (x, y, radius, alpha, color) => {
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 5;
    context.beginPath();
    for (let point = 0; point < 8; point += 1) {
      const angle = -Math.PI / 2 + point * Math.PI / 4;
      const length = point % 2 === 0 ? radius : radius * 0.34;
      const px = x + Math.cos(angle) * length;
      const py = y + Math.sin(angle) * length;
      if (point === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
    context.restore();
  };

  const drawRibbon = (darkMode, now) => {
    while (ribbon.length && now - ribbon[ribbon.length - 1].createdAt > 390) ribbon.pop();
    if (ribbon.length < 3) return;

    const head = ribbon[0];
    const tail = ribbon[ribbon.length - 1];
    const colors = darkMode
      ? ["rgba(55, 213, 255, 0)", "rgba(84, 107, 255, 0.36)", "rgba(244, 73, 220, 0.58)", "rgba(255, 215, 106, 0.8)"]
      : ["rgba(31, 38, 54, 0)", "rgba(56, 86, 127, 0.24)", "rgba(197, 102, 5, 0.5)", "rgba(240, 165, 29, 0.76)"];
    const gradient = context.createLinearGradient(tail.x, tail.y, head.x, head.y);
    colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color));

    const trace = (strandOffset = 0, phase = 0) => {
      const offsetPoint = (index) => {
        const point = ribbon[index];
        const before = ribbon[Math.max(0, index - 1)];
        const after = ribbon[Math.min(ribbon.length - 1, index + 1)];
        const tangentX = before.x - after.x;
        const tangentY = before.y - after.y;
        const tangentLength = Math.max(1, Math.hypot(tangentX, tangentY));
        const tailFactor = index / Math.max(1, ribbon.length - 1);
        const flutter = Math.sin(index * 1.18 + now * 0.008 + phase) * 2.4 * tailFactor;
        const offset = strandOffset * tailFactor + flutter;
        return {
          x: point.x + (-tangentY / tangentLength) * offset,
          y: point.y + (tangentX / tangentLength) * offset
        };
      };

      const tailPoint = offsetPoint(ribbon.length - 1);
      context.beginPath();
      context.moveTo(tailPoint.x, tailPoint.y);
      for (let index = ribbon.length - 2; index >= 0; index -= 1) {
        const point = offsetPoint(index);
        const following = offsetPoint(Math.max(index - 1, 0));
        context.quadraticCurveTo(point.x, point.y, (point.x + following.x) / 2, (point.y + following.y) / 2);
      }
    };

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = gradient;
    context.globalAlpha = darkMode ? 0.34 : 0.24;
    context.shadowColor = darkMode ? "#bb5cff" : "#d57a0a";
    context.shadowBlur = darkMode ? 8 : 4;
    context.lineWidth = 22;
    trace();
    context.stroke();

    const strandColors = darkMode
      ? ["#28cfff", "#695aff", "#f044d2", "#ffca57"]
      : ["#243149", "#3e587f", "#b45b00", "#ee9e12"];
    [-9, -3, 4, 10].forEach((offset, index) => {
      context.strokeStyle = strandColors[index];
      context.globalAlpha = darkMode ? 0.72 : 0.58;
      context.shadowColor = strandColors[index];
      context.shadowBlur = darkMode ? 5 : 2;
      context.lineWidth = index === 3 ? 1.2 : 1.8;
      trace(offset, index * 1.7);
      context.stroke();
    });
    context.restore();
  };

  const animate = () => {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const darkMode = document.body.classList.contains("dark-mode");
    const now = performance.now();
    context.globalCompositeOperation = "source-over";
    drawRibbon(darkMode, now);

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.965;
      particle.vy = particle.vy * 0.965 + 0.012;
      particle.vx += particle.drift;
      particle.life -= 1;
      const alpha = Math.max(0, particle.life / particle.maxLife);

      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }

      context.globalAlpha = alpha * 0.88;
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      context.fill();

      if (particle.sparkle && particle.life % 14 === 0) {
        drawSparkle(particle.x, particle.y, particle.size * 2.6, alpha, particle.color);
      }
    }

    context.globalAlpha = 1;

    if (isRunning) frameId = requestAnimationFrame(animate);
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("blur", () => { cursor.visible = false; });
  if (toggle) {
    toggle.addEventListener("click", () => {
      effectEnabled = !effectEnabled;
      try { localStorage.setItem("farmerCardCursorEffect", effectEnabled ? "on" : "off"); } catch (_) {}
      syncEffectState();
    });
  }
  if (authModal) {
    new MutationObserver(syncEffectState).observe(authModal, { attributes: true, attributeFilter: ["class"] });
  }
  syncEffectState();
  return stopEffect;
}

function getLandRows() {
  const landsMap = {};
  const fd = new FormData(form);
  for (const [k, v] of fd.entries()) {
    const m = /^lands\[(\d+)\]\[(district|taluka|village|gatNo|khateNo|area)\]$/.exec(k);
    if (!m) continue;
    const idx = Number(m[1]);
    const field = m[2];
    landsMap[idx] = landsMap[idx] || { district: "", taluka: "", village: "", gatNo: "", khateNo: "", area: "" };
    landsMap[idx][field] = v;
  }
  const indices = Object.keys(landsMap).map(Number).sort((a,b)=>a-b);
  return indices.map((i)=>landsMap[i]);
}

function formData() {
  const data = Object.fromEntries(new FormData(form).entries());
  delete data.photo;

  const lands = getLandRows();

  const dobDate = form.elements.dobDate ? form.elements.dobDate.value : "";
  data.dob = formatDobDDMMYYYY(dobDate) || data.dob || "";

  if (data.aadhaar != null) {
    data.aadhaar = formatAadhaar(data.aadhaar);
  }

  if (data.cardNumber != null) {
    data.cardNumber = formatCardNumber(data.cardNumber);
  }

  delete data.district;
  delete data.taluka;
  delete data.village;
  delete data.gatNo;
  delete data.khateNo;
  delete data.area;

  data.lands = lands;
  return data;
}

function qrPayload(data) {
  return [`Name: ${data.englishName}`, `DOB: ${data.dob}`, `Gender: ${data.gender}`, `Mobile: ${data.mobile}`, `Aadhaar: ${data.aadhaar}`, `Card: ${data.cardNumber}`, `Address: ${data.address}`].join("\n");
}

function formatDobDDMMYYYY(value) {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }

  const digits = (value || "").replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  if (digits.length <= 2) return dd;
  if (digits.length <= 4) return `${dd}-${mm}`;
  return `${dd}-${mm}-${yyyy}`;
}

function formatAadhaar(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 12);
  if (!digits) return "";
  const p1 = digits.slice(0, 4);
  const p2 = digits.slice(4, 8);
  const p3 = digits.slice(8, 12);
  return `${p1} ${p2} ${p3}`;
}

function formatCardNumber(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  const p1 = digits.slice(0, 4);
  const p2 = digits.slice(4, 8);
  const p3 = digits.slice(8, 11);
  return `${p1} ${p2} ${p3}`;
}

function isValidCardNumber(value) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length === 11;
}

function isValidAadhaar(value) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length === 12;
}

function makeCard(template, data) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelectorAll("[data-field]").forEach((element) => { element.textContent = data[element.dataset.field] || ""; });
  const photoBox = node.querySelector("[data-photo-box]");
  if (photoBox && photoDataUrl) photoBox.innerHTML = `<img alt="Farmer photo" src="${photoDataUrl}">`;
  const qr = node.querySelector("[data-qr]");
  if (qr) {
    qr.innerHTML = "";
    if (window.QRCode) {
      new QRCode(qr, { text: qrPayload(data), width: 158, height: 158, correctLevel: QRCode.CorrectLevel.M });
    } else {
      qr.innerHTML = '<div style="font-size:11px;line-height:1.2;text-align:center;color:#111">QR library<br>not loaded</div>';
    }
  }

  const landRowsContainer = node.querySelector("[data-land-rows]");
  if (landRowsContainer) {
    const lands = Array.isArray(data.lands) ? data.lands : [];
    const rowCount = Math.max(1, lands.length);
    const font = rowCount <= 1 ? 21 : rowCount === 2 ? 20 : rowCount === 3 ? 19 : rowCount === 4 ? 18 : 16;
    const cellStyle = `font-size:${font}px; margin-top:0;`;

    landRowsContainer.innerHTML = "";
    lands.forEach((r) => {
      const row = document.createElement("div");
      row.className = "land-row";

      const cells = [
        r.district ?? "",
        r.taluka ?? "",
        r.village ?? "",
        r.gatNo ?? "",
        r.khateNo ?? "",
        r.area ?? ""
      ];

      cells.forEach((val) => {
        const cell = document.createElement("div");
        cell.className = "land-cell";
        cell.style.cssText = cellStyle;
        cell.textContent = (val ?? "").toString();
        row.appendChild(cell);
      });

      landRowsContainer.appendChild(row);
    });
  }

  return node;
}

function render() {
  const dobDate = form.elements.dobDate ? form.elements.dobDate.value : "";
  const hiddenDob = form.elements.dob;
  if (hiddenDob) hiddenDob.value = formatDobDDMMYYYY(dobDate);

  const aadhaarInput = form.elements.aadhaar;
  if (aadhaarInput) aadhaarInput.value = formatAadhaar(aadhaarInput.value);

  const cardInput = form.elements.cardNumber;
  if (cardInput) cardInput.value = formatCardNumber(cardInput.value);

  const currentData = formData();

  if (frontPreview) {
    frontPreview.innerHTML = "";
    frontPreview.appendChild(makeCard(frontTemplate, currentData));
  }
  if (backPreview) {
    backPreview.innerHTML = "";
    backPreview.appendChild(makeCard(backTemplate, currentData));
  }

  if (frontPreview3D) {
    frontPreview3D.innerHTML = "";
    frontPreview3D.appendChild(makeCard(frontTemplate, currentData));
  }
  if (backPreview3D) {
    backPreview3D.innerHTML = "";
    backPreview3D.appendChild(makeCard(backTemplate, currentData));
  }

  updateCardScale();
}

function loadPhoto(file) {
  const photoNameSpan = document.getElementById("photoFileName");
  if (!file) {
    photoDataUrl = "";
    if (photoNameSpan) photoNameSpan.textContent = "Choose Photo...";
    render();
    return;
  }
  if (photoNameSpan) photoNameSpan.textContent = file.name;

  const reader = new FileReader();
  reader.onload = () => { photoDataUrl = reader.result; render(); };
  reader.readAsDataURL(file);
}

async function cardCanvas(card) {
  return html2canvas(card, { 
    scale: 2, 
    backgroundColor: "#eef6ef", 
    useCORS: true, 
    logging: false 
  });
}

// Optimized PDF Generator with High-Quality JPEG Compression (~500KB)
async function downloadPdf() {
    if (!window.html2canvas || !window.jspdf) {
        alert("PDF libraries are not loaded.");
        return;
    }

    downloadBtn.disabled = true;
    downloadBtn.textContent = "Creating PDF...";
    setPdfOperationLoading(true, "Generating your farmer card PDF…");

    const data = formData();

    printStack.innerHTML = "";

    const front = makeCard(frontTemplate, data);
    const back = makeCard(backTemplate, data);

    printStack.append(front, back);

    await new Promise(resolve => setTimeout(resolve, 300));

    const frontCanvas = await cardCanvas(front);
    const backCanvas = await cardCanvas(back);

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [152.4, 101.6]
    });

    const cardWidth = 85.60;
    const cardHeight = 53.98;

    const x = (101.6 - cardWidth) / 2;

    const topMargin = 8;
    const gap = 8;

    pdf.addImage(
        frontCanvas.toDataURL("image/jpeg", 0.90),
        "JPEG",
        x,
        topMargin,
        cardWidth,
        cardHeight,
        undefined,
        "FAST"
    );

    pdf.addImage(
        backCanvas.toDataURL("image/jpeg", 0.90),
        "JPEG",
        x,
        topMargin + cardHeight + gap,
        cardWidth,
        cardHeight,
        undefined,
        "FAST"
    );

    const rawName = (data.englishName || "Farmer")
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

    const timestamp = getFormattedTimestamp();
    const filename = `${rawName || "farmer"}_${timestamp}.pdf`;

    pdf.save(filename);

    const pdfBlob = pdf.output("blob");
    data.photoDataUrl = photoDataUrl || "";
    if (window.supabaseManager) {
      window.supabaseManager.uploadPdfToSupabase(pdfBlob, filename, data);
    }

    if (window.driveManager) {
      window.driveManager.onPdfDownloaded(pdfBlob, filename);
    }

    printStack.innerHTML = "";

    downloadBtn.disabled = false;
    downloadBtn.textContent = "Download PDF";
    completePdfOperation("Your farmer card PDF is ready");
}

form.addEventListener("input", (event) => {
  if (event.target.name === "aadhaar") event.target.value = formatAadhaar(event.target.value);
  if (event.target.name === "cardNumber") event.target.value = formatCardNumber(event.target.value);
  if (event.target.name === "dobDate") render();
  if (event.target.name !== "photo" && event.target.name !== "dobDate") render();
});

function createLandRowHtml(index, values) {
  const v = values || {};
  return `
    <div class="land-row-card">
      <div class="grid">
        <label><span class="label-text">District / जिल्हा</span><input name="lands[${index}][district]" value="${(v.district ?? '').toString().replace(/"/g,'"')}"></label>
        <label><span class="label-text">Taluka / तालुका</span><input name="lands[${index}][taluka]" value="${(v.taluka ?? '').toString().replace(/"/g,'"')}"></label>
        <label><span class="label-text">Village / गाव</span><input name="lands[${index}][village]" value="${(v.village ?? '').toString().replace(/"/g,'"')}"></label>
        <label><span class="label-text">Gat No. / गट नं.</span><input name="lands[${index}][gatNo]" value="${(v.gatNo ?? '').toString().replace(/"/g,'"')}"></label>
        <label><span class="label-text">Khate No. / खाते नं.</span><input name="lands[${index}][khateNo]" value="${(v.khateNo ?? '').toString().replace(/"/g,'"')}"></label>
        <label><span class="label-text">Area H.R. / क्षेत्र हे.आर</span><input name="lands[${index}][area]" value="${(v.area ?? '').toString().replace(/"/g,'"')}"></label>
      </div>
    </div>
  `;
}

const landRowsEl = document.getElementById("landRows");
const addLandRowBtn = document.getElementById("addLandRowBtn");

function initLandRows() {
  landRowsEl.innerHTML = "";
  landRowsEl.insertAdjacentHTML("beforeend", createLandRowHtml(0, {
    district: "अहिल्यानगर",
    taluka: "अकोले",
    village: "ब्राम्हणवाडा",
    gatNo: "",
    khateNo: "",
    area: ""
  }));
  addLandRowBtn.disabled = false;
}

addLandRowBtn.addEventListener("click", () => {
  const currentCount = landRowsEl.querySelectorAll(".land-row-card").length;
  const nextIndex = Math.max(0, Math.round(currentCount));
  landRowsEl.insertAdjacentHTML("beforeend", createLandRowHtml(nextIndex, {
    district: "",
    taluka: "",
    village: "",
    gatNo: "",
    khateNo: "",
    area: ""
  }));
  render();
});

form.photo.addEventListener("change", (event) => { loadPhoto(event.target.files[0]); });
if (form.elements.dobDate) {
  form.elements.dobDate.addEventListener("change", () => { render(); });
}

resetBtn.addEventListener("click", () => {
  if (currentEditingCardRecord) {
    window.cancelSuperAdminEditCard();
  }
  form.reset();
  photoDataUrl = "";
  initLandRows();
  render();
});

form.addEventListener("submit", (e) => e.preventDefault());

let currentEditingCardRecord = null;

window.startSuperAdminEditCard = function(record) {
  currentEditingCardRecord = record;

  const banner = document.getElementById("superAdminEditBanner");
  const bannerFarmer = document.getElementById("editBannerFarmerName");
  const bannerCardInfo = document.getElementById("editBannerCardInfo");

  if (banner) banner.classList.remove("hidden");
  if (bannerFarmer) bannerFarmer.textContent = `Editing: ${record.english_name || "Farmer"}`;
  if (bannerCardInfo) bannerCardInfo.textContent = `Card: ${record.card_number || "N/A"} | Aadhaar: ${record.aadhaar || "N/A"}`;

  if (downloadBtn) {
    downloadBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      Update & Replace PDF
    `;
    downloadBtn.classList.add("btn-edit-mode");
  }

  // Pre-fill ALL data including photo
  let savedMeta = null;
  if (record.card_data) {
    savedMeta = (typeof record.card_data === "string") ? JSON.parse(record.card_data) : record.card_data;
  }
  if (!savedMeta) {
    try {
      const raw = (record.id && localStorage.getItem(`farmer_card_meta_${record.id}`)) ||
                  (record.storage_path && localStorage.getItem(`farmer_card_meta_${record.storage_path}`)) ||
                  (record.filename && localStorage.getItem(`farmer_card_meta_${record.filename}`));
      if (raw) savedMeta = JSON.parse(raw);
    } catch (e) {}
  }
  savedMeta = savedMeta || {};

  if (form.elements.marathiName) form.elements.marathiName.value = record.marathi_name || savedMeta.marathiName || "";
  if (form.elements.englishName) form.elements.englishName.value = record.english_name || savedMeta.englishName || "";
  if (form.elements.aadhaar) form.elements.aadhaar.value = formatAadhaar(record.aadhaar || savedMeta.aadhaar || "");
  if (form.elements.cardNumber) form.elements.cardNumber.value = formatCardNumber(record.card_number || savedMeta.cardNumber || "");
  if (form.elements.mobile) form.elements.mobile.value = record.mobile || savedMeta.mobile || "";

  if (form.elements.gender) form.elements.gender.value = savedMeta.gender || "Male";
  if (savedMeta.dobDate && form.elements.dobDate) {
    form.elements.dobDate.value = savedMeta.dobDate;
  } else if (savedMeta.dob && form.elements.dobDate) {
    const parts = savedMeta.dob.split("-");
    if (parts.length === 3) form.elements.dobDate.value = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  if (form.elements.dob) form.elements.dob.value = savedMeta.dob || (form.elements.dobDate ? formatDobDDMMYYYY(form.elements.dobDate.value) : "");
  if (savedMeta.address && form.elements.address) form.elements.address.value = savedMeta.address;

  // Restore land rows
  if (Array.isArray(savedMeta.lands) && savedMeta.lands.length > 0) {
    landRowsEl.innerHTML = "";
    savedMeta.lands.forEach((l, idx) => {
      landRowsEl.insertAdjacentHTML("beforeend", createLandRowHtml(idx, l));
    });
  }

  // Restore photo
  if (savedMeta.photoDataUrl) {
    photoDataUrl = savedMeta.photoDataUrl;
    const photoNameSpan = document.getElementById("photoFileName");
    if (photoNameSpan) photoNameSpan.textContent = "Saved Photo Loaded ✓";
  }

  render();
  window.scrollTo({ top: 0, behavior: "smooth" });

  setTimeout(() => {
    alert(`✏️ Super Admin Edit Mode Activated:\n\nAll existing card details and photo for "${record.english_name || 'Farmer'}" have been pre-filled.\n\n⚠️ Notice: When you click "Update & Replace PDF", the old PDF will be deleted first, then replaced with your updated PDF.\n\nUser account access will NOT be revoked after updation.`);
  }, 200);
};

window.cancelSuperAdminEditCard = function() {
  currentEditingCardRecord = null;
  const banner = document.getElementById("superAdminEditBanner");
  if (banner) banner.classList.add("hidden");

  if (downloadBtn) {
    downloadBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      Download PDF
    `;
    downloadBtn.classList.remove("btn-edit-mode");
  }
};

async function proceedWithSuperAdminUpdatePdf() {
  if (!currentEditingCardRecord) return;
  if (!window.html2canvas || !window.jspdf) {
    alert("PDF libraries are not loaded.");
    return;
  }

  downloadBtn.disabled = true;
  downloadBtn.textContent = "Updating & Replacing PDF...";
  setPdfOperationLoading(true, "Updating and replacing the farmer card PDF…");

  const targetRecord = currentEditingCardRecord;
  const data = formData();
  data.photoDataUrl = photoDataUrl || "";

  // 1. DELETE OLD PDF FIRST (Ensure first delete old pdf)
  if (window.supabaseManager) {
    console.log("Super Admin: Deleting old PDF record first:", targetRecord.filename);
    await window.supabaseManager.deletePdfRecord(targetRecord.id, targetRecord.storage_path || targetRecord.filename);
  }

  // 2. GENERATE NEW UPDATED PDF
  printStack.innerHTML = "";
  const front = makeCard(frontTemplate, data);
  const back = makeCard(backTemplate, data);
  printStack.append(front, back);

  await new Promise(resolve => setTimeout(resolve, 300));

  const frontCanvas = await cardCanvas(front);
  const backCanvas = await cardCanvas(back);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [152.4, 101.6]
  });

  const cardWidth = 85.60;
  const cardHeight = 53.98;
  const x = (101.6 - cardWidth) / 2;
  const topMargin = 8;
  const gap = 8;

  pdf.addImage(
    frontCanvas.toDataURL("image/jpeg", 0.90),
    "JPEG",
    x,
    topMargin,
    cardWidth,
    cardHeight,
    undefined,
    "FAST"
  );

  pdf.addImage(
    backCanvas.toDataURL("image/jpeg", 0.90),
    "JPEG",
    x,
    topMargin + cardHeight + gap,
    cardWidth,
    cardHeight,
    undefined,
    "FAST"
  );

  const rawName = (data.englishName || "Farmer")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const timestamp = getFormattedTimestamp();
  const newFilename = `${rawName || "farmer"}_${timestamp}.pdf`;

  pdf.save(newFilename);

  const pdfBlob = pdf.output("blob");

  // Preserve original user ownership
  const uploadData = {
    ...data,
    userId: targetRecord.user_id,
    userEmail: targetRecord.user_email
  };

  if (window.supabaseManager) {
    const uploadRes = await window.supabaseManager.uploadPdfToSupabase(pdfBlob, newFilename, uploadData);
    if (uploadRes) {
      alert("✅ Card Successfully Updated!\n\nThe old PDF was deleted and replaced with the new version.\nUser account access was NOT revoked.");
    } else {
      alert("PDF downloaded locally. Please verify Supabase upload status.");
    }
  }

  printStack.innerHTML = "";
  downloadBtn.disabled = false;
  completePdfOperation("Your updated farmer card PDF is ready");
  window.cancelSuperAdminEditCard();
}

downloadBtn.addEventListener("click", async () => {
  // HARD SECURITY GATE: Verify if user account is active and approved in Supabase
  if (window.supabaseManager) {
    const isAllowed = await window.supabaseManager.verifyActiveUserStatus(true);
    if (!isAllowed) {
      return;
    }
  }

  const aadhaarOk = isValidAadhaar(form.elements.aadhaar.value);
  if (!aadhaarOk) {
    alert("Aadhaar No must contain exactly 12 digits (format: 4 digits + space + 4 digits + space + 4 digits).");
    return;
  }

  const cardOk = isValidCardNumber(form.elements.cardNumber.value);
  if (!cardOk) {
    alert("Card Number must contain exactly 11 digits (format: 4 digits + space + 4 digits + space + 3 digits).");
    return;
  }

  if (currentEditingCardRecord) {
    const ok = confirm(
      `Confirm Card Update & PDF Replacement:\n\n` +
      `1. The previous PDF file (${currentEditingCardRecord.filename}) will be permanently deleted from Supabase Storage and Database.\n` +
      `2. The new updated PDF will be uploaded with 10+ years lifetime access.\n` +
      `3. User account access will NOT be revoked after updation.\n\n` +
      `Do you want to proceed?`
    );
    if (!ok) return;

    await proceedWithSuperAdminUpdatePdf();
    return;
  }

  await downloadPdf();
});

// ==========================================================================
// MODIFIED: AUTH MODAL & ADMIN DASHBOARD UI EVENT LISTENERS
// ==========================================================================

function initAuthAndAdminUI() {
  let isSignUpMode = false;
  let lastAttemptedEmail = "";

  const tabSignIn = document.getElementById("tabSignIn");
  const tabSignUp = document.getElementById("tabSignUp");
  const authTabsWrapper = document.getElementById("authTabsWrapper");
  const authForm = document.getElementById("authForm");
  const authEmailInput = document.getElementById("authEmail");
  const authPasswordInput = document.getElementById("authPassword");
  const btnAuthSubmit = document.getElementById("btnAuthSubmit");
  const authErrorMsg = document.getElementById("authErrorMsg");
  const btnLogout = document.getElementById("btnLogout");
  const authRequestLoader = document.getElementById("authRequestLoader");
  const authLoaderMessage = document.getElementById("authLoaderMessage");

  // Pending approval screen elements
  const authPendingScreen = document.getElementById("authPendingScreen");
  const pendingUserEmailText = document.getElementById("pendingUserEmailText");
  const btnCheckApprovalStatus = document.getElementById("btnCheckApprovalStatus");
  const btnBackToSignIn = document.getElementById("btnBackToSignIn");

  function setAuthRequestLoading(isLoading, message = "Contacting secure service…") {
    if (authRequestLoader) {
      authRequestLoader.classList.toggle("hidden", !isLoading);
      authRequestLoader.setAttribute("aria-hidden", String(!isLoading));
    }
    if (authLoaderMessage) authLoaderMessage.textContent = message;
    if (authForm) authForm.setAttribute("aria-busy", String(isLoading));
  }

  function showPendingApprovalView(email) {
    lastAttemptedEmail = email || authEmailInput.value.trim();
    if (pendingUserEmailText) {
      pendingUserEmailText.textContent = lastAttemptedEmail || "user@domain.com";
    }
    if (authTabsWrapper) authTabsWrapper.classList.add("hidden");
    if (authForm) authForm.classList.add("hidden");
    if (authPendingScreen) authPendingScreen.classList.remove("hidden");
  }

  function hidePendingApprovalView() {
    if (authPendingScreen) authPendingScreen.classList.add("hidden");
    if (authTabsWrapper) authTabsWrapper.classList.remove("hidden");
    if (authForm) authForm.classList.remove("hidden");
    if (tabSignIn) tabSignIn.click();
  }

  if (btnBackToSignIn) {
    btnBackToSignIn.addEventListener("click", () => {
      hidePendingApprovalView();
    });
  }

  if (btnCheckApprovalStatus) {
    btnCheckApprovalStatus.addEventListener("click", async () => {
      const emailToCheck = lastAttemptedEmail || authEmailInput.value.trim();
      if (!emailToCheck) {
        alert("Please enter your email to check approval status.");
        hidePendingApprovalView();
        return;
      }

      btnCheckApprovalStatus.disabled = true;
      setAuthRequestLoading(true, "Checking approval status…");

      try {
        const { data: profile } = await window.supabaseManager.client
          .from("profiles")
          .select("role, approved")
          .eq("email", emailToCheck)
          .maybeSingle();

        if (!profile) {
          alert("Account Status: No account found or your registration was declined by the administrator.");
          hidePendingApprovalView();
          return;
        }

        const role = (profile.role || "").toLowerCase();
        if (profile.approved === true || (role !== "pending_approval" && profile.approved !== false)) {
          alert("🎉 Congratulations! Your account has been approved by the Super Admin.\n\nYou can now sign in!");
          hidePendingApprovalView();
        } else {
          alert("⏳ Status: Your account is still awaiting Super Admin approval.\n\nPlease wait for the administrator to approve you.");
        }
      } catch (err) {
        alert("Unable to verify status. Please try again in a few moments.");
      } finally {
        setAuthRequestLoading(false);
        btnCheckApprovalStatus.disabled = false;
        btnCheckApprovalStatus.innerHTML = `
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          Check Status
        `;
      }
    });
  }

  if (tabSignIn && tabSignUp) {
    tabSignIn.addEventListener("click", () => {
      isSignUpMode = false;
      tabSignIn.classList.add("active");
      tabSignUp.classList.remove("active");
      btnAuthSubmit.textContent = "Sign In";
      if (authErrorMsg) authErrorMsg.classList.add("hidden");
    });

    tabSignUp.addEventListener("click", () => {
      isSignUpMode = true;
      tabSignUp.classList.add("active");
      tabSignIn.classList.remove("active");
      btnAuthSubmit.textContent = "Register Account";
      if (authErrorMsg) authErrorMsg.classList.add("hidden");
    });
  }

  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = authEmailInput.value.trim();
      const password = authPasswordInput.value.trim();

      if (!email || !password) {
        showAuthError("Please enter both email and password.");
        return;
      }

      lastAttemptedEmail = email;
      btnAuthSubmit.disabled = true;
      setAuthRequestLoading(true, isSignUpMode ? "Creating your account…" : "Signing you in securely…");
      if (authErrorMsg) authErrorMsg.classList.add("hidden");

      let result;
      try {
        if (isSignUpMode) {
          result = await window.supabaseManager.signUp(email, password);
        } else {
          result = await window.supabaseManager.signIn(email, password);
        }
      } catch (err) {
        result = { error: { message: "Unable to reach the secure service. Please try again." } };
      } finally {
        setAuthRequestLoading(false);
        btnAuthSubmit.disabled = false;
        btnAuthSubmit.textContent = isSignUpMode ? "Register Account" : "Sign In";
      }

      if (result && result.error) {
        const errMsg = result.error.message || "";
        if (errMsg.toLowerCase().includes("pending approval") || errMsg.toLowerCase().includes("approval")) {
          showPendingApprovalView(email);
        } else {
          showAuthError(errMsg);
        }
      } else {
        if (isSignUpMode) {
          // Immediately display the Awaiting Super Admin Approval screen
          showPendingApprovalView(email);
        }
        authEmailInput.value = "";
        authPasswordInput.value = "";
      }
    });
  }

  function showAuthError(msg) {
    if (authErrorMsg) {
      authErrorMsg.textContent = msg;
      authErrorMsg.classList.remove("hidden");
    } else {
      alert(msg);
    }
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      window.supabaseManager.signOut();
    });
  }

  const btnCancelSuperAdminEdit = document.getElementById("btnCancelSuperAdminEdit");
  if (btnCancelSuperAdminEdit) {
    btnCancelSuperAdminEdit.addEventListener("click", () => {
      window.cancelSuperAdminEditCard();
    });
  }
}

// Initial setup
initLandRows();
render();
initViewModeControls();
init3DDragRotator();
initThemeToggle();
initAmbientFarmScene();
initCometCursor();
setTimeout(updateCardScale, 100);
initAuthAndAdminUI();
