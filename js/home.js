/* ==========================================================================
   홈 화면 인터랙션
   --------------------------------------------------------------------------
   · 스크롤: 세 사람이 오른쪽으로 걸어가고, 일정한 간격마다 장면(사진)이 하나씩 놓입니다.
   · 커서: 길과 사진 근처(세 사람 주변)에 있을 때만 반응합니다.
           위아래로 움직이면 걷는 줄이 살짝 휘고, 앞쪽에 두면 조금 더 앞으로 걸어 나갑니다.
   · 스크롤 끝: 세 사람이 갈림길로 모이고, 두 가닥이 사건 A·B 입구로 갈라집니다.
   홈의 길은 실제 이동 경로가 아닌 개념적인 길입니다.
   A(낮)의 사진은 길 위쪽, B(저녁)의 사진은 아래쪽에 번갈아 놓입니다.
   ========================================================================== */
(function () {
  "use strict";

  const D = window.SITE_DATA;
  const CFG = D.home;
  const W = 1440, H = 900;
  const NS = "http://www.w3.org/2000/svg";

  /* ---- 조절하기 쉬운 값들 ---- */
  const START_X = 520;          // 길이 시작하는 지점 (보드 좌표)
  const HEAD_START = 940;       // 첫 화면에서 세 사람의 위치
  const FIRST_PHOTO_X = 638;    // 첫 사진 위치
  const PHOTO_STEP = 142;       // 사진 사이 간격 (위·아래 번갈아)
  const PHOTO_OFF = 130;        // 길 중심에서 사진 중심까지 거리
  const LATERAL = 60;           // 커서로 길을 위아래로 휘게 할 수 있는 최대 폭
  const DRIFT = 110;            // 커서로 더 걸어 나갈 수 있는 최대 거리
  const ZONE = { back: 420, ahead: 320, height: 220 };  // 커서가 반응하는 범위 (세 사람 기준)
  const SCREEN_HEAD_X = 1040;   // 세 사람이 화면에서 머무는 가로 위치 (길은 왼쪽으로 흘러감)
  const WALK_END = 0.78;        // 이 진행도에 마지막 사진까지 도착
  const FORK_AT = 0.82;         // 이 진행도부터 갈림길
  const FORK = { x: 536, y: 522 };
  const AMP = 20, LAMBDA = 180; // 두 가닥의 폭과 꼬임 길이

  const laneY = x => 460 + 50 * Math.cos((x - START_X) / 260);

  const stage = document.getElementById("home-stage");
  const board = document.getElementById("home-board");
  const svg = document.getElementById("home-svg");
  const section = document.getElementById("home");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const photoById = id => D.photos.find(p => p.id === id);
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- 보드를 화면 크기에 맞추기 ---------- */
  let scale = 1, ox = 0, oy = 0;
  function fit() {
    const w = stage.clientWidth, h = stage.clientHeight;
    scale = Math.min(w / W, h / H);
    ox = (w - W * scale) / 2;
    oy = (h - H * scale) / 2;
    board.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
  }

  /* ---------- 레이어 ---------- */
  const world = el("g", { class: "world" }, svg);           // 길과 사진 (카메라와 함께 움직임)
  const gTrail = el("g", { class: "trail" }, world);
  const pathA = el("path", { class: "thread thread-a" }, gTrail);
  const pathB = el("path", { class: "thread thread-b" }, gTrail);
  el("circle", { r: 3, class: "ghost-dot", cx: START_X, cy: laneY(START_X) }, gTrail);
  const gPhotos = el("g", { class: "photos" }, world);
  const gFork = el("g", { class: "fork" }, svg);
  el("path", { class: "fork-strand thread-a", pathLength: 1, d: "M536,522 C660,470 720,300 860,290" }, gFork);
  el("path", { class: "fork-strand thread-b", pathLength: 1, d: "M536,522 C660,575 720,660 860,650" }, gFork);
  el("circle", { class: "fork-knot knot-a", cx: 860, cy: 290, r: 3.4 }, gFork);
  el("circle", { class: "fork-knot knot-b", cx: 860, cy: 650, r: 3.4 }, gFork);
  const gGhost = el("g", { class: "ghost" }, svg);
  const ghostLine = el("path", { class: "ghost-line" }, gGhost);
  el("circle", { class: "ghost-ring", cx: 1146, cy: 322, r: 12 }, gGhost);
  el("circle", { class: "ghost-dot", cx: 1146, cy: 322, r: 2 }, gGhost);
  const gWalkers = el("g", { class: "walkers" }, svg);

  /* ---------- 지나온 길: x 가 커지는 방향으로만 기록 ---------- */
  const px = [], py = [];
  function extendTo(x, y) {
    let lx = px.length ? px[px.length - 1] : START_X - 4;
    let ly = py.length ? py[py.length - 1] : laneY(START_X);
    while (lx + 4 <= x) {
      const nx = lx + 4, t = (nx - lx) / (x - lx);
      ly = lerp(ly, y, t); lx = nx;
      px.push(lx); py.push(ly);
    }
  }
  function trimTo(x) { while (px.length > 2 && px[px.length - 1] > x) { px.pop(); py.pop(); } }
  function trailY(x) {
    if (!px.length) return laneY(x);
    const i = clamp(Math.round((x - px[0]) / 4), 0, px.length - 1);
    return py[i];
  }

  function drawBraid() {
    let a = "", b = "", s = 0;
    for (let i = 0; i < px.length; i++) {
      if (i) s += Math.hypot(px[i] - px[i - 1], py[i] - py[i - 1]);
      const i0 = Math.max(0, i - 3), i1 = Math.min(px.length - 1, i + 3);
      const ang = Math.atan2(py[i1] - py[i0], px[i1] - px[i0]);
      const o = AMP * Math.min(1, s / 60) * Math.sin(2 * Math.PI * s / LAMBDA);
      const nx = Math.sin(ang) * o, ny = -Math.cos(ang) * o;
      const c = i ? "L" : "M";
      a += c + (px[i] + nx).toFixed(1) + "," + (py[i] + ny).toFixed(1);
      b += c + (px[i] - nx).toFixed(1) + "," + (py[i] - ny).toFixed(1);
    }
    pathA.setAttribute("d", a);
    pathB.setAttribute("d", b);
  }

  /* ---------- 사진: 정해진 자리에 일정한 간격으로 ---------- */
  const PW = 150, PH = 112, HW = PW / 2 + 5, HH = PH / 2 + 5;
  const MAT_R = 12, IMG_R = 8;   // 사진 테두리·사진의 모서리 둥글기
  /* 사진 모서리를 둥글게 자르는 틀 (모든 사진이 같은 크기라 하나를 같이 씀) */
  const clip = el("clipPath", { id: "ph-clip", clipPathUnits: "objectBoundingBox" }, el("defs", null, svg));
  el("rect", { width: 1, height: 1, rx: IMG_R / PW, ry: IMG_R / PH }, clip);
  const items = CFG.initial.concat(CFG.sequence).map((id, k) => {
    const side = id.startsWith("a-") ? "A" : "B";
    const x = FIRST_PHOTO_X + k * PHOTO_STEP;
    return { id, k, side, x, photo: photoById(id), label: CFG.labels[id], node: null, shown: false };
  });
  const lastPhotoX = items[items.length - 1].x;
  const WALK_LIMIT = lastPhotoX + 120;

  function buildPhoto(item) {
    const sign = item.side === "A" ? -1 : 1;          // A 위, B 아래
    const ly = laneY(item.x);
    const cx = item.x, cy = ly + sign * PHOTO_OFF;
    const link = el("a", { class: `ph ph-${item.side.toLowerCase()} is-hidden`, href: item.side === "A" ? "#event-a" : "#event-b",
      "aria-label": `${item.label} · 사건 ${item.side} 보기` }, gPhotos);
    item.leader = el("line", { class: "leader", x1: cx, x2: cx, y2: cy - sign * HH }, link);
    item.knot = el("circle", { class: "knot", cx, r: 2.6 }, link);
    const pg = el("g", { transform: `translate(${cx},${cy.toFixed(1)}) rotate(${item.k % 2 ? 1.5 : -1.5})` }, link);
    const inner = el("g", { class: "ph-in" }, pg);
    el("rect", { class: "ph-mat", x: -HW, y: -HH, width: HW * 2, height: HH * 2, rx: MAT_R }, inner);
    const img = el("image", { x: -PW / 2, y: -PH / 2, width: PW, height: PH, preserveAspectRatio: "xMidYMid slice", "clip-path": "url(#ph-clip)" }, inner);
    img.setAttribute("href", item.photo.file);
    el("title", null, img).textContent = item.photo.alt;
    const cap = el("text", { class: "ph-cap", x: -PW / 2, y: item.side === "A" ? -HH - 9 : HH + 18 }, inner);
    cap.textContent = item.label;
    item.node = link;
  }
  function placeKnot(item) {
    /* 매듭은 실제로 걸어간 길(가닥) 위에 붙습니다 */
    const y = trailY(item.x);
    item.knot.setAttribute("cy", y.toFixed(1));
    item.leader.setAttribute("y1", y.toFixed(1));
  }
  function show(item, on, animate) {
    if (item.shown === on) return;
    item.shown = on;
    if (on) {
      placeKnot(item);
      if (animate) { item.node.getBoundingClientRect(); requestAnimationFrame(() => item.node.classList.remove("is-hidden")); }
      else item.node.classList.remove("is-hidden");
    } else item.node.classList.add("is-hidden");
    updateCount();
  }
  items.forEach(buildPhoto);

  const cTotal = document.getElementById("count-total");
  const cA = document.getElementById("count-a");
  const cB = document.getElementById("count-b");
  function updateCount() {
    const on = items.filter(i => i.shown);
    cTotal.textContent = on.length;
    cA.textContent = on.filter(i => i.side === "A").length;
    cB.textContent = on.filter(i => i.side === "B").length;
  }

  /* ---------- 갈림길 입구 사진 ---------- */
  const STACK = { A: [[0, 40, -7], [40, 90, 3], [70, 0, 9]], B: [[0, 40, -5], [40, 92, 4], [72, 0, -9]] };
  document.querySelectorAll(".gate-stack").forEach(box => {
    const key = box.dataset.gate;
    CFG.gates[key].forEach((id, i) => {
      const p = photoById(id), [l, t, r] = STACK[key][i];
      const img = document.createElement("img");
      img.src = p.file; img.alt = ""; img.loading = "lazy";
      img.style.left = l + "px"; img.style.top = t + "px"; img.style.setProperty("--r", r + "deg");
      box.appendChild(img);
    });
  });

  /* ---------- 세 실루엣 (항상 오른쪽을 향함) ---------- */
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
  function poseWalker(w, x, y, ang, p) {
    w.g.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(ang * 180 / Math.PI + 90).toFixed(1)}) scale(1.9)`);
    const L = [[-2.3, 5, -2.6, 12.5 - 3 * p], [2.3, 5, 2.6, 12.5 + 3 * p], [-5.2, -2.2, -6.4, 3.2 + 4 * p], [5.2, -2.2, 6.4, 3.2 - 4 * p]];
    w.sets.forEach(lines => lines.forEach((ln, i) => {
      ln.setAttribute("x1", L[i][0]); ln.setAttribute("y1", L[i][1]);
      ln.setAttribute("x2", L[i][2]); ln.setAttribute("y2", L[i][3].toFixed(2));
    }));
  }
  /* 대형: 가운데가 앞, 양옆이 반 걸음 뒤 (진행 방향 기준) */
  const FORMATION = [[-16, -26, 1.7], [0, 0, 0], [-10, 26, 3.1]];

  /* ---------- 상태 ---------- */
  let headX = HEAD_START, lat = 0, drift = 0, cam = 0;
  let progress = 0, phase = "start", forkT = 0, walkPhase = 0, gait = 0;
  let cursor = null, cursorMoved = false;

  const cursorHint = document.getElementById("cursor-hint");
  stage.addEventListener("pointermove", e => {
    const r = stage.getBoundingClientRect();
    cursor = { x: (e.clientX - r.left - ox) / scale, y: (e.clientY - r.top - oy) / scale };
  });
  stage.addEventListener("pointerleave", () => { cursor = null; });

  function readScroll() {
    const total = section.offsetHeight - window.innerHeight;
    progress = clamp(-section.getBoundingClientRect().top / Math.max(1, total), 0, 1);
    const next = progress < 0.02 ? "start" : progress < FORK_AT ? "walk" : "fork";
    if (next !== phase) { phase = next; stage.dataset.phase = phase; }
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("resize", () => { fit(); readScroll(); });

  /* 첫 화면 상태 */
  extendTo(HEAD_START, laneY(HEAD_START));
  items.forEach(it => { if (it.x + 60 <= HEAD_START) show(it, true, false); });

  /* ---------- 매 프레임 ---------- */
  function tick() {
    const headScreenX = headX - cam;
    const headY = laneY(headX) + lat;

    /* 커서: 세 사람 주변 범위 안에서만 반응 */
    let latTarget = 0, driftTarget = 0;
    if (cursor && phase !== "fork") {
      const dx = cursor.x - headScreenX, dy = cursor.y - headY;
      const inside = dx > -ZONE.back && dx < ZONE.ahead && Math.abs(cursor.y - laneY(headX)) < ZONE.height;
      if (inside) {
        latTarget = clamp(cursor.y - laneY(headX), -LATERAL, LATERAL);
        driftTarget = clamp((dx - 30) * 0.5, 0, DRIFT);
        if (!cursorMoved) { cursorMoved = true; gGhost.classList.add("is-gone"); cursorHint.classList.add("is-gone"); }
      }
    }
    lat = lerp(lat, latTarget, 0.04);
    drift = lerp(drift, driftTarget, 0.04);

    /* 스크롤이 정하는 위치 + 커서로 더 걸어 나간 만큼 */
    const walkP = clamp(progress / WALK_END, 0, 1);
    const targetX = Math.min(lerp(HEAD_START, WALK_LIMIT, walkP) + drift, WALK_LIMIT + DRIFT);
    const step = clamp(targetX - headX, -9, 6);
    headX += step;
    const moving = Math.abs(step) > 0.05 || Math.abs(latTarget - lat) > 0.5;
    if (step > 0) extendTo(headX, laneY(headX) + lat);
    else if (step < 0) trimTo(headX);
    /* 길의 끝은 세 사람을 따라 위아래로 부드럽게 휘어집니다 */
    let bent = false;
    if (px.length > 13) {
      const n = px.length, d = headY - py[n - 1];
      if (Math.abs(d) > 0.3) {
        for (let j = 0; j <= 12; j++) py[n - 1 - j] += d * (1 - j / 12);
        bent = true;
      }
    }
    if (step !== 0 || bent) drawBraid();
    walkPhase += Math.abs(step) + Math.abs(latTarget - lat) * 0.04;
    gait = moving ? Math.min(1, gait + 0.08) : Math.max(0, gait - 0.05);

    /* 사진: 세 사람이 지나간 자리만 보이기 */
    items.forEach(it => show(it, it.x + 60 <= headX, true));

    /* 카메라: 세 사람이 화면 오른쪽에 머물고 길이 왼쪽으로 흘러갑니다 */
    cam = lerp(cam, Math.max(0, headX - SCREEN_HEAD_X), 0.12);
    world.setAttribute("transform", `translate(${(-cam).toFixed(1)},0)`);

    /* 세 실루엣 */
    forkT = clamp(forkT + (phase === "fork" ? 0.025 : -0.04), 0, 1);
    const e = forkT * forkT * (3 - 2 * forkT);
    const slope = Math.atan2(laneY(headX + 6) + lat - (laneY(headX - 6) + lat), 12);
    const ang = clamp(slope, -0.35, 0.35) * (1 - e);           // 거의 오른쪽, 갈림길에서는 정면 오른쪽
    const lx = lerp(headX - cam, FORK.x, e), ly = lerp(headY, FORK.y, e);
    const forkMoving = forkT > 0 && forkT < 1;
    if (forkMoving) { walkPhase += 3; gait = 1; }
    FORMATION.forEach(([back, side, ph], i) => {
      const x = lx + Math.cos(ang) * back - Math.sin(ang) * side;
      const y = ly + Math.sin(ang) * back + Math.cos(ang) * side;
      poseWalker(walkers[i], x, y, ang, Math.sin(walkPhase / 6 + ph) * gait);
    });
    ghostLine.setAttribute("d", `M${(lx + 24).toFixed(1)},${(ly - 6).toFixed(1)} Q1080,320 1128,322`);

    requestAnimationFrame(tick);
  }

  fit();
  drawBraid();
  readScroll();
  stage.dataset.phase = phase;
  requestAnimationFrame(tick);
})();
