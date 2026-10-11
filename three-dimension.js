/**
 * LifeFlow 3D Spatial Hyper-Drive Engine - Turbo Performance & Glitch-Free Edition
 * Features:
 * 1. Three.js Full Spatial Starfield & Cyber-Grid
 * 2. Glitch-Free Interactive Control: Checkboxes, buttons & interactive elements never flicker
 * 3. Top-Bar Synchronized 3D ON / OFF Pill Button with localStorage memory
 * 4. 60 FPS Throttling & Tab-Visibility Sleep Mode
 */

(function () {
  'use strict';

  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let threeScene, threeCamera, threeRenderer;
  let particlesMesh, cyberGridMesh, floatingGroup;
  let mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;
  let windowHalfX = window.innerWidth / 2;
  let windowHalfY = window.innerHeight / 2;

  // Read saved preference from localStorage
  const savedPref = localStorage.getItem('lifeflow_3d_active');
  let is3DActive = savedPref !== null ? (savedPref === 'true') : !prefersReducedMotion;

  let animId = null;
  let isPageVisible = true;
  let lastFrameTime = 0;
  const targetFPS = 60;
  const frameInterval = 1000 / targetFPS;

  // Initialize ThreeJS WebGL Space
  function initThreeCanvas() {
    const container = document.getElementById('three-spatial-canvas-container');
    if (!container || typeof THREE === 'undefined') return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    threeScene = new THREE.Scene();
    const isDark = document.documentElement.classList.contains('dark');
    threeScene.fog = new THREE.FogExp2(isDark ? 0x060919 : 0xf1f5f9, 0.0012);

    threeCamera = new THREE.PerspectiveCamera(60, width / height, 1, 3500);
    threeCamera.position.z = 700;

    threeRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isTouchDevice,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    threeRenderer.setSize(width, height);
    threeRenderer.setClearColor(0x000000, 0);
    container.appendChild(threeRenderer.domElement);

    // 1. Cyber 3D Infinite Grid Horizon
    const gridHelper = new THREE.GridHelper(2200, 32, isDark ? 0x6366f1 : 0x818cf8, isDark ? 0x1e1e38 : 0xd8b4fe);
    gridHelper.position.y = -380;
    gridHelper.rotation.x = 0.08;
    cyberGridMesh = gridHelper;
    threeScene.add(cyberGridMesh);

    // 2. 3D Particle Galaxy System
    const particleCount = isTouchDevice ? 120 : 250;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorPalette = [
      new THREE.Color(0x6366f1),
      new THREE.Color(0xa855f7),
      new THREE.Color(0xec4899),
      new THREE.Color(0x06b6d4),
      new THREE.Color(0x10b981)
    ];

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 2200;
      positions[idx + 1] = (Math.random() - 0.5) * 1500;
      positions[idx + 2] = (Math.random() - 0.5) * 1500;

      const clr = colorPalette[i % colorPalette.length];
      colors[idx] = clr.r;
      colors[idx + 1] = clr.g;
      colors[idx + 2] = clr.b;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Shared particle sprite texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, 'rgba(165, 180, 252, 0.85)');
    grad.addColorStop(0.7, 'rgba(99, 102, 241, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const pMaterial = new THREE.PointsMaterial({
      size: 16,
      map: texture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    particlesMesh = new THREE.Points(geom, pMaterial);
    threeScene.add(particlesMesh);

    // 3. Floating 3D Kinetic Polyhedrons
    floatingGroup = new THREE.Group();

    // Central Core
    const icoMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0x818cf8 : 0x6366f1,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.38 : 0.22
    });

    const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(85, 1), icoMat);
    coreMesh.position.set(400, 160, -250);
    floatingGroup.add(coreMesh);

    // Orbit Ring
    const ringGeo = new THREE.TorusGeometry(120, 2, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: isDark ? 0.35 : 0.2
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    coreMesh.add(ringMesh);

    // Left Torus Knot
    const knotMesh = new THREE.Mesh(
      new THREE.TorusKnotGeometry(48, 12, 48, 8),
      new THREE.MeshBasicMaterial({
        color: isDark ? 0xc084fc : 0x9333ea,
        wireframe: true,
        transparent: true,
        opacity: isDark ? 0.3 : 0.18
      })
    );
    knotMesh.position.set(-440, -120, -300);
    floatingGroup.add(knotMesh);

    // Octahedron
    const octMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(55, 0),
      new THREE.MeshBasicMaterial({
        color: isDark ? 0x22d3ee : 0x0891b2,
        wireframe: true,
        transparent: true,
        opacity: isDark ? 0.35 : 0.2
      })
    );
    octMesh.position.set(-320, 220, -200);
    floatingGroup.add(octMesh);

    // Dodecahedron
    const dodMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(55, 0),
      new THREE.MeshBasicMaterial({
        color: isDark ? 0x34d399 : 0x059669,
        wireframe: true,
        transparent: true,
        opacity: isDark ? 0.32 : 0.18
      })
    );
    dodMesh.position.set(340, -240, -180);
    floatingGroup.add(dodMesh);

    threeScene.add(floatingGroup);

    if (animId) cancelAnimationFrame(animId);
    if (is3DActive) animate(0);
  }

  // Animation Loop with 60 FPS Throttling & Visibility Sleep
  function animate(timestamp) {
    if (!is3DActive || !isPageVisible) return;
    animId = requestAnimationFrame(animate);

    const elapsed = timestamp - lastFrameTime;
    if (elapsed < frameInterval) return;
    lastFrameTime = timestamp - (elapsed % frameInterval);

    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    const time = timestamp * 0.0006;

    if (particlesMesh) {
      particlesMesh.rotation.y = time * 0.05 + mouseX * 0.00025;
      particlesMesh.rotation.x = time * 0.025 + mouseY * 0.00025;
    }

    if (cyberGridMesh) {
      cyberGridMesh.position.z = Math.sin(time) * 35;
      cyberGridMesh.rotation.z = mouseX * 0.00005;
    }

    if (floatingGroup) {
      floatingGroup.children.forEach((child, i) => {
        child.rotation.x += 0.004 * (i + 1);
        child.rotation.y += 0.005 * (i + 1);
        child.position.y += Math.sin(time * 2 + i * 1.5) * 0.35;
      });
      floatingGroup.rotation.y = mouseX * 0.0002;
      floatingGroup.rotation.x = mouseY * 0.0002;
    }

    if (threeCamera) {
      threeCamera.position.x += (mouseX * 0.28 - threeCamera.position.x) * 0.04;
      threeCamera.position.y += (-mouseY * 0.28 - threeCamera.position.y) * 0.04;
      threeCamera.lookAt(threeScene.position);
    }

    if (threeRenderer && threeScene && threeCamera) {
      threeRenderer.render(threeScene, threeCamera);
    }
  }

  // Pause render loop on hidden tabs
  document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;
    if (isPageVisible && is3DActive) {
      lastFrameTime = performance.now();
      if (!animId) animate(lastFrameTime);
    } else if (!isPageVisible && animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  });

  // Update theme colors
  function updateTheme() {
    if (!threeScene) return;
    const isDark = document.documentElement.classList.contains('dark');
    threeScene.fog.color.setHex(isDark ? 0x060919 : 0xf1f5f9);
    if (cyberGridMesh) {
      cyberGridMesh.material.color.setHex(isDark ? 0x6366f1 : 0x818cf8);
    }
  }

  // Debounced window resize
  let resizeTimeout = null;
  function onResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      windowHalfX = window.innerWidth / 2;
      windowHalfY = window.innerHeight / 2;
      if (threeCamera && threeRenderer) {
        threeCamera.aspect = window.innerWidth / window.innerHeight;
        threeCamera.updateProjectionMatrix();
        threeRenderer.setSize(window.innerWidth, window.innerHeight);
      }
    }, 100);
  }

  // RAF throttled mouse move
  let mouseRafPending = false;
  function onMouseMove(e) {
    if (mouseRafPending) return;
    mouseRafPending = true;
    requestAnimationFrame(() => {
      targetMouseX = e.clientX - windowHalfX;
      targetMouseY = e.clientY - windowHalfY;
      mouseRafPending = false;
    });
  }

  // GLITCH-FREE 3D Card Physics
  // Excludes interactive sub-elements like checkboxes, buttons, and inputs so hovering them NEVER glitches the card
  function initCardTilt() {
    if (isTouchDevice || prefersReducedMotion) return;

    const selector = '.card, .auth-card, .metric-card, .goal-card, .attendance-card, .stat-card, .hero-glass';
    const cards = document.querySelectorAll(selector);

    cards.forEach(card => {
      if (card.dataset.tilt3dInit) return;
      card.dataset.tilt3dInit = 'true';

      card.classList.add('card-3d-interactive');

      // Glare overlay
      if (!card.querySelector('.card-3d-glare')) {
        const glare = document.createElement('div');
        glare.className = 'card-3d-glare';
        card.appendChild(glare);
      }

      let tiltRaf = null;

      card.addEventListener('mouseenter', () => {
        card.style.transition = 'transform 0.12s ease-out, box-shadow 0.2s ease';
      });

      card.addEventListener('mousemove', (e) => {
        if (!is3DActive) return;

        // Anti-glitch: If user is hovering over or interacting with a checkbox or form button, do not violently rotate the card
        if (e.target && e.target.closest('.routine-checkbox, button, input, select, textarea, a, .delete-btn-step1')) {
          return;
        }

        if (tiltRaf) return;
        tiltRaf = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const rotX = ((centerY - y) / centerY) * 7; // Smooth 7 degree max for stability
          const rotY = ((x - centerX) / centerX) * 7;

          card.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(8px) scale3d(1.015, 1.015, 1.015)`;

          const glare = card.querySelector('.card-3d-glare');
          if (glare) {
            const gx = (x / rect.width) * 100;
            const gy = (y / rect.height) * 100;
            glare.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.18) 0%, rgba(129,140,248,0.08) 40%, rgba(255,255,255,0) 75%)`;
            glare.style.opacity = '1';
          }
          tiltRaf = null;
        });
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        if (tiltRaf) {
          cancelAnimationFrame(tiltRaf);
          tiltRaf = null;
        }
        card.style.transition = 'transform 0.5s cubic-bezier(0.2, 1, 0.22, 1), box-shadow 0.5s ease';
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)';
        const glare = card.querySelector('.card-3d-glare');
        if (glare) glare.style.opacity = '0';
      });
    });
  }

  // 3D Cursor Aura
  function initHoloCursor() {
    if (isTouchDevice || prefersReducedMotion) return;

    let aura = document.getElementById('three-cursor-spotlight');
    if (!aura) {
      aura = document.createElement('div');
      aura.id = 'three-cursor-spotlight';
      aura.className = 'three-cursor-spotlight';
      document.body.appendChild(aura);
    }

    let cx = windowHalfX, cy = windowHalfY, curX = cx, curY = cy;

    window.addEventListener('mousemove', (e) => {
      cx = e.clientX;
      cy = e.clientY;
    }, { passive: true });

    function renderAura() {
      if (!isPageVisible || !is3DActive) {
        requestAnimationFrame(renderAura);
        return;
      }
      curX += (cx - curX) * 0.15;
      curY += (cy - curY) * 0.15;
      aura.style.transform = `translate3d(${curX - 250}px, ${curY - 250}px, 0)`;
      requestAnimationFrame(renderAura);
    }
    requestAnimationFrame(renderAura);
  }

  // 3D Magnetic Buttons (Filtered to avoid checkbox glitches)
  function initMagneticButtons() {
    if (isTouchDevice || prefersReducedMotion) return;

    const btns = document.querySelectorAll('.nav-link, button.bg-accent, .streak-badge');
    btns.forEach(btn => {
      if (btn.dataset.magneticInit) return;
      btn.dataset.magneticInit = 'true';

      btn.addEventListener('mousemove', (e) => {
        if (!is3DActive) return;
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate3d(${x * 0.18}px, ${y * 0.18}px, 4px) scale(1.03)`;
      }, { passive: true });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate3d(0, 0, 0) scale(1)';
        btn.style.transition = 'transform 0.4s cubic-bezier(0.2, 1, 0.22, 1)';
      });

      btn.addEventListener('mouseenter', () => {
        btn.style.transition = 'transform 0.1s ease-out';
      });
    });
  }

  // Debounced DOM Observer for Dynamic Pages
  let domDebounce = null;
  function observeDOM() {
    const observer = new MutationObserver(() => {
      clearTimeout(domDebounce);
      domDebounce = setTimeout(() => {
        initCardTilt();
        initMagneticButtons();
      }, 50);
    });
    const target = document.getElementById('page-content') || document.body;
    observer.observe(target, { childList: true, subtree: true });
  }

  // Global Toggle Function
  window.toggle3DFX = function () {
    is3DActive = !is3DActive;

    try {
      localStorage.setItem('lifeflow_3d_active', is3DActive ? 'true' : 'false');
    } catch (e) {}

    const canvasContainer = document.getElementById('three-spatial-canvas-container');
    const spotlight = document.getElementById('three-cursor-spotlight');
    if (canvasContainer) canvasContainer.style.display = is3DActive ? 'block' : 'none';
    if (spotlight) spotlight.style.display = is3DActive ? 'block' : 'none';

    if (is3DActive && !animId) {
      lastFrameTime = performance.now();
      animate(lastFrameTime);
    }

    // Update Top Pill Switch
    const globalBtn = document.getElementById('global-3d-toggle-btn');
    const statusText = document.getElementById('btn-3d-status-text');
    const pulseDot = document.getElementById('btn-3d-pulse');
    const staticDot = document.getElementById('btn-3d-dot');
    if (globalBtn && statusText) {
      if (is3DActive) {
        statusText.textContent = '3D Animation: ON';
        globalBtn.classList.remove('opacity-60', 'grayscale');
        if (pulseDot) pulseDot.classList.remove('hidden');
        if (staticDot) staticDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-indigo-500';
      } else {
        statusText.textContent = '3D Animation: OFF';
        globalBtn.classList.add('opacity-60');
        if (pulseDot) pulseDot.classList.add('hidden');
        if (staticDot) staticDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-gray-400';
      }
    }

    // Update Header 3D button
    const headerBtn = document.getElementById('toggle-3d-mode-btn');
    if (headerBtn) {
      headerBtn.classList.toggle('text-accent', is3DActive);
      headerBtn.classList.toggle('bg-accent/15', is3DActive);
    }

    // Reset any active tilt transforms
    document.querySelectorAll('.card-3d-interactive').forEach(card => {
      card.style.transform = '';
      const glare = card.querySelector('.card-3d-glare');
      if (glare) glare.style.opacity = '0';
    });

    if (typeof showToast === 'function') {
      showToast(is3DActive ? '✨ 3D Animation ON (Active)' : '🛑 3D Animation OFF (Turned Off)', is3DActive ? 'info' : 'warning');
    }
  };

  function start() {
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        setTimeout(updateTheme, 60);
      });
    }

    initThreeCanvas();
    initHoloCursor();
    initCardTilt();
    initMagneticButtons();
    observeDOM();

    // Initial state setup on page load
    if (!is3DActive) {
      const canvasContainer = document.getElementById('three-spatial-canvas-container');
      const spotlight = document.getElementById('three-cursor-spotlight');
      if (canvasContainer) canvasContainer.style.display = 'none';
      if (spotlight) spotlight.style.display = 'none';

      const globalBtn = document.getElementById('global-3d-toggle-btn');
      const statusText = document.getElementById('btn-3d-status-text');
      const pulseDot = document.getElementById('btn-3d-pulse');
      const staticDot = document.getElementById('btn-3d-dot');
      if (globalBtn && statusText) {
        statusText.textContent = '3D Animation: OFF';
        globalBtn.classList.add('opacity-60');
        if (pulseDot) pulseDot.classList.add('hidden');
        if (staticDot) staticDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-gray-400';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.LifeFlow3D = {
    reinit: () => {
      initCardTilt();
      initMagneticButtons();
    },
    updateTheme: updateTheme
  };
})();
