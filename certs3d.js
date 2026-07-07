if(!document.body.classList.contains("unveil-certs")){ /* certs-only */ throw new Error("certs3d loaded on non-certs page"); }
/**
 * UNVEIL-like 3D depth stack (vanilla CSS 3D):
 * - Each cert image is a 2D panel placed in 3D space (translateZ / translateX / rotateY).
 * - Mouse moves "camera" (rotX/rotY) with smoothing.
 * - Wheel/trackpad moves through the stack (continuous position).
 * - Left index hover/click snaps to a panel.
 * - Emoji pill filters update BOTH the list + the 3D stack.
 */
(function () {
  const stage = document.getElementById("stage3d");
  const scene = document.getElementById("scene3d");
  const list = document.getElementById("certList");
  const pills = Array.from(document.querySelectorAll(".unveil-pill"));

  if (!stage || !scene || !list) return;

  // All index buttons (source of truth)
  const allItems = Array.from(list.querySelectorAll(".unveil-item"));

  // Current filtered view
  let items = allItems.slice();
  let panels = [];

  // --- Tunables ---
  const DEPTH = 420;            // Z distance between panels
  const X_STEP = -120;          // sideways drift
  const Y_STEP = 10;            // slight vertical drift
  const BASE_ROT_Y = 14;
  const BASE_ROT_X = -3;
  const PANEL_ROT_Y = 18;
  const PANEL_ROT_Z = -1.25;
  const WHEEL_TO_INDEX = 0.003; // wheel delta -> continuous index movement

  // Smoothed camera rotation
  let targetRotX = 0, targetRotY = 0;
  let rotX = 0, rotY = 0;

  // Continuous position through the stack
  let targetPos = 0; // 0..(n-1)
  let pos = 0;

  // Active panel index
  let active = 0;

  // Expanded (pop-out) state
  let expandedIndex = -1;
  let targetExpand = 0; // 0..1
  let expand = 0;

  // --- Categories (per your new pill mapping) ---
  // Filters: all | ai | data | swe | webapp | other
  const categoriesByTitle = new Map([
    // AI / ML
    ["Career Essentials in Generative AI", ["ai"]],
    ["Generative AI", ["ai"]],
    ["Generative AI Professional Certificate", ["ai", "data"]],
    ["Machine Learning with Python Professional Certificate", ["ai", "data"]],
    ["Introduction to Artificial Intelligence", ["ai"]],
    ["Boost Your Productivity with AI Tools", ["ai", "other"]],
    ["Data Fundamentals", ["ai", "data"]],
    ["Databricks Fundamentals", ["ai", "data"]],

    // Software Eng
    ["Career Essentials in Software Development", ["swe", "webapp"]],
    ["Career Essentials in GitHub Professional Certificate", ["swe", "webapp"]],
    ["IT Leadership Professional Certificate", ["swe", "other"]],
    ["Atlassian Agile Project Management Professional Certificate", ["swe", "webapp", "other"]],
    ["Professional Soft Skills Learning Pathway", ["swe", "other"]],
    ["AWS Cloud Practitioner Essentials", ["swe"]],

    // Data Analysis
    ["Career Essentials in Data Analysis", ["data"]],
    ["SQL for Data Analysis", ["data"]],
    ["Complete Guide to Power BI for Data Analysts", ["data"]],

    // Web / App Dev
    ["Become a React Native Developer", ["webapp"]],
    ["UX Design Fundamentals", ["webapp", "other"]],

    // Others
    ["Public Speaking Skills Professional Certificate", ["other"]],
  ]);

  function getCategoriesForTitle(title) {
    return categoriesByTitle.get(title) || [];
  }

  // Annotate items with categories
  allItems.forEach((btn) => {
    const title = (btn.querySelector(".unveil-name")?.textContent || "").trim();
    const cats = getCategoriesForTitle(title);
    btn.dataset.categories = cats.join(",");
  });

  // --- Pill UI ---
  let activeFilter = "all";

  function setActivePill(value) {
    activeFilter = value || "all";
    pills.forEach((p) => {
      const isActive = p.dataset.filter === activeFilter;
      p.classList.toggle("unveil-pill--active", isActive);
      p.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  pills.forEach((p) => {
    p.addEventListener("click", () => {
      setActivePill(p.dataset.filter);
      applyFilters();
    });
  });

  // default
  setActivePill("all");

  // --- Build / Rebuild panels ---
  function buildPanels() {
    scene.innerHTML = "";
    panels = [];

    items.forEach((btn, i) => {
      const src = btn.getAttribute("data-preview");

      const panel = document.createElement("div");
      panel.className = "unveil-panel";
      panel.dataset.index = String(i);

      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.draggable = false;
      panel.appendChild(img);

      scene.appendChild(panel);
      panels.push(panel);
      // Disable per-panel pointer events so the "front" panel doesn't steal clicks.
      // We do click-picking at the stage level (see pickPanelIndex).
      panel.style.pointerEvents = "none";

      // Hover / focus / click on list snaps to that panel
      btn.onmouseenter = () => setActive(i, { snap: true });
      btn.onfocus = () => setActive(i, { snap: true });
      btn.onclick = (e) => {
        e.preventDefault();
        setActive(i, { snap: true });
        // Click on list item can also pop out (feels natural)
        popOut(i);
      };
    });

    // Reset camera bounds
    active = 0;
    targetPos = 0;
    pos = 0;
    setActive(0);
  }

  function isExpanded() {
    return expandedIndex !== -1 && targetExpand > 0.01;
  }

  function popOut(i) {
    if (!panels.length) return;
    expandedIndex = Math.max(0, Math.min(panels.length - 1, i));
    setActive(expandedIndex, { snap: true });
    targetExpand = 1;
  }

  function closePopOut() {
    targetExpand = 0;
  }

  function setActive(i, { snap = true } = {}) {
    if (!panels.length) return;
    active = Math.max(0, Math.min(panels.length - 1, i));

    // highlight
    items.forEach((b, idx) => b.classList.toggle("is-active", idx === active));

    // keep visible
    try {
      items[active].scrollIntoView({ block: "nearest" });
    } catch (_) {}

    if (snap) targetPos = active;
  }

  function getMaxPos() {
    return Math.max(0, panels.length - 1);
  }

  function syncActiveToPos() {
    if (!panels.length) return;
    const idx = Math.max(0, Math.min(panels.length - 1, Math.round(targetPos)));
    if (idx !== active) setActive(idx, { snap: false });
  }

  // --- Filtering ---
  function applyFilters() {
    const cat = activeFilter || "all";

    const nextItems = allItems.filter((btn) => {
      if (cat === "all") return true;
      const cats = (btn.dataset.categories || "").split(",").filter(Boolean);
      return cats.includes(cat);
    });

    // Show/hide in list + renumber
    let visibleIndex = 0;
    allItems.forEach((btn) => {
      const show = nextItems.includes(btn);
      btn.style.display = show ? "grid" : "none";
      if (show) {
        visibleIndex += 1;
        const no = btn.querySelector(".unveil-no");
        if (no) no.textContent = String(visibleIndex).padStart(2, "0");
      }
    });

    items = nextItems;
    buildPanels();
  }

  // Initial build
  buildPanels();

  // --- Wheel: travel through stack (prevent page scroll) ---
  function onWheel(e) {
    // Allow normal scrolling inside the left list
    if (e.target && e.target.closest && e.target.closest(".unveil-index")) return;

    // If a cert is popped out, any scroll closes it (no travel while expanded)
    if (isExpanded()) {
      e.preventDefault();
      closePopOut();
      return;
    }

    e.preventDefault();
    const delta = e.deltaY;
    const maxPos = getMaxPos();
    targetPos = Math.max(0, Math.min(maxPos, targetPos + delta * WHEEL_TO_INDEX));
    syncActiveToPos();
  }
  window.addEventListener("wheel", onWheel, { passive: false });
  stage.addEventListener("wheel", onWheel, { passive: false });

  // --- Touch Swipe Navigation Support for Mobile ---
  let touchStartY = 0;
  let touchStartX = 0;
  let touchStartPos = 0;
  let isSwiping = false;

  stage.addEventListener("touchstart", (e) => {
    if (isExpanded()) return;
    if (e.target && e.target.closest && e.target.closest(".unveil-index")) return;
    const touch = e.touches[0];
    touchStartY = touch.clientY;
    touchStartX = touch.clientX;
    touchStartPos = targetPos;
    isSwiping = true;
  }, { passive: true });

  stage.addEventListener("touchmove", (e) => {
    if (!isSwiping || isExpanded()) return;
    const touch = e.touches[0];
    const diffY = touch.clientY - touchStartY;
    const diffX = touch.clientX - touchStartX;
    
    // Choose vertical drag primarily, but horizontal drag also works smoothly
    const swipeDelta = Math.abs(diffY) > Math.abs(diffX) ? -diffY : -diffX;
    const factor = 0.007; // perfectly balanced swipe velocity multiplier
    const maxPos = getMaxPos();
    
    targetPos = Math.max(0, Math.min(maxPos, touchStartPos + swipeDelta * factor));
    syncActiveToPos();
  }, { passive: true });

  stage.addEventListener("touchend", () => {
    isSwiping = false;
  }, { passive: true });

  
  // --- Click picking on the 3D stack ---
  // Because panels overlap in screen space, the top panel can steal clicks.
  // We pick the "intended" panel by checking which panel's screen-rect contains the pointer
  // and choosing the closest rect-center to the pointer.
  function pickPanelIndex(clientX, clientY) {
    if (!panels.length) return -1;
    let best = -1;
    let bestScore = Infinity;
    for (let i = 0; i < panels.length; i++) {
      const el = panels[i];
      const r = el.getBoundingClientRect();
      if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) continue;
      const cx = (r.left + r.right) / 2;
      const cy = (r.top + r.bottom) / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const score = dx * dx + dy * dy;
      if (score < bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  // Click/tap anywhere on the stage to pop out the panel under the pointer.
  // Use pointerdown + click for robustness across devices.
  function handleStageActivate(e) {
    if (isExpanded()) return; // expanded handled elsewhere
    // Ignore clicks coming from the left index list
    if (e.target && e.target.closest && e.target.closest(".unveil-index")) return;
    // Left click only (when applicable)
    if (typeof e.button === "number" && e.button !== 0) return;

    const idx = pickPanelIndex(e.clientX, e.clientY);
    if (idx !== -1) {
      popOut(idx);
      e.preventDefault();
      // Prevent the document "outside click" handler from immediately closing
      // the pop-out on the same interaction.
      e.stopPropagation();
    }
  }

  stage.addEventListener("pointerdown", handleStageActivate, true);
  stage.addEventListener("click", handleStageActivate, true);

// Click/tap outside closes pop-out
  document.addEventListener("pointerdown", (e) => {
    if (!isExpanded()) return;
    if (e.target && e.target.closest && e.target.closest(".unveil-panel")) return;
    closePopOut();
  });

  // ESC closes
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isExpanded()) closePopOut();
  });
// Mouse -> camera rotation
  stage.addEventListener("mousemove", (e) => {
    const r = stage.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    targetRotY = nx * 8;
    targetRotX = -ny * 6;
  });
  stage.addEventListener("mouseleave", () => {
    targetRotX = 0;
    targetRotY = 0;
  });

  // Arrow keys
  window.addEventListener("keydown", (e) => {
    const maxPos = getMaxPos();
    if (isExpanded()) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      targetPos = Math.min(maxPos, targetPos + 1);
      syncActiveToPos();
    }
    if (e.key === "ArrowUp" || e.key === "PageUp") {
      targetPos = Math.max(0, targetPos - 1);
      syncActiveToPos();
    }
  });

  // --- Render loop ---
  function render() {
    // Smooth camera
    rotX += (targetRotX - rotX) * 0.08;
    rotY += (targetRotY - rotY) * 0.08;
    pos += (targetPos - pos) * 0.10;
    expand += (targetExpand - expand) * 0.12;

    // When fully closed, forget expanded index
    if (expand < 0.02 && targetExpand === 0) expandedIndex = -1;

    const sceneRx = (rotX + BASE_ROT_X) * (1 - expand);
    const sceneRy = (rotY + BASE_ROT_Y) * (1 - expand);
    scene.style.transform = `rotateX(${sceneRx}deg) rotateY(${sceneRy}deg)`;

    for (let i = 0; i < panels.length; i++) {
      const p = panels[i];
      const t = i - pos;

      let z = -(t * DEPTH);
      z = Math.min(z, 180);

      const x = t * X_STEP;
      const y = t * Y_STEP;

      const isMobile = window.innerWidth <= 980;
      const targetNormalWidth = isMobile ? Math.min(window.innerWidth * 0.72, 280) : 520;
      const baseScale = targetNormalWidth / 1040;

      // Base transform (stack)
      let tx = x;
      let ty = y;
      let tz = z;
      let ry = PANEL_ROT_Y;
      let rz = PANEL_ROT_Z;
      let sc = baseScale;

      // Pop-out effect
      if (expandedIndex !== -1) {
        const isTarget = i === expandedIndex;
        p.style.pointerEvents = isTarget ? "auto" : "none";

        if (isTarget) {
          const targetZ = isMobile ? 30 : 80;
          const zoomFactor = isMobile ? 1.05 : 1.2;
          const targetScale = baseScale * zoomFactor;

          // Bring selected card forward and center
          tx = tx + (0 - tx) * expand;
          ty = ty + (0 - ty) * expand;
          tz = tz + (targetZ - tz) * expand;
          ry = ry + (0 - ry) * expand;
          rz = rz + (0 - rz) * expand;
          sc = sc + (targetScale - sc) * expand;
        } else {
          // Push others back and fade
          tz = tz - 220 * expand;
          sc = sc - (baseScale * 0.04) * expand;
        }
      }

      p.style.transform =
        `translate(-50%, -50%) translateX(${tx}px) translateY(${ty}px) translateZ(${tz}px) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${sc})`;

      const dist = Math.abs(t) / 6;
      let opacity = Math.max(0.10, 1 - dist * 0.85) * (t < -0.35 ? 0.15 : 1);
      let blur = Math.min(7, dist * 7);

      if (expandedIndex !== -1) {
        if (i === expandedIndex) {
          // ACTIVE CARD: Absolute zero blur to ensure perfect clarity
          blur = 0;
        } else {
          opacity = opacity * (1 - 0.85 * expand);
          blur = blur + 4 * expand;
        }
      }

      p.style.opacity = opacity.toFixed(3);
      
      // Completely discard the blur filter for sharp, crisp subpixel rendering when blur is negligible
      if (blur > 0.05) {
        p.style.filter = `blur(${blur.toFixed(2)}px)`;
      } else {
        p.style.filter = "none";
      }
      p.style.zIndex = String(1000 - Math.round(Math.abs(t) * 40));
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();
