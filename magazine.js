// magazine.js (drag + rotate that keeps your rotation, saves positions)
console.log("✅ magazine.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  // ---------- PAGE FLIP (kept as-is) ----------
  const pages = [
    document.getElementById("mag-page-1"),
    document.getElementById("mag-page-2"),
    document.getElementById("mag-page-3"),
  ].filter(Boolean);

  let index = Math.max(0, pages.findIndex(p => p.classList.contains("is-active")));
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
    }, 520);
  }

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
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") flipTo(index + 1, "right");
    if (e.key === "ArrowLeft")  flipTo(index - 1, "left");
  });

  // ---------- DRAG + ROTATE (interact.js) with proper rotation + persistence ----------
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js";

  const DRAGGABLE_SELECTORS = [
    ".feature",
    ".right-col",
    ".barcode",
    ".logo",
    ".left-col",
    ".ribbon",
    ".feature-name",
    ".left-col .mini"
  ];

  const STORAGE_KEY = "witch_weekly_layout_v1";

  function bestSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.classList.length) {
      const cls = [...el.classList].filter(c => c !== "draggable").join(".");
      if (cls) return `.${cls}`;
    }
    const idx = [...el.parentNode.children].indexOf(el) + 1;
    return `${el.tagName.toLowerCase()}:nth-child(${idx})`;
  }

  function loadPositions() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }
  function savePositions(map) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }

  // Read current computed transform into {x,y,rot}
  function readComputedTransform(el) {
    const style = getComputedStyle(el);
    const t = style.transform;
    let x = 0, y = 0, rot = 0;
    if (t && t !== "none") {
      const m2 = t.match(/matrix\(([^)]+)\)/);
      if (m2) {
        const parts = m2[1].split(",").map(parseFloat);
        const a = parts[0], b = parts[1], tx = parts[4], ty = parts[5];
        x = tx || 0; y = ty || 0;
        rot = Math.round(Math.atan2(b, a) * (180 / Math.PI));
      } else {
        const m3 = t.match(/matrix3d\(([^)]+)\)/);
        if (m3) {
          const p = m3[1].split(",").map(parseFloat);
          const a = p[0], b = p[1], tx = p[12], ty = p[13];
          x = tx || 0; y = ty || 0;
          rot = Math.round(Math.atan2(b, a) * (180 / Math.PI));
        }
      }
    }
    // data-rot wins if present (lets you set defaults via HTML)
    if (el.hasAttribute("data-rot")) rot = parseFloat(el.getAttribute("data-rot")) || rot || 0;
    if (el.hasAttribute("data-x")) x = parseFloat(el.getAttribute("data-x")) || x || 0;
    if (el.hasAttribute("data-y")) y = parseFloat(el.getAttribute("data-y")) || y || 0;
    return { x, y, rot };
  }

  function applyTransform(el, x, y, rot) {
    el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
    el.setAttribute("data-x", x);
    el.setAttribute("data-y", y);
    el.setAttribute("data-rot", rot);
  }

  function buildExportCSS() {
    const lines = [`/* === Exported from Witch Weekly === */`];
    document.querySelectorAll(".draggable").forEach(el => {
      const sel = bestSelector(el);
      const x = parseFloat(el.getAttribute("data-x")) || 0;
      const y = parseFloat(el.getAttribute("data-y")) || 0;
      const rot = parseFloat(el.getAttribute("data-rot")) || 0;
      lines.push(`${sel} { transform: translate(${x}px, ${y}px) rotate(${rot}deg); }`);
    });
    return lines.join("\n");
  }

  function mountExportButton() {
    const btn = document.createElement("button");
    btn.textContent = "Export CSS";
    Object.assign(btn.style, {
      position: "fixed", right: "14px", bottom: "14px", zIndex: 9999,
      padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,.2)",
      background: "rgba(15,10,25,.8)", color: "#fff", fontWeight: "800",
      letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer",
      boxShadow: "0 8px 24px rgba(0,0,0,.35)"
    });
    btn.addEventListener("click", async () => {
      const css = buildExportCSS();
      try {
        await navigator.clipboard.writeText(css);
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Export CSS"), 1200);
      } catch {
        const w = window.open("", "_blank");
        w.document.write(`<pre>${css.replace(/[<>&]/g, s => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[s]))}</pre>`);
        w.document.close();
      }
    });
    document.body.appendChild(btn);
  }

  script.onload = () => {
    console.log("🎯 Drag/rotate ready. Click to select. Drag to move. [ / ] to rotate. Positions auto-save.");

    // mark draggables
    DRAGGABLE_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.classList.add("draggable"));
    });

    // restore saved or default transforms
    const saved = loadPositions();
    document.querySelectorAll(".draggable").forEach(el => {
      const sel = bestSelector(el);
      const pos = saved[sel] || readComputedTransform(el);
      applyTransform(el, pos.x || 0, pos.y || 0, pos.rot || 0);
    });

    let selected = null;
    function select(el) {
      if (selected && selected !== el) selected.style.outline = "";
      selected = el;
      if (selected) {
        selected.style.outline = "2px dashed rgba(255,46,155,.7)";
        selected.style.outlineOffset = "-2px";
        selected.focus?.();
      }
    }

    // enable drag
    interact(".draggable").draggable({
      listeners: {
        start (event) {
          const t = event.target;
          const cur = readComputedTransform(t); // keep existing rotation!
          applyTransform(t, cur.x, cur.y, cur.rot);
          select(t);
        },
        move (event) {
          const t = event.target;
          const x = (parseFloat(t.getAttribute("data-x")) || 0) + event.dx;
          const y = (parseFloat(t.getAttribute("data-y")) || 0) + event.dy;
          const rot = parseFloat(t.getAttribute("data-rot")) || 0;
          applyTransform(t, x, y, rot);
          const map = loadPositions();
          map[bestSelector(t)] = { x, y, rot };
          savePositions(map);
        }
      }
    });

    // click to select
    document.addEventListener("click", (e) => {
      const el = e.target.closest(".draggable");
      if (el) select(el);
    });

    // rotate with [ and ] (Shift = 1° fine control)
    window.addEventListener("keydown", (e) => {
      if (!selected) return;
      const step = e.shiftKey ? 1 : 5;
      if (e.key === "[" || e.key === "]") {
        const x = parseFloat(selected.getAttribute("data-x")) || 0;
        const y = parseFloat(selected.getAttribute("data-y")) || 0;
        let rot = parseFloat(selected.getAttribute("data-rot")) || 0;
        rot += (e.key === "]" ? step : -step);
        applyTransform(selected, x, y, rot);
        const map = loadPositions();
        map[bestSelector(selected)] = { x, y, rot };
        savePositions(map);
      }
    });

    mountExportButton();
  };

  document.body.appendChild(script);
});
