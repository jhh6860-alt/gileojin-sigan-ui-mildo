/* ==========================================================================
   Citrus Graphic Edition v2 — 그래픽 레이어 (citrus2*.html 에서만 실행)
   --------------------------------------------------------------------------
   · 배경: 흐릿한 오렌지 블롭과 평면 잎 (아주 옅게)
   · 껍질 선(peel path): 기존 페이지가 그린 경로선을 따라 덧그립니다.
     - 한 선은 한 가지 색만 씁니다 (가운데 다른 색 띠 없음 → 캔디 래퍼처럼 보이지 않게)
     - 폭이 일정한 간격으로 잘록해지지 않고, 천천히 넓어졌다 좁아지는 유기적인 폭
     - 가장자리는 아주 미세하게 고르지 않고, 양 끝은 껍질처럼 가늘어짐
   · 홈: A·B 두 껍질 선이 서로 감기며 지나갑니다. 교차하는 곳에서는 위로 지나가는 선 둘레에
     바탕색 틈을 남겨 '섞임'이 아니라 '위·아래로 엇갈려 지나감'으로 읽히게 합니다.
   · 개요·비교: 꼬이지 않는 정돈된 껍질 선 (읽기 쉬운 흐름)
   · 버튼을 누르면 누른 자리 주변으로 과즙 방울이 살짝 튑니다.
   · 그리기 진행·강조·되돌아가기는 원래 코드가 맡고, 이 파일은 그 상태를 따라 그리기만 합니다.
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

  /* ---------- 2. 껍질 선의 모양 ----------
     u: 선을 따라간 거리(폭 기준으로 정규화한 값)에 대한 부드러운 흔들림 — 매번 같은 모양 */
  const organic = u => 0.5 * Math.sin(u * 0.55 + 1.3) + 0.3 * Math.sin(u * 1.27 + 0.4) + 0.2 * Math.sin(u * 2.9 + 2.1);
  const fray = (u, k) => 0.035 * Math.sin(u * 7.3 + k) + 0.02 * Math.sin(u * 13.1 + k * 2);   // 아주 미세한 가장자리
  function withLength(pts) {
    let s = 0;
    pts.forEach((p, i) => { if (i) s += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y); p.s = s; });
    return pts;
  }
  /* pts 중 from~to 구간을 껍질 모양 폴리곤으로. w: 기준 폭, total: 전체 길이(끝 가늘어짐용), scale: 덧씌울 폭 비율 */
  function peelD(pts, w, from, to, total, extra) {
    const left = [], right = [];
    const taper = w * 1.6;
    for (let i = from; i <= to; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const u = p.s / w;
      const ends = Math.min(1, p.s / taper, (total - p.s) / taper);                    // 양 끝은 가늘게
      const base = (w / 2) * (0.8 + 0.2 * organic(u)) * (0.35 + 0.65 * Math.sqrt(Math.max(0, ends)));
      const hl = base * (1 + fray(u, 0.7)) + extra, hr = base * (1 + fray(u, 2.9)) + extra;
      left.push([p.x - ty * hl, p.y + tx * hl]);
      right.push([p.x + ty * hr, p.y - tx * hr]);
    }
    if (left.length < 2) return "";
    return "M" + left.concat(right.reverse()).map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join("L") + "Z";
  }

  /* ---------- 3. 개요·비교: 꼬이지 않는 정돈된 껍질 선 ---------- */
  const synced = [];
  let maskId = 0;
  function peelize(path, w) {
    const svg = path.ownerSVGElement;
    if (!svg || path.dataset.citrus) return;
    path.dataset.citrus = "1";
    let len = 0;
    try { len = path.getTotalLength(); } catch (e) { return; }
    if (!len) return;
    const n = Math.max(12, Math.min(600, Math.round(len / Math.max(1, w * 0.3))));
    const pts = [];
    for (let i = 0; i <= n; i++) { const q = path.getPointAtLength(len * i / n); pts.push({ x: q.x, y: q.y }); }
    withLength(pts);
    const total = pts[pts.length - 1].s;
    const g = el("g", { class: "citrus-ribbon", "aria-hidden": "true" });
    el("path", { class: "peel-" + evOf(path), d: peelD(pts, w, 0, pts.length - 1, total, 0) }, g);
    path.parentNode.insertBefore(g, path);
    path.classList.add("citrus-seam");
    if (path.getAttribute("pathLength") === "1") {
      const defs = svg.querySelector("defs") || el("defs", null, svg);
      const id = "citrus2-m" + (++maskId);
      const mask = el("mask", { id, maskUnits: "userSpaceOnUse", x: -1e4, y: -1e4, width: 2e4, height: 2e4 }, defs);
      const mp = el("path", { d: path.getAttribute("d"), fill: "none", stroke: "#fff", "stroke-width": w * 1.8, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1 }, mask);
      mp.style.strokeDasharray = "1";
      g.setAttribute("mask", `url(#${id})`);
      synced.push({ path, mp });
    }
  }
  document.querySelectorAll(".ov-stage .ov-path").forEach(p => peelize(p, p.ownerSVGElement.viewBox.baseVal.width * 0.016));
  document.querySelectorAll(".cp-graphic svg .cp-line, .cp-rows svg .cp-line").forEach(p => peelize(p, Math.max(3, p.ownerSVGElement.viewBox.baseVal.width * 0.019)));

  /* ---------- 4. 홈: A·B 껍질 선이 서로 감기며 지나감 (색은 섞이지 않음) ---------- */
  const laneA = document.querySelector(".hv-lane-a"), laneB = document.querySelector(".hv-lane-b");
  let braid = null, lastD = "";
  if (laneA && laneB) {
    const g = el("g", { class: "citrus-braid", "aria-hidden": "true" });
    laneA.parentNode.insertBefore(g, laneA);
    braid = {
      shadow: el("path", { class: "peel-shadow" }, g),
      backA: el("path", { class: "peel-a" }, g),
      backB: el("path", { class: "peel-b" }, g),
      gap: el("path", { class: "peel-gap" }, g),          // 위로 지나가는 선 둘레의 바탕색 틈
      frontA: el("path", { class: "peel-a" }, g),
      frontB: el("path", { class: "peel-b" }, g)
    };
  }
  const parsePts = d => d.slice(1).split("L").map(t => { const [x, y] = t.split(","); return { x: +x, y: +y }; });
  function drawBraid() {
    const da = laneA.getAttribute("d") || "", db = laneB.getAttribute("d") || "";
    const key = da + "|" + db;
    if (key === lastD) return;
    lastD = key;
    const set = (k, d) => braid[k].setAttribute("d", d);
    if (da.length < 4 || db.length < 4) { ["shadow", "backA", "backB", "gap", "frontA", "frontB"].forEach(k => set(k, "")); return; }
    const A = parsePts(da), B = parsePts(db), n = Math.min(A.length, B.length);
    if (n < 2) return;
    const z = Math.max(0.2, parseFloat(laneA.getAttribute("stroke-width") || "2.2") / 2.2);
    const C = [];
    for (let i = 0; i < n; i++) C.push({ x: (A[i].x + B[i].x) / 2, y: (A[i].y + B[i].y) / 2, gx: (A[i].x - B[i].x) / 2, gy: (A[i].y - B[i].y) / 2 });
    withLength(C);
    const lam = 230 * z;                                      // 한 번 감기는 길이
    const ramp = s => Math.min(1, s / (60 * z));
    const pa = [], pb = [];
    C.forEach(c => {
      const ph = 2 * Math.PI * c.s / lam, k = Math.cos(ph) * (0.25 + 0.75 * ramp(c.s)), sn = Math.sin(ph);
      pa.push({ x: c.x + c.gx * k, y: c.y + c.gy * k, front: sn >= 0, cross: Math.abs(Math.cos(ph)) < 0.6 });
      pb.push({ x: c.x - c.gx * k, y: c.y - c.gy * k, front: sn < 0, cross: Math.abs(Math.cos(ph)) < 0.6 });
    });
    withLength(pa); withLength(pb);
    const w = 13 * z, gapW = 2.4 * z;                       // 껍질 폭, 교차 지점의 바탕색 틈
    const out = { backA: "", backB: "", frontA: "", frontB: "", gap: "" };
    [["A", pa], ["B", pb]].forEach(([ev, pts]) => {
      const total = pts[pts.length - 1].s;
      /* 앞/뒤 구간 나누기 (구간 경계는 두 선이 가장 멀리 떨어진 곳이라 이음매가 겹치지 않음) */
      let i0 = 0;
      for (let i = 1; i <= pts.length; i++) {
        if (i === pts.length || pts[i].front !== pts[i0].front) {
          const to = Math.min(pts.length - 1, i), from = Math.max(0, i0 - 1);
          out[(pts[i0].front ? "front" : "back") + ev] += peelD(pts, w, from, to, total, 0);
          i0 = i;
        }
      }
      /* 위로 지나가는 구간 중 교차 지점 부근에만 바탕색 틈 */
      let j0 = -1;
      for (let i = 0; i <= pts.length; i++) {
        const on = i < pts.length && pts[i].front && pts[i].cross;
        if (on && j0 < 0) j0 = i;
        if (!on && j0 >= 0) { out.gap += peelD(pts, w, j0, i - 1, total, gapW); j0 = -1; }
      }
    });
    ["backA", "backB", "gap", "frontA", "frontB"].forEach(k => set(k, out[k]));
    set("shadow", out.backA + out.backB + out.frontA + out.frontB);
    braid.shadow.setAttribute("transform", `translate(${(1.5 * z).toFixed(1)},${(4 * z).toFixed(1)})`);
  }

  /* ---------- 5. 버튼 클릭: 주변으로 과즙 방울이 살짝 튐 ---------- */
  function splash(x, y) {
    if (reduce || !document.body.animate) return;
    const box = document.createElement("div");
    box.className = "juice";
    box.style.transform = `translate(${x}px, ${y}px)`;
    const glow = document.createElement("b");
    box.appendChild(glow);
    glow.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1)", offset: .3 }, { opacity: 0, transform: "scale(1.5)" }],
      { duration: 620, easing: "ease-out", fill: "forwards" });
    const count = 7;
    for (let k = 0; k < count; k++) {
      const d = document.createElement("i");
      const size = 4 + Math.random() * 5;
      const ang = (k / count) * Math.PI * 2 + Math.random() * 0.7;
      const dist = 16 + Math.random() * 20;
      d.style.width = d.style.height = size + "px";
      d.style.marginLeft = d.style.marginTop = -size / 2 + "px";
      box.appendChild(d);
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
      d.animate([
        { transform: "translate(0,0) scale(.6)", opacity: .95 },
        { transform: `translate(${dx * .75}px, ${dy * .75}px) scale(1)`, opacity: .85, offset: .55 },
        { transform: `translate(${dx}px, ${dy + 6}px) scale(.5)`, opacity: 0 }          // 살짝 아래로 떨어지며 사라짐
      ], { duration: 620 + Math.random() * 180, easing: "ease-out", fill: "forwards" });
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 950);
  }
  document.addEventListener("click", e => {
    const t = e.target.closest("a, button, [role='button']");
    if (!t) return;
    const r = t.getBoundingClientRect();
    /* 키보드로 누른 경우(좌표 0)에는 버튼 가운데에서 */
    const x = e.clientX || r.left + r.width / 2, y = e.clientY || r.top + r.height / 2;
    splash(x, y);
    /* 다른 페이지로 넘어가는 링크는 효과가 보이도록 아주 잠깐 뒤에 이동 (홈 버튼처럼 자체 전환이 있는 경우는 제외) */
    if (reduce || e.defaultPrevented || t.tagName !== "A") return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || t.target === "_blank") return;
    const href = t.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    e.preventDefault();
    setTimeout(() => { location.href = href; }, 300);
  });

  /* ---------- 6. 매 프레임: 원래 선의 상태를 따라감 ---------- */
  function tick() {
    synced.forEach(({ path, mp }) => {
      const off = path.style.strokeDashoffset;
      if (mp._off !== off) { mp._off = off; mp.style.strokeDashoffset = off === "" ? "0" : off; }
    });
    if (braid) drawBraid();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
