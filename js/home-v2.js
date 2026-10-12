/* ==========================================================================
   홈 V2 시안 · Scroll to Walk  +  Road Zoom Transition
   --------------------------------------------------------------------------
   · 입체적으로 보이는(아이소메트릭) 길 하나를 세 사람이 걷습니다.
   · 스크롤 진행도 = 가야 할 위치. 세 사람은 일정한 속도로 그 위치까지 걷습니다.
     아래로 내리면 앞으로, 올리면 되돌아갑니다.
   · 사진: A(낮)는 길 위쪽, B(저녁)는 길 아래쪽. 지나간 지점의 사진만 나타납니다.
   · 길 주변 풍경(풀·나무·돌집·돌담)도 지나온 곳부터 생겨납니다.
   · '두 번의 걷기 펼쳐보기'를 누를 때만, 카메라가 길 끝을 향해 전진하며 개요로 넘어갑니다.
   · 홈의 길은 실제 이동 경로가 아니라 두 걷기의 장면을 이은 개념적인 길입니다.
   ========================================================================== */
(function () {
  "use strict";

  const D = window.SITE_DATA;
  const section = document.getElementById("hv");
  const stage = document.getElementById("hv-stage");
  const world = document.getElementById("hv-world");
  const svg = document.getElementById("hv-svg");
  const layer = document.getElementById("hv-layer");
  const cta = document.getElementById("hv-cta");
  const cover = document.getElementById("hv-cover");
  const titleEl = document.getElementById("hv-title");
  const legendEl = document.getElementById("hv-legend");
  const countEl = document.getElementById("hv-count");
  const endEl = document.getElementById("hv-end");
  if (!D || !stage) return;
  const NS = "http://www.w3.org/2000/svg";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 조절하기 쉬운 값들 ---- */
  const CTRL = [                     // 길의 모양 (바닥 평면: x = 앞으로, z = 옆으로)
    [0, 0], [160, 22], [320, -8], [480, 20], [640, -12], [800, 14], [960, -8], [1120, 12], [1280, 0]
  ];
  const ROAD_W = 50;        // 길 폭
  const SLAB = 8;           // 길 두께 (입체감)
  const LEAD = 14;          // 세 사람 바로 앞까지 드러나는 길
  const HINT = 120;         // 앞으로 이어질 길을 은은하게 암시하는 길이
  const WALK_END = 0.9;     // 이 스크롤 진행도에 길 끝 도착
  const END_AT = 0.95;      // 이 진행도 + 길 끝 도착 → 마지막 장면 (버튼 등장)
  const SPEED = 0.2;        // 걷는 속도 (길 단위 / ms) — 스크롤이 빨라도 일정
  const ZOOM_MAX = 1.5;     // 가장 가까이 볼 때의 확대
  const PHOTO_W = 120;      // 사진 너비 (확대 1 기준)
  const PHOTO_D = 80;       // 길 가장자리에서 사진 기둥까지 거리
  const POSTS = [16, 92];   // 기둥 높이 (낮게·높게 번갈아 → 이웃 사진과 엇갈림)
  const PHOTOS = {
    A: ["a-souvenir-1", "a-souvenir-2", "a-sea-2", "a-sea-4", "a-sunglasses", "a-cafe-3"],
    B: ["b-walk-1", "b-walk-3", "b-walk-4", "b-walk-5", "b-walk-6", "b-restaurant"]
  };
  /* 전환 시간 (ms): 버튼·글 사라짐 → 카메라 전진 → 바닥색으로 덮임 → 개요로 이동 */
  const LEAVE = { fade: 350, dolly: 1250, cover: 1350, go: 1850 };
  const DEST_AHEAD = 170;   // 길 끝에서 카메라가 향할 목적 지점까지 거리
  const EXT = 320;          // 전환 때 길 끝 너머로 이어지는 길
  /* 이동할 개요 주소: 버튼에 data-target 이 있으면 그 주소(시안 페이지용), 없으면 기본 개요 */
  const TARGET = (cta && cta.dataset.target) || "overview.html?from=home";

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- 길: 부드러운 곡선을 일정 간격으로 나눔 ---------- */
  function cr(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return [0, 1].map(i => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
  }
  const raw = [];
  for (let i = 0; i < CTRL.length - 1; i++) {
    const p0 = CTRL[Math.max(i - 1, 0)], p1 = CTRL[i], p2 = CTRL[i + 1], p3 = CTRL[Math.min(i + 2, CTRL.length - 1)];
    for (let k = 0; k < 16; k++) raw.push(cr(p0, p1, p2, p3, k / 16));
  }
  raw.push(CTRL[CTRL.length - 1]);
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const L = cum[cum.length - 1];
  function atIn(s) {
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const seg = cum[hi] - cum[lo] || 1, t = (s - cum[lo]) / seg;
    const a = raw[lo], b = raw[hi];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
    return { x: lerp(a[0], b[0], t), z: lerp(a[1], b[1], t), tx: dx / len, tz: dz / len };
  }
  /* 길 밖(시작 전·끝 너머)은 같은 방향으로 곧게 이어진다고 봅니다 */
  function at(s) {
    if (s >= 0 && s <= L) return atIn(s);
    const e = atIn(s < 0 ? 0 : L), d = s < 0 ? s : s - L;
    return { x: e.x + e.tx * d, z: e.z + e.tz * d, tx: e.tx, tz: e.tz };
  }
  /* 바닥 평면 → 비스듬히 내려다본 화면 좌표 (아이소메트릭) */
  const iso = (x, z) => [(x - z) * 0.866, -(x + z) * 0.5];
  const side = (p, d) => [p.x - p.tz * d, p.z + p.tx * d];   // d > 0: 길 위쪽(뒤), d < 0: 길 아래쪽(앞)

  /* ---------- 사진: A·B 를 번갈아, A 는 위쪽 B 는 아래쪽 ---------- */
  const sceneOf = id => D.scenes.find(s => s.id === id);
  const photoOf = id => D.photos.find(p => p.id === id);
  const order = [];
  for (let i = 0; i < Math.max(PHOTOS.A.length, PHOTOS.B.length); i++) {
    if (PHOTOS.A[i]) order.push(["A", PHOTOS.A[i], i]);
    if (PHOTOS.B[i]) order.push(["B", PHOTOS.B[i], i]);
  }
  const items = order.map(([ev, id, n], k) => {
    const p = photoOf(id), sc = sceneOf(p.scene);
    const time = p.time || (sc && (sc.time || (sc.timeRange && sc.timeRange.join("–")))) || "";
    const it = {
      id, ev, k, photo: p,
      s: lerp(L * 0.08, L * 0.93, k / (order.length - 1)),
      sign: ev === "A" ? 1 : -1,
      postH: POSTS[n % 2],
      caption: `${ev} · ${time} ${sc ? sc.place.replace(/^출발 · /, "") : ""}`.replace(/\s+/g, " ").trim()
    };
    it.anchor = side(at(it.s), it.sign * (ROAD_W / 2 + PHOTO_D));
    const fig = document.createElement("figure");
    fig.className = `hv-ph hv-ph-${ev.toLowerCase()}`;
    fig.innerHTML = `<span class="hv-ph-frame"><img alt=""></span><figcaption class="hv-ph-cap"></figcaption>`;
    const img = fig.querySelector("img");
    img.src = p.file; img.alt = p.alt; img.decoding = "async";
    fig.querySelector("figcaption").textContent = it.caption;
    layer.appendChild(fig);
    it.node = fig; it.on = false;
    return it;
  });

  /* ---------- 길 위 이정표 (data.js 의 시각·장소). 시작 전과 끝 너머에 둠 ---------- */
  const A0 = sceneOf("A-0"), A4 = sceneOf("A-4"), B0 = sceneOf("B-0"), B2 = sceneOf("B-2");
  const marks = [
    { s: -34, sign: 1,  align: "end",   ev: "a", text: `A · ${A0.time} 닫힌 카페에서 출발`, short: `A · ${A0.time} 출발` },
    { s: -34, sign: -1, align: "end",   ev: "b", text: `B · ${B0.time} 걸어서 가자는 결정`, short: `B · ${B0.time} 출발` },
    /* 도착 표시는 길 끝(세 사람이 서는 곳)에서 충분히 떨어뜨려 실루엣과 겹치지 않게 */
    { s: L + 64, sign: 1,  align: "start", ev: "a", text: `A · ${A4.time} ${A4.place}`, short: `A · ${A4.time}`, last: true },
    { s: L + 64, sign: -1, align: "start", ev: "b", text: `B · ${B2.time} ${B2.place}`, short: `B · ${B2.time}`, last: true }
  ].map(m => {
    const n = document.createElement("span");
    n.className = `hv-mark hv-mark-${m.ev}`;
    n.textContent = m.text;
    layer.appendChild(n);
    return Object.assign(m, { node: n, pos: side(at(m.s), m.sign * (ROAD_W / 2 + 10)) });
  });

  /* ---------- 길 주변 풍경 (정해진 무늬로 매번 같은 자리) ---------- */
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const decos = [];
  for (let s = 10; s < L + 40; s += 30) {
    const sign = rnd() < 0.5 ? 1 : -1, r = rnd();
    let type, d;
    if (r < 0.4) { type = "grass"; d = ROAD_W / 2 + 6 + rnd() * 26; }
    else if (r < 0.58) { type = "shrub"; d = ROAD_W / 2 + 14 + rnd() * 30; }
    else if (r < 0.78) { type = "tree"; d = ROAD_W / 2 + 150 + rnd() * 70; }
    else if (r < 0.9) { type = "house"; d = ROAD_W / 2 + 190 + rnd() * 70; }
    else { type = "wall"; d = ROAD_W / 2 + 4; }
    decos.push({ s: s + rnd() * 18, sign, d, type });
  }
  decos.forEach(o => { o.pos = side(at(o.s), o.sign * o.d); o.depth = iso(...o.pos)[1]; });
  decos.sort((a, b) => a.depth - b.depth);   // 먼 것부터 그려서 겹침이 자연스럽게

  /* ---------- SVG 층 ---------- */
  const gDecoBack = el("g", null, svg);
  const gSlab = el("path", { class: "hv-slab" }, svg);
  const gAhead = el("path", { class: "hv-ahead" }, svg);
  const gRoad = el("path", { class: "hv-road" }, svg);
  const gAheadLine = el("path", { class: "hv-ahead-line" }, svg);
  const laneA = el("path", { class: "hv-lane hv-lane-a" }, svg);
  const laneB = el("path", { class: "hv-lane hv-lane-b" }, svg);
  const gDecoFront = el("g", null, svg);
  const gPosts = el("g", null, svg);
  const gDest = el("g", { class: "hv-dest" }, svg);
  const destRing = el("circle", { class: "hv-dest-ring" }, gDest);
  const destDot = el("circle", { class: "hv-dest-dot" }, gDest);
  const gWalkers = el("g", { class: "walkers" }, svg);

  /* 풍경 모양 (확대 1 기준, 바닥 한 점을 (0,0) 으로) */
  const SHAPES = {
    grass: g => { el("path", { class: "d-grass", d: "M-4,0 l-1.2,-6 M0,0 l0,-8 M4,0 l1.4,-6 M8,1 l0.6,-4.5" }, g); },
    shrub: g => { el("ellipse", { class: "d-shadow", cx: 3, cy: 1, rx: 9, ry: 3.5 }, g); el("ellipse", { class: "d-shrub", cx: 0, cy: -4, rx: 8, ry: 5.5 }, g); },
    tree: g => {
      el("ellipse", { class: "d-shadow", cx: 6, cy: 2, rx: 12, ry: 4.5 }, g);
      el("line", { class: "d-trunk", x1: 0, y1: 0, x2: 0, y2: -13 }, g);
      el("circle", { class: "d-leaf", cx: 0, cy: -22, r: 11 }, g);
      el("circle", { class: "d-leaf-hi", cx: -3.5, cy: -25, r: 5 }, g);
    },
    house: g => {
      /* 낮은 돌집: 바닥 26×18, 높이 15 (아이소메트릭 상자) */
      const P = (x, z, y) => { const [X, Y] = iso(x, z); return [X, Y - y]; };
      const poly = (cls, pts) => el("polygon", { class: cls, points: pts.map(p => p.map(v => v.toFixed(1)).join(",")).join(" ") }, g);
      const H = 15;
      el("ellipse", { class: "d-shadow", cx: 10, cy: -2, rx: 26, ry: 8 }, g);
      poly("d-wall-l", [P(0, 18, 0), P(0, 0, 0), P(0, 0, H), P(0, 18, H)]);
      poly("d-wall-r", [P(0, 0, 0), P(26, 0, 0), P(26, 0, H), P(0, 0, H)]);
      poly("d-roof", [P(-2, -2, H), P(28, -2, H), P(28, 20, H + 2), P(-2, 20, H + 2)]);
      poly("d-roof-edge", [P(-2, -2, H), P(28, -2, H), P(28, 20, H + 2), P(-2, 20, H + 2)]);
    },
    wall: g => { for (let i = 0; i < 5; i++) el("ellipse", { class: "d-stone", cx: i * 5.2, cy: -i * 3, rx: 3.2, ry: 2.3 }, g); }
  };
  decos.forEach(o => {
    o.g = el("g", { class: "hv-deco" }, o.sign > 0 ? gDecoBack : gDecoFront);
    SHAPES[o.type](o.g);
    o.on = false;
  });

  items.forEach(it => {
    it.post = el("line", { class: "hv-post" }, gPosts);
    it.foot = el("circle", { class: "hv-foot", r: 2.4 }, gPosts);
  });

  /* 세 실루엣 (기존 홈과 같은 모양, 진행 방향을 향함) */
  function makeWalker() {
    const g = el("g", { class: "walker" }, gWalkers);
    const parts = cls => {
      const pg = el("g", { class: cls }, g);
      const lines = [0, 1, 2, 3].map(() => el("line", null, pg));
      el("rect", { x: -5.4, y: -4.6, width: 10.8, height: 11, rx: 4.6, stroke: "none" }, pg);
      el("circle", { cx: 0, cy: -8.6, r: 4.1, stroke: "none" }, pg);
      return { pg, lines };
    };
    const shadow = parts("walker-shadow");
    shadow.pg.setAttribute("transform", "translate(2.6,2.4)");
    const body = parts("walker-body");
    return { g, sets: [shadow.lines, body.lines] };
  }
  const walkers = [makeWalker(), makeWalker(), makeWalker()];
  const FORMATION = [[-16, -26, 1.7], [0, 0, 0], [-10, 26, 3.1]];
  function poseWalker(w, x, y, ang, sc, p) {
    w.g.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(ang * 180 / Math.PI + 90).toFixed(1)}) scale(${sc.toFixed(3)})`);
    const Lg = [[-2.3, 5, -2.6, 12.5 - 3 * p], [2.3, 5, 2.6, 12.5 + 3 * p], [-5.2, -2.2, -6.4, 3.2 + 4 * p], [5.2, -2.2, 6.4, 3.2 - 4 * p]];
    w.sets.forEach(lines => lines.forEach((ln, i) => {
      ln.setAttribute("x1", Lg[i][0]); ln.setAttribute("y1", Lg[i][1]);
      ln.setAttribute("x2", Lg[i][2]); ln.setAttribute("y2", Lg[i][3].toFixed(2));
    }));
  }

  /* ---------- 상태 ---------- */
  let vw = 0, vh = 0, vp = 1;
  let progress = 0, head = 0, phase = "start", walkPhase = 0, gait = 0, lastT = 0;
  const cam = { X: 0, Y: 0, z: 1, ready: false };
  let pad = { top: 0, bottom: 0, left: 0, right: 0 };
  let leave = null;

  /* 좁은 화면(모바일): 이정표는 짧게, 출발 표시는 첫 화면에서만·도착 표시는 숨김 → 길과 사진을 크게 */
  let narrow = false;
  const markOn = m => narrow ? (!m.last && phase === "start") : (m.last ? head >= L - 2 : true);
  function measure() {
    vw = stage.clientWidth; vh = stage.clientHeight;
    vp = clamp(Math.min(vw / 1440, vh / 900), 0.45, 1.2);
    const n = vw < 640;
    if (n !== narrow) { narrow = n; marks.forEach(m => { m.node.textContent = narrow ? m.short : m.text; }); }
  }
  function readScroll() {
    const total = section.offsetHeight - window.innerHeight;
    progress = clamp(-section.getBoundingClientRect().top / Math.max(1, total), 0, 1);
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("resize", () => { measure(); readScroll(); });

  /* 길·사진이 놓일 화면 영역: 제목 아래 ~ 범례·버튼 위 (글과 겹치지 않게 실제 위치로 계산) */
  function readPad() {
    const sr = stage.getBoundingClientRect();
    const tb = titleEl.getBoundingClientRect().bottom - sr.top;
    let bt = legendEl.getBoundingClientRect().top - sr.top;
    if (phase === "end") bt = Math.min(bt, endEl.getBoundingClientRect().top - sr.top);
    pad = {
      top: clamp(tb + 20, vh * 0.12, vh * 0.42),
      bottom: clamp(vh - bt + 20, vh * 0.1, vh * 0.4),
      left: vw * 0.05, right: vw * 0.05
    };
  }
  function center() {
    return [pad.left + (vw - pad.left - pad.right) / 2, pad.top + (vh - pad.top - pad.bottom) / 2];
  }
  function toScreen(X, Y) {
    const [cx, cy] = center();
    return [cx + (X - cam.X) * cam.z, cy + (Y - cam.Y) * cam.z];
  }
  const ground = (x, z) => { const [X, Y] = iso(x, z); return toScreen(X, Y); };

  /* 카메라가 담아야 할 범위: 드러난 길 + 지나온 사진(설명 포함) + 이정표 + 세 사람 */
  function cameraTarget(reveal) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const add = (X, Y) => { if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; };
    const zNow = Math.max(cam.z || 1, 0.25);
    for (let s = 0; s <= reveal; s += 20) {
      const p = at(s);
      add(...iso(...side(p, ROAD_W / 2 + 30))); add(...iso(...side(p, -(ROAD_W / 2 + 30))));
    }
    items.forEach(it => {
      if (it.s > head + 1) return;
      const [X, Y] = iso(...it.anchor);
      const h = PHOTO_W * 0.75 + 36 / zNow;          // 사진 + 설명 두 줄
      add(X - PHOTO_W * 0.55, Y); add(X + PHOTO_W * 0.55, Y);
      if (it.sign > 0) add(X, Y - it.postH - h); else add(X, Y + it.postH + h);
    });
    marks.forEach(m => {
      if (!markOn(m)) return;
      const [X, Y] = iso(...m.pos), w = (m.node.offsetWidth + 10) / zNow;
      add(m.align === "end" ? X - w : X + w, Y - 12 / zNow); add(X, Y + 12 / zNow);
    });
    const hp = at(head), [HX, HY] = iso(hp.x, hp.z);
    add(HX + 40 / zNow, HY - 50 / zNow);
    const aw = vw - pad.left - pad.right, ah = vh - pad.top - pad.bottom;
    const zFit = Math.min(aw / Math.max(1, x1 - x0), ah / Math.max(1, y1 - y0));
    return { X: (x0 + x1) / 2, Y: (y0 + y1) / 2, z: Math.min(ZOOM_MAX * vp, zFit) };
  }

  /* 길의 한 구간을 띠(폴리곤)로 / 길 위의 한 줄(차선)로 */
  function ribbon(s0, s1) {
    if (s1 <= s0) return "";
    const left = [], right = [];
    for (let s = s0; ; s += 5) {
      const t = Math.min(s, s1), p = at(t);
      left.push(ground(...side(p, ROAD_W / 2)));
      right.push(ground(...side(p, -ROAD_W / 2)));
      if (t >= s1) break;
    }
    const pts = left.concat(right.reverse());
    return "M" + pts.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join("L") + "Z";
  }
  function lane(s0, s1, off) {
    if (s1 <= s0) return "";
    const pts = [];
    for (let s = s0; ; s += 5) {
      const t = Math.min(s, s1);
      pts.push(ground(...side(at(t), off)));
      if (t >= s1) break;
    }
    return "M" + pts.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join("L");
  }

  /* 개요로 이동: 버튼으로 왔다는 표시를 남겨, 개요가 맨 위에서 시작하고 도착 효과를 보여 주게 함
     (주소 뒤 ?from=home 이 전달되지 않는 환경을 위해 sessionStorage 에도 기록) */
  function goOverview() {
    try { sessionStorage.setItem("fromHome", "1"); } catch (err) { /* 저장소 없음 */ }
    location.href = TARGET;
  }

  /* ---------- 전환: '두 번의 걷기 펼쳐보기' 를 눌렀을 때만 ---------- */
  function startLeave(e) {
    e.preventDefault();
    if (leave || phase !== "end") return;
    document.documentElement.style.overflow = "hidden";   // 전환 중에는 스크롤 멈춤
    stage.classList.add("is-leaving");
    if (reduce) {                                          // 동작 줄이기: 확대 없이 짧은 페이드
      cover.classList.add("is-on");
      leave = { reduced: true };
      setTimeout(goOverview, 300);
      return;
    }
    const [cx, cy] = center();
    leave = { t0: performance.now(), X: cam.X, Y: cam.Y, z: cam.z, pad: Object.assign({}, pad) };
    const dest = at(L + DEST_AHEAD), [DX, DY] = iso(dest.x, dest.z);
    leave.D = [DX, DY];
    leave.zEnd = Math.max(cam.z * 14, vw * 1.8 / ROAD_W);
    world.style.transformOrigin = `${cx.toFixed(0)}px ${cy.toFixed(0)}px`;
  }
  cta.addEventListener("click", startLeave);
  /* 뒤로 가기로 돌아왔을 때(페이지 보관 복원) 전환 상태를 깨끗이 되돌림 */
  window.addEventListener("pageshow", ev => {
    if (!ev.persisted && !leave) return;
    leave = null;
    document.documentElement.style.overflow = "";
    stage.classList.remove("is-leaving");
    cover.classList.remove("is-on");
    world.style.transform = ""; world.style.opacity = "";
    layer.style.opacity = ""; gWalkers.style.opacity = ""; gDecoBack.style.opacity = ""; gDecoFront.style.opacity = ""; gPosts.style.opacity = "";
    gDest.style.opacity = "";
    cam.ready = false;
    measure(); readScroll();
  });

  /* ---------- 매 프레임 ---------- */
  function tick(now) {
    const dt = Math.min(50, lastT ? now - lastT : 16.7);
    lastT = now;
    let roadEnd;

    if (leave && !leave.reduced) {
      /* STEP 01–03: 길 끝 너머로 길이 이어지고, 카메라가 그 방향으로 전진하며 길 안으로 들어감 */
      const t = now - leave.t0;
      const k1 = easeOut(clamp(t / LEAVE.fade, 0, 1));
      const u = easeInOut(clamp((t - LEAVE.fade * 0.6) / LEAVE.dolly, 0, 1));
      pad = leave.pad;
      cam.z = leave.z * Math.pow(leave.zEnd / leave.z, u);
      /* 목적 지점이 화면 중앙으로 부드럽게 다가오도록 카메라 위치를 맞춤 */
      const [DX, DY] = leave.D;
      const sx = (DX - leave.X) * leave.z * (1 - u), sy = (DY - leave.Y) * leave.z * (1 - u);
      cam.X = DX - sx / cam.z; cam.Y = DY - sy / cam.z;
      roadEnd = L + EXT * k1;
      world.style.transform = `perspective(1100px) rotateX(${(16 * u).toFixed(2)}deg)`;
      const out = 1 - clamp((t - LEAVE.fade) / 420, 0, 1);
      layer.style.opacity = out; gPosts.style.opacity = out;
      gDecoBack.style.opacity = out; gDecoFront.style.opacity = out;
      gWalkers.style.opacity = 1 - clamp((t - LEAVE.fade - 150) / 450, 0, 1);
      gDest.style.opacity = (k1 * (1 - clamp((t - LEAVE.fade - 500) / 400, 0, 1))).toFixed(3);
      if (t > LEAVE.cover && !leave.covered) { leave.covered = true; cover.classList.add("is-on"); }
      if (t > LEAVE.go && !leave.gone) { leave.gone = true; goOverview(); }
    } else if (!leave) {
      /* 스크롤 진행도 → 가야 할 위치. 세 사람은 일정한 속도로 걷습니다 */
      const target = clamp(progress / WALK_END, 0, 1) * L;
      const max = reduce ? Infinity : SPEED * dt;
      const step = clamp(target - head, -max, max);
      head += step;
      const moving = Math.abs(step) > 0.01;
      walkPhase += Math.abs(step) * 0.55;
      gait = moving ? Math.min(1, gait + 0.1) : Math.max(0, gait - 0.08);

      const next = progress < 0.02 ? "start" : (progress >= END_AT && head >= L - 1 ? "end" : "walk");
      if (next !== phase) {
        phase = next; stage.dataset.phase = phase;
        if (phase === "end") endEl.removeAttribute("inert"); else endEl.setAttribute("inert", "");
      }
      readPad();
      /* 카메라: 드러난 길 전체를 담도록 천천히 물러남 */
      const reveal = Math.min(L, head + LEAD + (head < L ? HINT * 0.6 : 0));
      const ct = cameraTarget(reveal);
      const k = reduce || !cam.ready ? 1 : 1 - Math.pow(1 - 0.07, dt / 16.7);
      cam.X = lerp(cam.X, ct.X, k); cam.Y = lerp(cam.Y, ct.Y, k); cam.z = lerp(cam.z, ct.z, k);
      cam.ready = true;
      roadEnd = Math.min(L, head + LEAD);
    } else {
      roadEnd = L;
    }

    /* 길 */
    const roadD = ribbon(0, roadEnd);
    gRoad.setAttribute("d", roadD);
    gSlab.setAttribute("d", roadD);
    gSlab.setAttribute("transform", `translate(0,${(SLAB * cam.z).toFixed(1)})`);
    const hintOn = !leave && roadEnd < L;
    gAhead.setAttribute("d", hintOn ? ribbon(roadEnd, Math.min(L, roadEnd + HINT)) : "");
    gAheadLine.setAttribute("d", hintOn ? lane(roadEnd, Math.min(L, roadEnd + HINT), 0) : "");
    /* 두 차선: 위쪽은 A(낮), 아래쪽은 B(저녁) */
    const lw = clamp(2.2 * cam.z, 1.6, 900).toFixed(1);
    laneA.setAttribute("d", lane(0, roadEnd, ROAD_W / 4)); laneA.setAttribute("stroke-width", lw);
    laneB.setAttribute("d", lane(0, roadEnd, -ROAD_W / 4)); laneB.setAttribute("stroke-width", lw);

    /* 목적 지점 (전환 때만) */
    if (leave && !leave.reduced) {
      const d = at(L + DEST_AHEAD), [x, y] = ground(d.x, d.z);
      destRing.setAttribute("cx", x.toFixed(1)); destRing.setAttribute("cy", y.toFixed(1));
      destRing.setAttribute("r", (14 * Math.min(cam.z, 3)).toFixed(1));
      destDot.setAttribute("cx", x.toFixed(1)); destDot.setAttribute("cy", y.toFixed(1));
      destDot.setAttribute("r", (3 * Math.min(cam.z, 3)).toFixed(1));
    }

    /* 풍경: 지나온 곳(조금 앞까지)부터 */
    decos.forEach(o => {
      const on = o.s <= head + LEAD + 30 || !!leave;
      if (on !== o.on) { o.on = on; o.g.classList.toggle("is-on", on); }
      const [x, y] = ground(...o.pos);
      o.g.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${cam.z.toFixed(3)})`);
    });

    /* 사진: 지나간 지점만. 오래된 사진은 작고 옅게, 설명은 최근 사진에만 */
    const shown = items.filter(it => it.s <= head + 2);
    items.forEach(it => {
      const on = it.s <= head + 2;
      if (on !== it.on) { it.on = on; it.node.classList.toggle("is-on", on); }
      const rank = on ? shown.length - 1 - shown.indexOf(it) : 0;
      const old = phase !== "end" && rank >= 4;
      it.node.classList.toggle("is-old", on && old);
      const age = phase === "end" ? 0.9 : old ? 0.8 : 1;
      const w = PHOTO_W * cam.z * age;
      it.node.classList.toggle("no-cap", !on || old || w < 72);
      const [ax, ay] = ground(...it.anchor);
      const post = it.postH * cam.z;
      it.node.style.width = w.toFixed(1) + "px";
      const y = it.sign > 0 ? ay - post - it.node.offsetHeight : ay + post;
      it.node.style.transform = `translate(${(ax - w / 2).toFixed(1)}px, ${y.toFixed(1)}px)`;
      const y2 = it.sign > 0 ? ay - post : ay + post;
      it.post.setAttribute("x1", ax.toFixed(1)); it.post.setAttribute("y1", ay.toFixed(1));
      it.post.setAttribute("x2", ax.toFixed(1)); it.post.setAttribute("y2", y2.toFixed(1));
      it.post.style.opacity = on ? 1 : 0;
      it.foot.setAttribute("cx", ax.toFixed(1)); it.foot.setAttribute("cy", ay.toFixed(1));
      it.foot.style.opacity = on ? 1 : 0;
    });
    countEl.textContent = shown.length;

    /* 이정표: 출발 표시는 처음부터, 도착 표시는 길 끝에 닿았을 때 */
    /* A(위)·B(아래) 이정표가 한 쌍씩 붙어 있으므로, 글자가 겹치지 않게 B 를 필요한 만큼 아래로 */
    const placed = {};
    marks.forEach(m => {
      const on = markOn(m);
      m.node.classList.toggle("is-on", on);
      let [x, y] = ground(...m.pos);
      const key = m.last ? "end" : "start", h = m.node.offsetHeight || 22;
      if (m.ev === "a") placed[key] = y;
      else if (placed[key] != null) y = Math.max(y, placed[key] + h + 8);
      const w = m.node.offsetWidth;
      m.node.style.transform = `translate(${(m.align === "end" ? x - w : x).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px)`;
    });

    /* 세 사람 */
    const p = at(head);
    const [hx, hy] = ground(p.x, p.z);
    const [fx, fy] = ground(p.x + p.tx, p.z + p.tz);
    const ang = Math.atan2(fy - hy, fx - hx);
    const sc = 1.5 * cam.z;
    FORMATION.forEach(([back, sd, ph], i) => {
      const bx = back * sc / 1.9, by = sd * sc / 1.9;
      const x = hx + Math.cos(ang) * bx - Math.sin(ang) * by;
      const y = hy + Math.sin(ang) * bx + Math.cos(ang) * by - 6 * cam.z;
      poseWalker(walkers[i], x, y, ang, sc, Math.sin(walkPhase / 6 + ph) * gait);
    });

    requestAnimationFrame(tick);
  }

  measure();
  readScroll();
  stage.dataset.phase = phase;
  requestAnimationFrame(tick);
})();
