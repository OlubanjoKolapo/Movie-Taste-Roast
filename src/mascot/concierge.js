/**
 * The Concierge: MovieTonight's mascot, shared with Movie Roast.
 *
 * <mt-concierge size="96" state="idle|thinking|answering" heat="savage" follow></mt-concierge>
 *
 * Shapes: O (rest), Fold (mid), M (thinking). The body morphs with a spring, never a crossfade.
 * Eyes: "pause" bars by default, "play" triangles when it has an answer.
 * Reduced motion: it holds still.
 */

// 12 outline points per shape, clockwise from top centre, in a 100x100 box.
const SHAPE_O = [
  [50, 12], [70, 17.4], [84.6, 32], [90, 52], [84.6, 72], [70, 86.6],
  [50, 92], [30, 86.6], [15.4, 72], [10, 52], [15.4, 32], [30, 17.4],
];
const SHAPE_FOLD = [
  [50, 27], [71, 23], [87, 37], [92, 56], [88, 76], [70, 88],
  [50, 90], [30, 88], [12, 76], [8, 56], [13, 37], [29, 23],
];
const SHAPE_M = [
  [50, 41], [68, 13], [84, 22], [88, 52], [88, 80], [74, 90],
  [50, 85], [26, 90], [12, 80], [12, 52], [16, 22], [32, 13],
];
// Face plate per shape: centre x, centre y, width, height.
const PLATE_O = [50, 55, 46, 26];
const PLATE_M = [50, 64, 42, 22];

const lerp = (a, b, t) => a + (b - a) * t;

function shapeAt(s) {
  // s: 0 = O, 0.5 = Fold, 1 = M. Values slightly outside 0..1 come from spring overshoot.
  const [from, to, t] = s < 0.5 ? [SHAPE_O, SHAPE_FOLD, s * 2] : [SHAPE_FOLD, SHAPE_M, (s - 0.5) * 2];
  return from.map((p, i) => [lerp(p[0], to[i][0], t), lerp(p[1], to[i][1], t)]);
}

function pathFor(points) {
  // Closed Catmull-Rom spline converted to cubic Béziers.
  const n = points.length;
  let d = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + "Z";
}

let uid = 0;

class MtConcierge extends HTMLElement {
  static get observedAttributes() {
    return ["size", "state", "heat", "follow", "eyes"];
  }

  constructor() {
    super();
    this._id = `mtc${++uid}`;
    this._s = 0; // current shape position
    this._v = 0; // shape velocity
    this._target = 0;
    this._raf = 0;
    this._timers = [];
    this._reduced = false;
    this._onPointer = this._onPointer.bind(this);
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this._reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this._render();
    this._applyState();
    this._scheduleBlink();
    this._scheduleGlance();
    if (this.hasAttribute("follow")) window.addEventListener("pointermove", this._onPointer, { passive: true });
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._raf);
    this._timers.forEach(clearTimeout);
    this._timers = [];
    window.removeEventListener("pointermove", this._onPointer);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.shadowRoot?.firstChild || oldValue === newValue) return;
    if (name === "size") this._render();
    if (name === "state" || name === "heat" || name === "eyes") this._applyState();
    if (name === "follow") {
      window.removeEventListener("pointermove", this._onPointer);
      if (newValue !== null) window.addEventListener("pointermove", this._onPointer, { passive: true });
    }
  }

  get _size() {
    return Math.max(16, Number(this.getAttribute("size")) || 96);
  }

  _later(fn, ms) {
    const t = setTimeout(() => {
      this._timers = this._timers.filter((x) => x !== t);
      fn();
    }, ms);
    this._timers.push(t);
  }

  _render() {
    const size = this._size;
    const shaded = size >= 80;
    const barW = size < 56 ? 6.5 : 4.6;
    const id = this._id;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; width: ${size}px; height: ${size}px; line-height: 0; flex: none; }
        svg { width: 100%; height: 100%; overflow: visible; }
        .breathe { transform-box: fill-box; transform-origin: 50% 100%; animation: breathe 3.8s ease-in-out infinite; }
        .eye { transform-box: fill-box; transform-origin: 50% 50%; transition: transform 0.2s cubic-bezier(.16,1,.3,1); }
        .look { transition: transform 0.45s cubic-bezier(.16,1,.3,1); }
        .pause, .play { transform-box: fill-box; transform-origin: 50% 50%; transition: opacity .18s ease, transform .3s cubic-bezier(.16,1,.3,1); }
        .play { opacity: 0; transform: scale(.4); }
        :host([data-eyes="play"]) .pause { opacity: 0; transform: scale(.4); }
        :host([data-eyes="play"]) .play { opacity: 1; transform: none; }
        :host([data-thinking]) .sweep { animation: sweep 1.1s ease-in-out infinite alternate; }
        @keyframes breathe { 0%,100% { transform: scale(1, 1); } 50% { transform: scale(1.018, 1.03); } }
        @keyframes sweep { from { transform: translateX(-3.5px); } to { transform: translateX(3.5px); } }
        @media (prefers-reduced-motion: reduce) { .breathe, .sweep { animation: none !important; } }
      </style>
      <svg viewBox="0 0 100 100" role="img" aria-label="The Concierge">
        <defs>
          <radialGradient id="${id}glow" cx="50%" cy="52%" r="50%">
            <stop offset="0%" stop-color="#FBBF24" stop-opacity=".38"/>
            <stop offset="100%" stop-color="#FBBF24" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="${id}base" cx="36%" cy="30%" r="78%">
            <stop offset="0%" stop-color="#FDE68A"/>
            <stop offset="38%" stop-color="#FBBF24"/>
            <stop offset="78%" stop-color="#D97706"/>
            <stop offset="100%" stop-color="#92400E"/>
          </radialGradient>
          <linearGradient id="${id}shade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="55%" stop-color="#78350F" stop-opacity="0"/>
            <stop offset="100%" stop-color="#78350F" stop-opacity=".55"/>
          </linearGradient>
          <radialGradient id="${id}hi" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fff" stop-opacity=".75"/>
            <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
          </radialGradient>
        </defs>
        ${shaded ? `<circle cx="50" cy="54" r="56" fill="url(#${id}glow)"/>` : ""}
        <g class="breathe">
          <path class="body" fill="${shaded ? `url(#${id}base)` : "#FBBF24"}"/>
          ${shaded ? `<path class="body" fill="url(#${id}shade)"/><ellipse class="hi" cx="34" cy="28" rx="13" ry="8" fill="url(#${id}hi)" transform="rotate(-28 34 28)"/>` : ""}
          <g class="face">
            <rect class="plate" fill="#0D0D0F"/>
            <g class="look"><g class="sweep">
              <g class="eye-l"><g class="eye">
                <rect class="pause" x="${-barW / 2}" y="-6.2" width="${barW}" height="12.4" rx="${barW / 2}" fill="#FBBF24"/>
                <path class="play" d="M-3.6,-5.6 L5,0 L-3.6,5.6 Z" fill="#FBBF24" stroke="#FBBF24" stroke-width="1.6" stroke-linejoin="round"/>
              </g></g>
              <g class="eye-r"><g class="eye">
                <rect class="pause" x="${-barW / 2}" y="-6.2" width="${barW}" height="12.4" rx="${barW / 2}" fill="#FBBF24"/>
                <path class="play" d="M-3.6,-5.6 L5,0 L-3.6,5.6 Z" fill="#FBBF24" stroke="#FBBF24" stroke-width="1.6" stroke-linejoin="round"/>
              </g></g>
            </g></g>
          </g>
        </g>
      </svg>`;
    const root = this.shadowRoot;
    this._bodies = [...root.querySelectorAll(".body")];
    this._hi = root.querySelector(".hi");
    this._plate = root.querySelector(".plate");
    this._eyeL = root.querySelector(".eye-l");
    this._eyeR = root.querySelector(".eye-r");
    this._eyes = [...root.querySelectorAll(".eye")];
    this._look = root.querySelector(".look");
    this._draw();
  }

  _draw() {
    const s = this._s;
    const d = pathFor(shapeAt(s));
    this._bodies.forEach((b) => b.setAttribute("d", d));
    const t = Math.min(1.08, Math.max(-0.08, s));
    const [cx, cy, w, h] = PLATE_O.map((v, i) => lerp(v, PLATE_M[i], t));
    this._plate.setAttribute("x", (cx - w / 2).toFixed(2));
    this._plate.setAttribute("y", (cy - h / 2).toFixed(2));
    this._plate.setAttribute("width", w.toFixed(2));
    this._plate.setAttribute("height", h.toFixed(2));
    this._plate.setAttribute("rx", (h / 2).toFixed(2));
    const gap = w * 0.2;
    this._eyeL.setAttribute("transform", `translate(${(cx - gap).toFixed(2)} ${cy.toFixed(2)})`);
    this._eyeR.setAttribute("transform", `translate(${(cx + gap).toFixed(2)} ${cy.toFixed(2)})`);
    if (this._hi) this._hi.setAttribute("opacity", String(Math.max(0, 1 - t * 0.6)));
  }

  _animate() {
    if (this._reduced) {
      this._s = this._target;
      this._v = 0;
      this._draw();
      return;
    }
    cancelAnimationFrame(this._raf);
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      // Spring: stiffness 180, damping 16. A touch of overshoot gives it weight.
      const force = 180 * (this._target - this._s) - 16 * this._v;
      this._v += force * dt;
      this._s += this._v * dt;
      this._draw();
      if (Math.abs(this._v) > 0.002 || Math.abs(this._target - this._s) > 0.002) {
        this._raf = requestAnimationFrame(step);
      } else {
        this._s = this._target;
        this._draw();
      }
    };
    this._raf = requestAnimationFrame(step);
  }

  _setEyeScale(scaleY) {
    this._eyeScale = scaleY;
    this._eyes.forEach((e) => {
      e.style.transform = `scaleY(${scaleY})`;
    });
  }

  _applyState() {
    if (!this._eyes) return;
    const state = this.getAttribute("state") || "idle";
    const savage = this.getAttribute("heat") === "savage";
    const forcedEyes = this.getAttribute("eyes");
    clearTimeout(this._answerTimer);

    if (state === "thinking") {
      this._target = 1;
      this.setAttribute("data-thinking", "");
      this._setEyeScale(savage ? 0.38 : 0.55);
      this.dataset.eyes = "pause";
    } else {
      this._target = 0;
      this.removeAttribute("data-thinking");
      this._setEyeScale(savage && state === "answering" ? 0.7 : 1);
      if (state === "answering") {
        this.dataset.eyes = "play";
        this._answerTimer = setTimeout(() => {
          if (!this.getAttribute("eyes")) this.dataset.eyes = "pause";
          this._setEyeScale(1);
        }, savage ? 4200 : 2500);
      } else {
        this.dataset.eyes = "pause";
      }
    }
    if (forcedEyes) this.dataset.eyes = forcedEyes;
    this._animate();
  }

  _scheduleBlink() {
    if (this._reduced) return;
    this._later(() => {
      const thinking = this.hasAttribute("data-thinking");
      if (!thinking && this._eyes) {
        const prev = this._eyeScale ?? 1;
        this._setEyeScale(0.08);
        this._later(() => this._setEyeScale(prev), 120);
      }
      this._scheduleBlink();
    }, 2500 + Math.random() * 3500);
  }

  _scheduleGlance() {
    if (this._reduced) return;
    this._later(() => {
      const busy = this.hasAttribute("data-thinking") || this.hasAttribute("follow");
      if (!busy && this._look) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        this._look.style.transform = `translateX(${dir * 3.2}px)`;
        this._later(() => {
          if (!this.hasAttribute("follow")) this._look.style.transform = "";
        }, 900 + Math.random() * 700);
      }
      this._scheduleGlance();
    }, 3800 + Math.random() * 4200);
  }

  _onPointer(e) {
    if (this._reduced || !this._look || this.hasAttribute("data-thinking")) return;
    const r = this.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, dist / 400);
    this._look.style.transform = `translate(${((dx / dist) * 4 * k).toFixed(2)}px, ${((dy / dist) * 2.4 * k).toFixed(2)}px)`;
  }
}

if (!customElements.get("mt-concierge")) customElements.define("mt-concierge", MtConcierge);
