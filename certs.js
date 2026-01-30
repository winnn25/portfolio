// UNVEIL-like 3D stack for certificates (vanilla JS)
// - Left “index” list
// - Right/center 3D card stack that responds to hover + mouse parallax

(function () {
  const shell = document.getElementById("unveilShell");
  const list = document.getElementById("certList");
  const stage = document.getElementById("certStage");

  if (!shell || !list || !stage) return;

  const items = Array.from(list.querySelectorAll(".unveil-item"));
  if (items.length === 0) return;

  // Build cards in the stage
  const cards = items.map((btn, i) => {
    const src = btn.getAttribute("data-preview") || "";
    const name = btn.innerText.trim();

    const card = document.createElement("div");
    card.className = "unveil-card";
    card.setAttribute("data-index", String(i));

    const img = document.createElement("img");
    img.alt = name;
    img.loading = "eager";
    img.decoding = "async";
    img.src = src;

    card.appendChild(img);
    stage.appendChild(card);
    return card;
  });

  // Preload images so hover feels instant
  cards.forEach((c) => {
    const src = c.querySelector("img")?.src;
    if (!src) return;
    const im = new Image();
    im.src = src;
  });

  let active = 0;
  let targetActive = 0;

  // Smooth active change (tiny easing)
  function tick() {
    if (active !== targetActive) {
      const diff = targetActive - active;
      active += diff * 0.18;
      if (Math.abs(diff) < 0.001) active = targetActive;
      layoutCards(active);
    }
    requestAnimationFrame(tick);
  }

  // Card layout inspired by UNVEIL’s “stack” depth
  function layoutCards(activeFloat) {
    const a = Math.round(activeFloat);
    items.forEach((btn, i) => {
      btn.classList.toggle("is-active", i === a);
    });

    cards.forEach((card, i) => {
      const d = i - a; // distance from active
      const ad = Math.abs(d);

      // Only render a window around the active one for a clean stack
      const visible = ad <= 7;
      card.style.opacity = visible ? String(Math.max(0.06, 1 - ad * 0.12)) : "0";
      card.style.pointerEvents = "none";

      const x = d * 70;
      const y = d * -46;
      const z = -ad * 120;
      const rz = d * -4;
      const s = d === 0 ? 1.06 : 0.98;

      // Small extra offset for “fan” effect
      const fan = Math.min(1, ad / 7);
      const x2 = x + (d > 0 ? 24 : -24) * fan;

      card.style.transform = `translate3d(${x2}px, ${y}px, ${z}px) rotateZ(${rz}deg) scale(${s})`;
      card.style.filter = ad === 0 ? "none" : `blur(${Math.min(2.2, ad * 0.25)}px)`;
      card.style.zIndex = String(1000 - ad);
    });
  }

  // Mouse parallax on the stage
  function onMove(e) {
    const r = shell.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width; // 0..1
    const ny = (e.clientY - r.top) / r.height;
    stage.style.setProperty("--mx", String(nx));
    stage.style.setProperty("--my", String(ny));
  }

  // Events
  items.forEach((btn, i) => {
    const set = () => (targetActive = i);
    btn.addEventListener("mouseenter", set);
    btn.addEventListener("focus", set);
  });

  shell.addEventListener("mousemove", onMove);

  // Init
  layoutCards(active);
  requestAnimationFrame(tick);
})();
