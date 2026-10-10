/* ==========================================================================
   공통 도구 · 화면 여러 곳에서 함께 쓰는 그리기 함수
   ========================================================================== */
(function () {
  const NS = "http://www.w3.org/2000/svg";

  /* SVG 요소 만들기: svg("circle", {cx:0, cy:0, r:4}, 부모) */
  function svg(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }

  /* HTML 요소 만들기 */
  function html(tag, cls, text, parent) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }

  /* "13:16" → 분 단위 숫자 */
  function toMin(t) {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  /* 상호작용 기호 (△ ○ □ ♥) 를 도형으로 그립니다.
     filled = 확정된 기록, 외곽선만 = 미검토 기록 */
  function symbol(type, x, y, r, parent, opts) {
    opts = opts || {};
    const g = svg("g", { class: "sym sym-" + type + (opts.filled ? " is-filled" : " is-outline") + (opts.cls ? " " + opts.cls : ""),
      transform: `translate(${x},${y})` }, parent);
    let shape;
    if (type === "move") {
      const h = r * 1.05;
      shape = svg("path", { d: `M0,${-h} L${h * 0.95},${h * 0.7} L${-h * 0.95},${h * 0.7} Z` }, g);
    } else if (type === "situation") {
      shape = svg("circle", { r: r * 0.92 }, g);
    } else if (type === "together") {
      const s = r * 0.82;
      shape = svg("rect", { x: -s, y: -s, width: s * 2, height: s * 2 }, g);
    } else if (type === "share") {
      const k = r * 0.95;
      shape = svg("path", { d: `M0,${k * 0.95} C${-k * 1.35},${k * 0.05} ${-k * 0.95},${-k * 1.1} 0,${-k * 0.38} C${k * 0.95},${-k * 1.1} ${k * 1.35},${k * 0.05} 0,${k * 0.95} Z` }, g);
    } else {
      /* 유형 미지정 */
      shape = svg("circle", { r: r * 0.5, class: "sym-unknown" }, g);
    }
    return g;
  }

  /* 기호를 HTML 안에 작게 넣고 싶을 때 */
  function symbolInline(type, filled) {
    const s = svg("svg", { viewBox: "-8 -8 16 16", width: 13, height: 13, class: "sym-inline", "aria-hidden": "true" });
    symbol(type, 0, 0, 6, s, { filled });
    return s;
  }

  /* 상징적인 검정 실루엣 한 명 (위에서 내려다본 걷는 사람).
     특정 인물을 나타내지 않도록 머리·몸·팔다리만 단순화했습니다.
     angle: 진행 방향(도), phase: 보폭 (-1 ~ 1) */
  function walker(parent, x, y, angle, phase, scale) {
    const p = phase;
    const g = svg("g", { class: "walker", transform: `translate(${x},${y}) rotate(${angle + 90}) scale(${scale || 1})` }, parent);
    const body = (grp) => {
      svg("line", { x1: -2.3, y1: 5, x2: -2.6, y2: 12.5 - 3 * p, class: "limb leg" }, grp);
      svg("line", { x1: 2.3, y1: 5, x2: 2.6, y2: 12.5 + 3 * p, class: "limb leg" }, grp);
      svg("line", { x1: -5.2, y1: -2.2, x2: -6.4, y2: 3.2 + 4 * p, class: "limb arm" }, grp);
      svg("line", { x1: 5.2, y1: -2.2, x2: 6.4, y2: 3.2 - 4 * p, class: "limb arm" }, grp);
      svg("rect", { x: -5.4, y: -4.6, width: 10.8, height: 11, rx: 4.6 }, grp);
      svg("circle", { cx: 0, cy: -8.6, r: 4.1 }, grp);
    };
    body(svg("g", { class: "walker-shadow", transform: "translate(2.6,2.4)" }, g));
    body(svg("g", { class: "walker-body" }, g));
    return g;
  }

  /* 경로 위 거리 d 지점의 좌표와 진행 각도 */
  function pointAt(path, d) {
    const L = path.getTotalLength();
    d = Math.max(0, Math.min(L, d));
    const a = path.getPointAtLength(Math.max(0, d - 1));
    const b = path.getPointAtLength(Math.min(L, d + 1));
    const pt = path.getPointAtLength(d);
    return { x: pt.x, y: pt.y, angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };
  }

  /* 진행 방향의 수직(왼쪽) 방향으로 off 만큼 이동한 좌표 */
  function offsetNormal(p, off) {
    const r = p.angle * Math.PI / 180;
    return { x: p.x + Math.sin(r) * off, y: p.y - Math.cos(r) * off, angle: p.angle };
  }

  /* 글자가 뒤집히지 않도록 각도 보정 */
  function readableAngle(a) {
    a = ((a % 360) + 360) % 360;
    return (a > 90 && a < 270) ? a - 180 : a;
  }

  function emoColor(kind) {
    const e = kind && window.SITE_DATA.emotions[kind];
    return e ? `var(${e.token})` : "var(--mute)";
  }

  window.DT = { svg, html, toMin, symbol, symbolInline, walker, pointAt, offsetNormal, readableAngle, emoColor };
})();
