// magazine.js — page flip + scoped drag/rotate + per-page persistence
console.log("✅ magazine.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  // ---------- PAGE FLIP ----------
  const pages = [
    document.getElementById("mag-page-1"),
    document.getElementById("mag-page-2"),
    document.getElementById("mag-page-3"),
  ].filter(Boolean);

  let index = Math.max(0, pages.findIndex(p => p && p.classList.contains("is-active")));
  if (index < 0) index = 0;

  function flipTo(i, dir) {
    if (i === index || i < 0 || i >= pages.length) return;
    const cur = pages[index], nxt = pages[i];
    nxt.classList.add(dir === "right" ? "turn-in-right" : "turn-in-left", "is-active");
    nxt.removeAttribute("aria-hidden");
    cur.classList.add(dir === "right" ? "turn-out-right" : "turn-out-left");

    setTimeout(() => {
      cur.classList.remove("is-active", "turn-out-right", "turn-out-left");
      cur.setAttribute("aria-hidden", "true");
      nxt.classList.remove("turn-in-right", "turn-in-left");
      index = i;
      // re-apply saved transforms after the flip settles
      restorePositions();
    }, 520);
  }

  // Click bottom corners to flip
  const frame = document.querySelector(".frame");
  const CORNER = 120;
  if (frame) {
    frame.addEventListener("click", (e) => {
      const r = frame.getBoundingClientRect();
      if (e.clientY <= r.bottom - CORNER) return;
      if (e.clientX > r.right - CORNER) flipTo(index + 1, "right");
      else if (e.clientX < r.left + CORNER) flipTo(index - 1, "left");
    });
  }

  // Arrow keys
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") flipTo(index + 1, "right");
    if (e.key === "ArrowLeft")  flipTo(index - 1, "left");
  });

  // ---------- DRAG + ROTATE (interact.js) ----------
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js";

  // SCOPE: only Page 1 items are draggable (prevents cross-page collisions)
  const DRAGGABLE_SELECTORS = [
    "#mag-page-1 .feature",
    "#mag-page-1 .right-col",
    "#mag-page-1 .barcode",
    "#mag-page-1 .logo",
    "#mag-page-1 .left-col",
    "#mag-page-1 .ribbon",
    "#mag-page-1 .feature-name",
    "#mag-page-1 .left-col .mini",
    "#goes-rogue",
    "#dorothy-davis",
  ];

  const STORAGE_KEY = "witch_weekly_layout_v3";

  function applyTransform(el, x, y, rot) {
    el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
    el.setAttribute("data-x", x);
    el.setAttribute("data-y", y);
    el.setAttribute("data-rot", rot);
  }

  // read current transform so default CSS rotation (e.g. ribbon) is preserved
  function readComputedXYR(el) {
    const style = getComputedStyle(el);
    const t = style.transform;
    let x = 0, y = 0, rot = 0;
    if (t && t !== "none") {
      const m2 = t.match(/matrix\(([^)]+)\)/);
      if (m2) {
        const [a,b,, ,tx,ty] = m2[1].split(",").map(parseFloat);
        x = tx || 0; y = ty || 0;
        rot = Math.round(Math.atan2(b, a) * (180/Math.PI));
      } else {
        const m3 = t.match(/matrix3d\(([^)]+)\)/);
        if (m3) {
          const p = m3[1].split(",").map(parseFloat);
          const a = p[0], b = p[1];
          x = p[12] || 0; y = p[13] || 0;
          rot = Math.round(Math.atan2(b, a) * (180/Math.PI));
        }
      }
    }
    if (el.hasAttribute("data-rot")) rot = parseFloat(el.getAttribute("data-rot")) || rot || 0;
    if (el.hasAttribute("data-x")) x = parseFloat(el.getAttribute("data-x")) || x || 0;
    if (el.hasAttribute("data-y")) y = parseFloat(el.getAttribute("data-y")) || y || 0;
    return { x, y, rot };
  }

  // stable per-element per-page key
  function keyFor(el) {
    const page = el.closest(".mag-page")?.id || "page-unknown";
    if (el.id) return `${page}|#${el.id}`;
    const cls = [...el.classList].filter(c => c !== "draggable").join(".");
    if (cls) return `${page}|.${cls}`;
    const idx = [...el.parentNode.children].indexOf(el) + 1;
    return `${page}|${el.tagName.toLowerCase()}:nth-child(${idx})`;
  }

  function loadMap() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }
  function saveMap(map) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }

  function restorePositions() {
    const map = loadMap();
    document.querySelectorAll("#mag-page-1 .draggable").forEach(el => {
      const k = keyFor(el);
      const saved = map[k];
      if (saved) applyTransform(el, saved.x || 0, saved.y || 0, saved.rot || 0);
    });
  }

  script.onload = () => {
    // mark draggables (scoped)
    DRAGGABLE_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.classList.add("draggable"));
    });

    // initialize transform from CSS/attributes (e.g. ribbon 333deg), then restore saved
    document.querySelectorAll("#mag-page-1 .draggable").forEach(el => {
      const cur = readComputedXYR(el);
      applyTransform(el, cur.x, cur.y, cur.rot);
    });
    restorePositions();

    let selected = null;
    function select(el) {
      if (selected && selected !== el) selected.style.outline = "";
      selected = el;
      if (selected) {
        selected.style.outline = "2px dashed rgba(255,46,155,.7)";
        selected.style.outlineOffset = "-2px";
      }
    }

    // enable drag
    interact("#mag-page-1 .draggable").draggable({
      listeners: {
        start (event) {
          const t = event.target;
          const cur = readComputedXYR(t);
          applyTransform(t, cur.x, cur.y, cur.rot);
          select(t);
        },
        move (event) {
          const t = event.target;
          const x = (parseFloat(t.getAttribute("data-x")) || 0) + event.dx;
          const y = (parseFloat(t.getAttribute("data-y")) || 0) + event.dy;
          const rot = parseFloat(t.getAttribute("data-rot")) || 0;
          applyTransform(t, x, y, rot);

          const map = loadMap();
          map[keyFor(t)] = { x, y, rot };
          saveMap(map);
        }
      }
    });

    // rotate with [ and ] (Shift = 1°)
    window.addEventListener("keydown", (e) => {
      if (!selected) return;
      if (e.key !== "[" && e.key !== "]") return;
      const step = e.shiftKey ? 1 : 5;
      const x = parseFloat(selected.getAttribute("data-x")) || 0;
      const y = parseFloat(selected.getAttribute("data-y")) || 0;
      let rot = parseFloat(selected.getAttribute("data-rot")) || 0;
      rot += (e.key === "]" ? step : -step);
      applyTransform(selected, x, y, rot);

      const map = loadMap();
      map[keyFor(selected)] = { x, y, rot };
      saveMap(map);
    });

    // (Export CSS button intentionally removed for launch)
  }; // ✅ this closes script.onload

  document.body.appendChild(script);

  // ---------- COVER CLICKS -> THEIR OWN SECTIONS ----------
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;

    // minis: flip to page 2 (features strip)
    if (a.dataset.goto === "2") {
      e.preventDefault();
      flipTo(1, "right");
      return;
    }

    // coverlines with hashes -> smooth scroll to sections below magazine
    const href = a.getAttribute("href");
    if (href && href.startsWith("#")) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
});

// === Hot-pink just for two phrases on page 1 ===
(function () {
  const ROOT = document.querySelector('#mag-page-1'); // scope to page 1 only
  if (!ROOT) return;

  // Build a case-insensitive regex that also handles Wysteria’s / Wysteria's
  const phrases = [
    'from coffins to catastrphe',          // current spelling
    'from coffins to catastrophe',         // in case you fix it
    'the race for wysteria’s newest keepers',
    "the race for wysteria's newest keepers"
  ];
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re  = new RegExp(phrases.map(esc).join('|'), 'gi');

  // Walk text nodes and wrap matches
  const walker = document.createTreeWalker(ROOT, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // skip empty/whitespace, and anything already inside .hot
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (node.parentElement && node.parentElement.closest('.hot')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const targets = [];
  let n; while ((n = walker.nextNode())) { if (re.test(n.nodeValue)) targets.push(n); }

  targets.forEach(textNode => {
    const wrapper = document.createElement('span');
    wrapper.innerHTML = textNode.nodeValue.replace(re, m => `<span class="hot">${m}</span>`);
    textNode.parentNode.replaceChild(wrapper, textNode);
  });
})();

/* ======= Witch Weekly: mobile fixed-layout lock (append-only) ======= */
(function mobileFixedLayout() {
  // 1) Force a stable viewport width so vw/vmin don’t shrink on phones.
  //    (Done via JS so you don't edit index.html)
  const DESKTOP_PAGE_WIDTH = 1800; // pick your “looks perfect on PC” width
  (function ensureViewportMeta() {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      document.head.appendChild(meta);
    }
    // Prevent auto-zoom/font-boost; fix width so CSS clamp(..., vw, ...) stays identical
    meta.setAttribute(
      'content',
      `width=${DESKTOP_PAGE_WIDTH}, initial-scale=1.0, maximum-scale=1.0, user-scalable=no`
    );
  })();

  // 2) Prevent iOS text auto-enlarging (no CSS file edits — inject a tiny style).
  (function injectNoBoostStyle() {
    if (document.getElementById('ww-mobile-lock-style')) return;
    const style = document.createElement('style');
    style.id = 'ww-mobile-lock-style';
    style.textContent = `
      html { -webkit-text-size-adjust: 100%; }
    `;
    document.head.appendChild(style);
  })();

  // 3) Scale the whole .frame as one unit on small screens (no reflow).
  const frame = document.querySelector('.frame');
  if (!frame) return;

  // Measure your current PC layout ONCE as the “truth”.
  // (Use a microtask to ensure styles have applied.)
  queueMicrotask(() => {
    const rect = frame.getBoundingClientRect();
    const BASE_W = Math.max(1, Math.round(rect.width));
    const BASE_H = Math.max(1, Math.round(rect.height));

    // Keep scale origin consistent with magazine feel.
    frame.style.transformOrigin = 'top center';

    function fit() {
      // If the phone screen is smaller than the desktop “truth”, scale down uniformly.
      const scaleX = (window.innerWidth - 2) / BASE_W;
      const scaleY = (window.innerHeight - 2) / BASE_H;
      const scale = Math.min(scaleX, scaleY, 1); // never upscale past 1 on desktop
      frame.style.transform = `scale(${isFinite(scale) ? scale : 1})`;
    }

    window.addEventListener('resize', fit, { passive: true });
    window.addEventListener('orientationchange', fit, { passive: true });
    fit();
    // a second pass helps some mobile browsers after address-bar hide/show
    setTimeout(fit, 0);
    setTimeout(fit, 300);
  });
})();
