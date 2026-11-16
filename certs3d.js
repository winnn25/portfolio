/**
 * UNVEIL-like 3D depth stack (vanilla CSS 3D):
 * - Each cert image is a 2D panel placed in 3D space (translateZ / translateX / rotateY).
 * - Mouse moves "camera" (rotX/rotY) with smoothing.
 * - Wheel/trackpad/swipe moves through the stack (continuous position).
 * - Left index hover/click snaps to a panel.
 * - Emoji pill filters update BOTH the list + the 3D stack.
 *
 * Performance notes:
 * - The animation loop only runs while something is moving, then goes to sleep.
 * - Panel styles are only written when their value actually changes.
 * - Panels the camera has already passed (invisible) are hidden.
 */
(function () {
  if (!document.body.classList.contains("unveil-certs")) return;

  const stage = document.getElementById("stage3d");
  const scene = document.getElementById("scene3d");
  const list = document.getElementById("certList");
  const pills = Array.from(document.querySelectorAll(".unveil-pill"));

  if (!stage || !scene || !list) return;

  // All index buttons (source of truth). Categories live in each button's data-categories.
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
  const WHEEL_TO_INDEX = 0.006; // wheel delta -> continuous index movement
  const HIDE_BEHIND = -6;       // panels further behind the camera than this are invisible
  const EPS = 0.001;            // "close enough" for the smoothing to stop

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

  // --- Render scheduling: only animate while values are still moving ---
  let rafId = 0;
  function kick() {
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  // Write a style property only when it changed (avoids needless style recalcs)
  function setStyle(el, prop, value) {
    const cache = el._styleCache || (el._styleCache = {});
    if (cache[prop] === value) return;
    cache[prop] = value;
    el.style[prop] = value;
  }

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

  setActivePill("all");

  // --- Build / Rebuild panels ---
  function buildPanels() {
    scene.innerHTML = "";
    panels = [];
    expandedIndex = -1;
    targetExpand = 0;
    expand = 0;

    items.forEach((btn, i) => {
      const panel = document.createElement("div");
      panel.className = "unveil-panel";
      panel.dataset.index = String(i);
      // Panels never take pointer events directly; clicks are picked at stage level.
      panel.style.pointerEvents = "none";

      const img = document.createElement("img");
      img.src = btn.getAttribute("data-preview");
      img.alt = (btn.querySelector(".unveil-name")?.textContent || "").trim();
      img.decoding = "async";
      img.draggable = false;
      panel.appendChild(img);

      scene.appendChild(panel);
      panels.push(panel);

      // Hover / focus / click on list snaps to that panel
      btn.onmouseenter = () => setActive(i, { snap: true });
      btn.onfocus = () => setActive(i, { snap: true });
      btn.onclick = (e) => {
        e.preventDefault();
        popOut(i);
      };
    });

    active = 0;
    targetPos = 0;
    pos = 0;
    setActive(0);
    kick();
  }

  function isExpanded() {
    return expandedIndex !== -1 && targetExpand > 0.01;
  }

  function popOut(i) {
    if (!panels.length) return;
    expandedIndex = Math.max(0, Math.min(panels.length - 1, i));
    setActive(expandedIndex, { snap: true });
    targetExpand = 1;
    kick();
  }

  function closePopOut() {
    targetExpand = 0;
    kick();
  }

  function setActive(i, { snap = true } = {}) {
    if (!panels.length) return;
    active = Math.max(0, Math.min(panels.length - 1, i));

    items.forEach((b, idx) => b.classList.toggle("is-active", idx === active));
    try {
      items[active].scrollIntoView({ block: "nearest" });
    } catch (_) {}

    if (snap) targetPos = active;
    kick();
  }

  function getMaxPos() {
    return Math.max(0, panels.length - 1);
  }

  function moveBy(delta) {
    targetPos = Math.max(0, Math.min(getMaxPos(), targetPos + delta));
    const idx = Math.round(targetPos);
    if (idx !== active) setActive(idx, { snap: false });
    kick();
  }

  // --- Filtering ---
  function applyFilters() {
    const cat = activeFilter || "all";

    items = allItems.filter((btn) => {
      if (cat === "all") return true;
      return (btn.dataset.categories || "").split(",").includes(cat);
    });

    // Show/hide in list + renumber
    let visibleIndex = 0;
    allItems.forEach((btn) => {
      const show = items.includes(btn);
      btn.style.display = show ? "grid" : "none";
      if (show) {
        visibleIndex += 1;
        const no = btn.querySelector(".unveil-no");
        if (no) no.textContent = String(visibleIndex).padStart(2, "0");
      }
    });

    buildPanels();
  }

  buildPanels();

  // --- Wheel: travel through stack (prevent page scroll) ---
  window.addEventListener("wheel", (e) => {
    // Allow normal scrolling inside the left list
    if (e.target?.closest?.(".unveil-index")) return;
    e.preventDefault();

    // If a cert is popped out, any scroll closes it (no travel while expanded)
    if (isExpanded()) {
      closePopOut();
      return;
    }
    moveBy(e.deltaY * WHEEL_TO_INDEX);
  }, { passive: false });

  // --- Touch swipe navigation (mobile) ---
  let touchStartY = 0;
  let touchStartX = 0;
  let touchStartPos = 0;
  let isSwiping = false;

  stage.addEventListener("touchstart", (e) => {
    if (isExpanded()) return;
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
    // Vertical drag primarily, horizontal drag also works
    const swipeDelta = Math.abs(diffY) > Math.abs(diffX) ? -diffY : -diffX;
    moveBy(touchStartPos + swipeDelta * 0.007 - targetPos);
  }, { passive: true });

  stage.addEventListener("touchend", () => {
    isSwiping = false;
  }, { passive: true });

  // --- Click picking on the 3D stack ---
  // Panels overlap in screen space, so pick the panel whose screen-rect contains
  // the pointer and whose centre is closest to it.
  function pickPanelIndex(clientX, clientY) {
    let best = -1;
    let bestScore = Infinity;
    for (let i = 0; i < panels.length; i++) {
      if (panels[i].style.visibility === "hidden") continue;
      const r = panels[i].getBoundingClientRect();
      if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) continue;
      const dx = clientX - (r.left + r.right) / 2;
      const dy = clientY - (r.top + r.bottom) / 2;
      const score = dx * dx + dy * dy;
      if (score < bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  // Click/tap on the stage pops out the panel under the pointer.
  function handleStageActivate(e) {
    if (isExpanded()) return;
    if (typeof e.button === "number" && e.button !== 0) return;

    const idx = pickPanelIndex(e.clientX, e.clientY);
    if (idx !== -1) {
      popOut(idx);
      e.preventDefault();
      // Stop the document "outside click" handler closing it straight away
      e.stopPropagation();
    }
  }

  stage.addEventListener("pointerdown", handleStageActivate, true);
  stage.addEventListener("click", handleStageActivate, true);

  // Click/tap outside closes pop-out
  document.addEventListener("pointerdown", (e) => {
    if (!isExpanded()) return;
    if (e.target?.closest?.(".unveil-panel")) return;
    closePopOut();
  });

  // Keyboard: ESC closes, arrows / page keys travel
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isExpanded()) closePopOut();
    if (isExpanded()) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") moveBy(1);
    if (e.key === "ArrowUp" || e.key === "PageUp") moveBy(-1);
  });

  // Mouse -> camera rotation
  stage.addEventListener("mousemove", (e) => {
    const r = stage.getBoundingClientRect();
    targetRotY = (((e.clientX - r.left) / r.width) * 2 - 1) * 8;
    targetRotX = -(((e.clientY - r.top) / r.height) * 2 - 1) * 6;
    kick();
  });
  stage.addEventListener("mouseleave", () => {
    targetRotX = 0;
    targetRotY = 0;
    kick();
  });

  window.addEventListener("resize", kick, { passive: true });

  // --- Render ---
  function draw() {
    const sceneRx = (rotX + BASE_ROT_X) * (1 - expand);
    const sceneRy = (rotY + BASE_ROT_Y) * (1 - expand);
    setStyle(scene, "transform", `rotateX(${sceneRx.toFixed(3)}deg) rotateY(${sceneRy.toFixed(3)}deg)`);

    const isMobile = window.innerWidth <= 980;
    const baseScale = (isMobile ? Math.min(window.innerWidth * 0.72, 280) : 520) / 1040;
    const targetZ = isMobile ? 30 : 80;
    const targetScale = baseScale * (isMobile ? 1.05 : 1.2);

    for (let i = 0; i < panels.length; i++) {
      const p = panels[i];
      const t = i - pos;
      const isTarget = i === expandedIndex;

      // Panels the camera has passed are effectively invisible; skip their work.
      if (t < HIDE_BEHIND && !isTarget) {
        setStyle(p, "visibility", "hidden");
        continue;
      }
      setStyle(p, "visibility", "visible");

      // Base transform (stack)
      let tx = t * X_STEP;
      let ty = t * Y_STEP;
      let tz = Math.min(-(t * DEPTH), 180);
      let ry = PANEL_ROT_Y;
      let rz = PANEL_ROT_Z;
      let sc = baseScale;

      // Pop-out effect
      if (expandedIndex !== -1) {
        setStyle(p, "pointerEvents", isTarget ? "auto" : "none");
        if (isTarget) {
          // Bring selected card forward and centre
          tx += (0 - tx) * expand;
          ty += (0 - ty) * expand;
          tz += (targetZ - tz) * expand;
          ry += (0 - ry) * expand;
          rz += (0 - rz) * expand;
          sc += (targetScale - sc) * expand;
        } else {
          // Push others back
          tz -= 220 * expand;
          sc -= baseScale * 0.04 * expand;
        }
      } else {
        setStyle(p, "pointerEvents", "none");
      }

      setStyle(p, "transform",
        `translate(-50%, -50%) translateX(${tx.toFixed(2)}px) translateY(${ty.toFixed(2)}px) translateZ(${tz.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${sc.toFixed(4)})`);

      const dist = Math.abs(t) / 6;
      let opacity = Math.max(0.10, 1 - dist * 0.85) * (t < -0.35 ? 0.15 : 1);
      let blur = Math.min(7, dist * 7);

      if (expandedIndex !== -1) {
        if (isTarget) {
          blur = 0; // perfectly sharp when popped out
        } else {
          opacity *= 1 - 0.85 * expand;
          blur += 4 * expand;
        }
      }

      setStyle(p, "opacity", opacity.toFixed(2));
      // Quarter-pixel steps: visually identical, far fewer repaints
      const b = Math.round(blur * 4) / 4;
      setStyle(p, "filter", b > 0 ? `blur(${b}px)` : "none");
      setStyle(p, "zIndex", String(1000 - Math.round(Math.abs(t) * 40)));
    }
  }

  function frame() {
    rotX += (targetRotX - rotX) * 0.08;
    rotY += (targetRotY - rotY) * 0.08;
    pos += (targetPos - pos) * 0.10;
    expand += (targetExpand - expand) * 0.12;

    const settled =
      Math.abs(targetRotX - rotX) < EPS &&
      Math.abs(targetRotY - rotY) < EPS &&
      Math.abs(targetPos - pos) < EPS &&
      Math.abs(targetExpand - expand) < EPS;

    if (settled) {
      rotX = targetRotX;
      rotY = targetRotY;
      pos = targetPos;
      expand = targetExpand;
    }

    // When fully closed, forget expanded index
    if (expand < 0.02 && targetExpand === 0) expandedIndex = -1;

    draw();
    rafId = settled ? 0 : requestAnimationFrame(frame);
  }

  kick();
})();
