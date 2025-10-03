// magazine.js — Witch Weekly (pages + drag + rotate)
console.log("✅ magazine.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  // ---------- PAGE FLIP ----------
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

  function applyTransform(el, x, y, rot) {
    el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
    el.setAttribute("data-x", x);
    el.setAttribute("data-y", y);
    el.setAttribute("data-rot", rot);
  }

  const defaultDraggables = [
    ".feature",
    ".right-col",
    ".barcode",
    ".logo",
    ".left-col",
    ".ribbon",
    ".feature-name",
  ];

  script.onload = () => {
    console.log("🎯 Drag/rotate ready. Click a draggable to select. Drag to move. [ / ] to rotate.");

    // mark draggables
    defaultDraggables.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.classList.add("draggable");
    });
    // minis individually
    document.querySelectorAll(".left-col .mini").forEach(a => a.classList.add("draggable"));

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
    interact(".draggable").draggable({
      listeners: {
        start (event) {
          const t = event.target;
          if (!t.hasAttribute("data-x")) t.setAttribute("data-x", "0");
          if (!t.hasAttribute("data-y")) t.setAttribute("data-y", "0");
          if (!t.hasAttribute("data-rot")) t.setAttribute("data-rot", "0");
          select(t);
        },
        move (event) {
          const t = event.target;
          const x = (parseFloat(t.getAttribute("data-x")) || 0) + event.dx;
          const y = (parseFloat(t.getAttribute("data-y")) || 0) + event.dy;
          const rot = parseFloat(t.getAttribute("data-rot")) || 0;
          applyTransform(t, x, y, rot);
        }
      }
    });

    // click to select
    document.addEventListener("click", (e) => {
      const el = e.target.closest(".draggable");
      if (el) select(el);
    });

    // rotate with [ and ] (Shift = fine control)
    window.addEventListener("keydown", (e) => {
      if (!selected) return;
      const step = e.shiftKey ? 1 : 5;
      if (e.key === "[") {
        const x = parseFloat(selected.getAttribute("data-x")) || 0;
        const y = parseFloat(selected.getAttribute("data-y")) || 0;
        const rot = (parseFloat(selected.getAttribute("data-rot")) || 0) - step;
        applyTransform(selected, x, y, rot);
      }
      if (e.key === "]") {
        const x = parseFloat(selected.getAttribute("data-x")) || 0;
        const y = parseFloat(selected.getAttribute("data-y")) || 0;
        const rot = (parseFloat(selected.getAttribute("data-rot")) || 0) + step;
        applyTransform(selected, x, y, rot);
      }
    });
  };

  document.body.appendChild(script);
});
