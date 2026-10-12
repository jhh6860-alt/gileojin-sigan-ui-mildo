/* ==========================================================================
   Citrus Graphic Edition — 그래픽 레이어 (citrus*.html 에서만 실행)
   --------------------------------------------------------------------------
   · 배경: 흐릿한 오렌지 블롭과 평면 잎을 아주 옅게 깝니다.
   · 경로: 기존 페이지가 그린 경로선(홈 차선 · 개요 경로 · 비교 그래프 선)을 그대로 따라가며
     '오렌지 껍질을 길게 벗겨 놓은 듯한' 리본으로 덧그립니다.
     - 폭이 주기적으로 넓어졌다 좁아져 껍질이 살짝 비틀린 것처럼 보이고,
       가운데에는 옅은 속껍질 색 띠가 있어 겉/속 이중 구조가 됩니다.
     - 홈에서는 A·B 두 리본이 서로 감기며(DNA처럼) 앞뒤가 번갈아 보입니다.
   · 원래 선은 지우지 않고 가는 '솔기'로 남깁니다. 그리기 진행(스크롤)·강조·되돌아가기는
     원래 코드가 그대로 맡고, 이 파일은 그 상태를 따라 그리기만 합니다.
   ========================================================================== */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const evOf = node => /-a(\s|$)/.test(node.getAttribute("class") || "") ? "a" : "b";

  /* ---------- 1. 배경 그래픽 ---------- */
  const bg = document.createElement("div");
  bg.className = "citrus-bg";
  bg.setAttribute("aria-hidden", "true");
  bg.innerHTML =
    '<i class="cb cb-1"></i><i class="cb cb-2"></i><i class="cb cb-3"></i><i class="cb cb-4"></i>' +
    '<svg class="citrus-leaves" viewBox="0 0 220 120">' +
      '<path class="lf" d="M10,70 C60,20 130,14 200,40 C140,70 70,86 10,70Z"/>' +
      '<path class="vein" d="M18,68 C80,52 140,44 196,41"/>' +
      '<path class="lf2" d="M40,82 C80,96 130,104 170,96 C130,78 84,74 40,82Z"/>' +
    '</svg>';
  document.body.prepend(bg);

  /* ---------- 2. 껍질 리본 만들기 ----------
     pts: [{x, y}] 선 위의 점들 (같은 좌표계). w: 최대 폭. lambda: 비틀림 한 번의 길이 */
  function ribbonD(pts, w, lambda, from, to, scale) {
    /* from~to 구간(점 번호)만 폴리곤으로 */
    const left = [], right = [];
    for (let i = from; i <= to; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const half = (w / 2) * (0.34 + 0.66 * Math.abs(Math.cos(Math.PI * p.s / lambda))) * scale;
      left.push([p.x - ty * half, p.y + tx * half]);
      right.push([p.x + ty * half, p.y - tx * half]);
    }
    if (left.length < 2) return "";
    return "M" + left.concat(right.reverse()).map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join("L") + "Z";
  }
  function withLength(pts) {
    let s = 0;
    pts.forEach((p, i) => { if (i) s += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y); p.s = s; });
    return pts;
  }

  /* ---------- 3. 개요·비교: 고정된 경로선을 리본으로 (그리기 진행은 원래 선을 따라감) ---------- */
  const synced = [];
  let maskId = 0;
  function ribbonize(path, w, lambda) {
    const svg = path.ownerSVGElement;
    if (!svg || path.dataset.citrus) return;
    path.dataset.citrus = "1";
    let len = 0;
    try { len = path.getTotalLength(); } catch (e) { return; }
    if (!len) return;
    const n = Math.max(12, Math.min(600, Math.round(len / Math.max(1, w * 0.35))));
    const pts = [];
    for (let i = 0; i <= n; i++) { const q = path.getPointAtLength(len * i / n); pts.push({ x: q.x, y: q.y }); }
    withLength(pts);
    const ev = evOf(path);
    const g = el("g", { class: "citrus-ribbon", "aria-hidden": "true" });
    el("path", { class: "peel-" + ev, d: ribbonD(pts, w, lambda, 0, pts.length - 1, 1) }, g);
    el("path", { class: "pith-" + ev, d: ribbonD(pts, w, lambda, 0, pts.length - 1, 0.36) }, g);
    path.parentNode.insertBefore(g, path);
    path.classList.add("citrus-seam");
    /* 원래 선이 점점 그려지는 방식(pathLength=1 + dashoffset)이면 같은 진행으로 리본을 드러냄 */
    if (path.getAttribute("pathLength") === "1") {
      let defs = svg.querySelector("defs") || el("defs", null, svg);
      const id = "citrus-m" + (++maskId);
      const mask = el("mask", { id, maskUnits: "userSpaceOnUse", x: -1e4, y: -1e4, width: 2e4, height: 2e4 }, defs);
      const mp = el("path", { d: path.getAttribute("d"), fill: "none", stroke: "#fff", "stroke-width": w * 1.8, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1 }, mask);
      mp.style.strokeDasharray = "1";
      g.setAttribute("mask", `url(#${id})`);
      synced.push({ path, mp });
    }
  }
  /* 개요: 큰 지도와 작은 지도의 A·B 경로 */
  document.querySelectorAll(".ov-stage .ov-path").forEach(p => {
    const vb = p.ownerSVGElement.viewBox.baseVal;
    ribbonize(p, vb.width * 0.017, vb.width * 0.075);
  });
  /* 비교: 각 장면 그래프의 A·B 선, 종합 장면의 작은 기호 */
  document.querySelectorAll(".cp-graphic svg .cp-line, .cp-rows svg .cp-line").forEach(p => {
    const vb = p.ownerSVGElement.viewBox.baseVal;
    ribbonize(p, Math.max(3, vb.width * 0.02), vb.width * 0.08);
  });

  /* ---------- 4. 홈: 두 차선을 따라 A·B 껍질 리본이 서로 감기며 이어짐 ---------- */
  const laneA = document.querySelector(".hv-lane-a"), laneB = document.querySelector(".hv-lane-b");
  let braid = null, lastD = "";
  if (laneA && laneB) {
    const g = el("g", { class: "citrus-braid", "aria-hidden": "true" });
    laneA.parentNode.insertBefore(g, laneA);
    const mk = cls => el("path", { class: cls }, g);
    braid = {
      shadow: mk("peel-shadow"),
      back: { a: [mk("peel-a"), mk("pith-a")], b: [mk("peel-b"), mk("pith-b")] },
      front: { a: [mk("peel-a"), mk("pith-a")], b: [mk("peel-b"), mk("pith-b")] }
    };
    /* 뒤쪽 조각을 먼저, 앞쪽 조각을 나중에 그려 서로 감기는 앞뒤가 보이게 */
    ["back", "front"].forEach(k => ["a", "b"].forEach(ev => braid[k][ev].forEach(p => g.appendChild(p))));
  }
  const parsePts = d => d.slice(1).split("L").map(t => { const [x, y] = t.split(","); return { x: +x, y: +y }; });
  function drawBraid() {
    const da = laneA.getAttribute("d") || "", db = laneB.getAttribute("d") || "";
    const key = da + "|" + db;
    if (key === lastD) return;
    lastD = key;
    const clear = () => { braid.shadow.setAttribute("d", ""); ["back", "front"].forEach(k => ["a", "b"].forEach(ev => braid[k][ev].forEach(p => p.setAttribute("d", "")))); };
    if (da.length < 4 || db.length < 4) { clear(); return; }
    const A = parsePts(da), B = parsePts(db), n = Math.min(A.length, B.length);
    if (n < 2) { clear(); return; }
    const z = Math.max(0.2, parseFloat(laneA.getAttribute("stroke-width") || "2.2") / 2.2);   // 화면 확대 정도
    /* 가운데 선과 두 차선의 간격 → 서로 감기는 두 리본 */
    const C = [];
    for (let i = 0; i < n; i++) C.push({ x: (A[i].x + B[i].x) / 2, y: (A[i].y + B[i].y) / 2, gx: (A[i].x - B[i].x) / 2, gy: (A[i].y - B[i].y) / 2 });
    withLength(C);
    const lam = 210 * z;                                  // 한 번 감기는 길이 (화면 px)
    const ramp = s => Math.min(1, s / (60 * z));          // 출발점에서는 겹쳐 있다가 서서히 벌어짐
    const pa = [], pb = [];
    C.forEach(c => {
      const ph = 2 * Math.PI * c.s / lam, k = Math.cos(ph) * (0.25 + 0.75 * ramp(c.s));
      pa.push({ x: c.x + c.gx * k, y: c.y + c.gy * k, front: Math.sin(ph) >= 0 });
      pb.push({ x: c.x - c.gx * k, y: c.y - c.gy * k, front: Math.sin(ph) < 0 });
    });
    withLength(pa); withLength(pb);
    const w = 19 * z, tw = 90 * z;                        // 리본 폭과 비틀림 주기
    let shadow = "";
    ["a", "b"].forEach(ev => {
      const pts = ev === "a" ? pa : pb;
      const parts = { back: ["", ""], front: ["", ""] };
      let i0 = 0;
      for (let i = 1; i <= pts.length; i++) {
        if (i === pts.length || pts[i].front !== pts[i0].front) {
          const k = pts[i0].front ? "front" : "back", to = Math.min(pts.length - 1, i);   // 한 점 겹쳐 이음매가 벌어지지 않게
          const outer = ribbonD(pts, w, tw, Math.max(0, i0 - 1), to, 1);
          parts[k][0] += outer;
          parts[k][1] += ribbonD(pts, w, tw, Math.max(0, i0 - 1), to, 0.34);
          shadow += outer;
          i0 = i;
        }
      }
      ["back", "front"].forEach(k => { braid[k][ev][0].setAttribute("d", parts[k][0]); braid[k][ev][1].setAttribute("d", parts[k][1]); });
    });
    braid.shadow.setAttribute("d", shadow);
    braid.shadow.setAttribute("transform", `translate(${(1.5 * z).toFixed(1)},${(4 * z).toFixed(1)})`);
  }

  /* ---------- 5. 매 프레임: 원래 선의 상태를 따라감 ---------- */
  function tick() {
    synced.forEach(({ path, mp }) => {
      const off = path.style.strokeDashoffset;
      if (mp._off !== off) { mp._off = off; mp.style.strokeDashoffset = off === "" ? "0" : off; }
    });
    if (braid) drawBraid();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  void reduce;
})();
