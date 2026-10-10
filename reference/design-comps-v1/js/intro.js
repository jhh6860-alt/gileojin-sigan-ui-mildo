/* ==========================================================================
   화면 1 · Intro
   --------------------------------------------------------------------------
   지금 단계는 '정지된 한 장면'의 디자인입니다.
   다음 단계(홈 인터랙션)에서 커서 방향과 스크롤 진행을 연결할 때,
   여기의 layStrip() 함수를 그대로 다시 사용해 띠를 실시간으로 늘립니다.
   ========================================================================== */
(function () {
  const { svg, html, toMin, symbol, walker, pointAt, offsetNormal, readableAngle } = DT;
  const D = SITE_DATA;

  /* 장면별 상호작용 유형 목록 (상호작용만, 개인 경험 제외) */
  function typesOf(sceneId) {
    return D.interactions.filter(i => i.scene === sceneId && i.kind === "interaction" && i.type).map(i => i);
  }
  const sceneOf = id => D.scenes.find(s => s.id === id);

  /* 경로를 따라 종이 띠와 사진을 놓습니다.
     items: [{photo, want}]  want = 띠 시작점으로부터 원하는 거리(px) */
  function layStrip(root, d, items, o) {
    const guide = svg("path", { d, class: "guide" }, root);
    const L = guide.getTotalLength();
    const step = o.photoW + o.gap;
    let prevEnd = -Infinity;
    const placed = items.map(it => {
      const start = Math.max(it.want, prevEnd + o.gap);
      prevEnd = start + o.photoW;
      return { ...it, start, center: start + o.photoW / 2, end: prevEnd };
    });
    const stripEnd = (placed.length ? placed[placed.length - 1].end : o.lead) + o.stripTail;

    const gStrip = svg("g", { class: "strip" }, o.layer || root);

    /* 시각을 알 수 없는 출발 구간: 가는 점선 */
    if (o.lead > 0) {
      svg("path", { d, class: "strip-lead", "stroke-dasharray": `0 0 ${o.lead} ${L * 2}` }, gStrip);
      svg("path", { d, class: "strip-lead-dots", "stroke-dasharray": dashUpTo(o.lead, L) }, gStrip);
    }
    const len = stripEnd - o.lead;
    const da = `0 ${o.lead} ${len} ${L * 2}`;
    if (o.style === "line") {
      /* B안: 띠 대신 가는 길 선 */
      svg("path", { d, class: "route-line", "stroke-dasharray": da }, gStrip);
    } else {
      svg("path", { d, class: "strip-shadow", "stroke-width": o.width, "stroke-dasharray": da, transform: "translate(5,6)" }, gStrip);
      svg("path", { d, class: "strip-edge", "stroke-width": o.width + 2, "stroke-dasharray": da }, gStrip);
      svg("path", { d, class: "strip-paper", "stroke-width": o.width, "stroke-dasharray": da }, gStrip);
    }

    /* 사진 */
    const gPhotos = svg("g", { class: "strip-photos" }, o.layer || root);
    placed.forEach(p => {
      const pt = pointAt(guide, p.center);
      const g = svg("g", { class: "strip-photo", transform: `translate(${pt.x},${pt.y}) rotate(${pt.angle})` }, gPhotos);
      if (o.style === "line") svg("rect", { x: -o.photoW / 2 - 4, y: -o.photoH / 2 - 4, width: o.photoW + 8, height: o.photoH + 8, class: "photo-mat" }, g);
      svg("image", { href: p.photo.file, x: -o.photoW / 2, y: -o.photoH / 2, width: o.photoW, height: o.photoH,
        preserveAspectRatio: "xMidYMid slice" }, g);
      const t = svg("title", null, g); t.textContent = p.photo.alt;
    });
    return { guide, L, placed, stripEnd };
  }

  function dashUpTo(len, L) {
    const a = [];
    for (let acc = 0; acc < len; acc += 10) a.push(2, 8);
    a.push(0, L * 2);
    return a.join(" ");
  }

  /* 장면 묶음마다 캡션(시각·장소)과 상호작용 기호 */
  function sceneMarks(root, res, o) {
    const seen = new Set();
    res.placed.forEach(p => {
      if (seen.has(p.photo.scene)) return;
      seen.add(p.photo.scene);
      const sc = sceneOf(p.photo.scene);
      const pt = pointAt(res.guide, p.start + 2);
      const side = o.labelSide(pt);
      const lp = offsetNormal(pt, side * (o.width / 2 + 15));
      const ang = readableAngle(pt.angle);
      const norm = ((pt.angle % 360) + 360) % 360;
      const flip = norm > 90 && norm < 270;
      const g = svg("g", { class: "scene-mark", transform: `translate(${lp.x},${lp.y}) rotate(${ang})` }, root);
      const label = (p.photo.time || "") + "  " + sc.place + (sc.segment === "after" ? " · 도착 후" : "");
      const tx = svg("text", { class: "mark-text", x: 0, y: 0, "dominant-baseline": "middle", "text-anchor": flip ? "end" : "start" }, g);
      tx.textContent = label.trim();
      /* 반대편에 기호 */
      const sp = offsetNormal(pt, -side * (o.width / 2 + 13));
      const gs = svg("g", { class: "mark-syms", transform: `translate(${sp.x},${sp.y}) rotate(${ang})` }, root);
      typesOf(sc.id).forEach((it, i) => symbol(it.type, (flip ? -1 : 1) * i * 14, 0, 5, gs, { filled: it.status === "확정" }));
    });
  }

  /* 세 실루엣: 띠 끝에서 조금 앞, 나란히 걷기 */
  function walkers(root, res, ahead, scale) {
    scale = scale || 2;
    const g = svg("g", { class: "walkers" }, root);
    const lead = res.stripEnd + ahead;
    [[-1.15, 14, -0.8], [0, 0, 0.7], [1.15, 8, -0.3]].forEach(([off, lag, phase]) => {
      const q = pointAt(res.guide, lead - lag * scale);
      const p = offsetNormal(q, off * 15 * scale);
      walker(g, p.x, p.y, q.angle, phase, scale);
    });
    return pointAt(res.guide, lead);
  }

  /* 커서 위치 표시 (다음 단계에서 실제 커서와 연결) */
  function cursorMark(root, from, to, label) {
    const g = svg("g", { class: "cursor-mark" }, root);
    const mx = (from.x + to.x) / 2 + (to.y - from.y) * 0.25;
    const my = (from.y + to.y) / 2 - (to.x - from.x) * 0.25;
    svg("path", { d: `M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}`, class: "cursor-line" }, g);
    svg("circle", { cx: to.x, cy: to.y, r: 11, class: "cursor-ring" }, g);
    svg("line", { x1: to.x - 18, y1: to.y, x2: to.x - 13, y2: to.y, class: "cursor-tick" }, g);
    svg("line", { x1: to.x + 13, y1: to.y, x2: to.x + 18, y2: to.y, class: "cursor-tick" }, g);
    svg("line", { x1: to.x, y1: to.y - 18, x2: to.x, y2: to.y - 13, class: "cursor-tick" }, g);
    svg("line", { x1: to.x, y1: to.y + 13, x2: to.x, y2: to.y + 18, class: "cursor-tick" }, g);
    const t = svg("text", { x: to.x + 24, y: to.y + 4, class: "mark-text" }, g);
    t.textContent = label;
  }

  function textAt(root, p, str, cls, rotate) {
    const t = svg("text", { x: 0, y: 0, class: cls || "mark-text", transform: `translate(${p.x},${p.y}) rotate(${rotate ? readableAngle(p.angle) : 0})`,
      "text-anchor": "middle", "dominant-baseline": "middle" }, root);
    t.textContent = str;
    return t;
  }

  /* ------------------------------------------------------------------------
     A안 · 여백의 산책 — 걷는 도중의 가까운 장면
     ------------------------------------------------------------------------ */
  function renderA(stage) {
    const sec = html("section", "intro intro-a", null, stage);
    sec.setAttribute("aria-label", "인트로");
    const field = html("div", "intro-field", null, sec);
    const root = svg("svg", { viewBox: "0 0 1440 900", class: "intro-svg", role: "img",
      "aria-label": "세 명의 실루엣이 걸어온 길을 따라 제주 사진이 놓인 종이 띠" }, field);

    const until = "13:49";
    const photos = D.photos.filter(p => p.event === "A" && toMin(p.time) <= toMin(until));
    const d = "M -150 700 C 80 770, 280 620, 470 660 S 760 800, 900 700 S 1060 500, 960 420 S 780 360, 840 280 S 1050 170, 1180 230 S 1330 330, 1460 300";
    const o = { width: 118, photoW: 100, photoH: 75, gap: 16, lead: 250, stripTail: 26,
      labelSide: () => 1 };
    /* 1분 = 몇 px 인지: 경로 길이에서 출발 구간과 끝 여유를 뺀 만큼을 13:16~13:49(33분)에 배분 */
    const tmp = svg("path", { d, class: "guide" }, root);
    const ppm = (tmp.getTotalLength() - o.lead - 330) / (toMin(until) - toMin("13:16"));
    tmp.remove();
    const items = photos.map(p => ({ photo: p, want: o.lead + (toMin(p.time) - toMin("13:16")) * ppm }));
    const res = layStrip(root, d, items, o);
    sceneMarks(root, res, o);

    /* 26분 동안 사진이 없는 구간 표시 */
    const sea = res.placed.filter(p => p.photo.scene === "A-2").pop();
    const sun = res.placed.find(p => p.photo.scene === "A-3");
    if (sea && sun) {
      const mid = pointAt(res.guide, (sea.end + sun.start) / 2);
      textAt(root, mid, `${toMin(sun.photo.time) - toMin("13:23")}분 · 다음 사진까지`, "gap-text", true);
    }
    textAt(root, offsetNormal(pointAt(res.guide, 150), -84), "출발 · 시각 미확인", "mark-text mark-mute", false);

    const head = walkers(root, res, 78, 2.1);
    cursorMark(root, head, { x: 1320, y: 120 }, "커서 방향");

    /* 글 */
    const copy = html("div", "intro-copy", null, sec);
    html("p", "eyebrow", "7월 2일, 제주 · 두 번의 걷기", copy);
    const h = html("h1", "intro-title", null, copy);
    ["길어진", "시간의", "밀도"].forEach(w => html("span", null, w, h));
    html("p", "intro-sub", "제주 여행 속 두 번의 걷기에서 나타난 발견, 상호작용과 감정의 변화", copy);

    const clock = html("div", "intro-clock", null, sec);
    html("span", "clock-label", "마지막 기록", clock);
    html("span", "clock-time", until, clock);
    html("span", "clock-place", "사건 A · 선글라스 매장", clock);

    const hint = html("div", "intro-hint", null, sec);
    hint.innerHTML = '<span><b>커서</b> 걷는 방향</span><span><b>스크롤</b> 걸음과 시간</span>';

    legend(sec);
  }

  /* ------------------------------------------------------------------------
     B안 · 밀도의 지형 — 두 걷기 전체가 한눈에 보이는 지형
     ------------------------------------------------------------------------ */
  function renderB(stage) {
    const sec = html("section", "intro intro-b", null, stage);
    sec.setAttribute("aria-label", "인트로");
    const field = html("div", "intro-field", null, sec);
    const root = svg("svg", { viewBox: "0 0 1440 900", class: "intro-svg", role: "img",
      "aria-label": "사건 A와 사건 B의 길 전체와 그 위에 놓인 사진" }, field);

    const defs = svg("defs", null, root);
    const blur = svg("filter", { id: "fieldBlur", x: "-30%", y: "-30%", width: "160%", height: "160%" }, defs);
    svg("feGaussianBlur", { stdDeviation: 60 }, blur);
    const goo = svg("filter", { id: "goo" }, defs);
    svg("feGaussianBlur", { in: "SourceGraphic", stdDeviation: 14, result: "b" }, goo);
    svg("feColorMatrix", { in: "b", mode: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" }, goo);

    /* 시간대 영역: 낮(사건 A) / 저녁(사건 B) */
    const fields = svg("g", { class: "fields", filter: "url(#fieldBlur)" }, root);
    svg("ellipse", { cx: 690, cy: 330, rx: 640, ry: 270, class: "field-day" }, fields);
    svg("ellipse", { cx: 700, cy: 740, rx: 560, ry: 130, class: "field-dusk" }, fields);

    const blobs = svg("g", { class: "blobs", filter: "url(#goo)" }, root);
    const layer = svg("g", null, root);

    const o = { width: 0, photoW: 64, photoH: 48, gap: 8, stripTail: 22, layer, style: "line" };
    const dA = "M 120 780 C 80 600, 130 400, 260 280 S 560 110, 770 120 S 1130 170, 1250 300 S 1340 540, 1240 620";
    const dB = "M 1180 690 C 1080 750, 900 760, 780 735 S 560 680, 460 710 S 300 770, 190 740";

    /* 1분 = 26px. 사건 A(13:16~14:10)와 사건 B(20분)를 같은 비율로 그립니다 */
    const tmp = svg("path", { d: dA, class: "guide" }, root);
    const leadA = 150;
    const ppm = Math.min(26, (tmp.getTotalLength() - leadA - 250) / (toMin("14:10") - toMin("13:16")));
    tmp.remove();

    const itemsA = D.photos.filter(p => p.event === "A").map(p => ({ photo: p, want: leadA + (toMin(p.time) - toMin("13:16")) * ppm }));
    const resA = layStrip(root, dA, itemsA, { ...o, lead: leadA, labelSide: () => 1 });

    const walk = D.photos.filter(p => p.event === "B" && p.order).sort((a, b) => a.order - b.order);
    const rest = D.photos.filter(p => p.event === "B" && !p.order);
    const itemsB = walk.map((p, i) => ({ photo: p, want: ((i + 0.5) * 20 / walk.length) * ppm - o.photoW / 2 }))
      .concat(rest.map(p => ({ photo: p, want: 20 * ppm })));
    const resB = layStrip(root, dB, itemsB, { ...o, lead: 0, labelSide: () => 1 });

    /* 흰 유기적 형태: 사진 묶음 아래에서 서로 이어짐 */
    [resA, resB].forEach(res => res.placed.forEach(p => {
      const pt = pointAt(res.guide, p.center);
      svg("circle", { cx: pt.x, cy: pt.y, r: 42 }, blobs);
    }));

    leaderLabels(root, resA, p => -sideAway(p));
    leaderLabels(root, resB, p => -sideAway(p));

    textAt(root, offsetNormal(pointAt(resA.guide, 80), -22), "출발 · 시각 미확인", "mark-text mark-mute", true);
    tag(root, { x: 150, y: 806 }, "사건 A · 낮", 0, 0);
    tag(root, { x: 1204, y: 676 }, "사건 B · 저녁", 0, 0);

    /* 사건 B 길 위 '계획 도착(8분)' 지점 */
    const p8 = pointAt(resB.guide, 8 * ppm);
    const n8 = offsetNormal(p8, -sideUp(p8) * 46);
    svg("line", { x1: p8.x, y1: p8.y, x2: n8.x, y2: n8.y, class: "plan-tick" }, root);
    const t8 = svg("text", { x: n8.x, y: n8.y + 16, class: "mark-text", "text-anchor": "middle" }, root);
    t8.textContent = "8분 · 계획했던 도착";

    const head = walkers(root, resB, 70, 1.9);
    cursorMark(root, head, { x: 330, y: 660 }, "커서 방향");

    /* 글 */
    const copy = html("div", "intro-copy", null, sec);
    html("p", "eyebrow", "The Density of Lengthened Time", copy);
    const h = html("h1", "intro-title", null, copy);
    h.innerHTML = "길어진 시간의 <b>밀도</b>";
    html("p", "intro-sub", "제주 여행 속 두 번의 걷기에서 나타난 발견, 상호작용과 감정의 변화", copy);
    const facts = html("dl", "intro-facts", null, copy);
    [["사건 A", "13:16–14:10 기록 · 출발 시각 미확인"], ["사건 B", "19:00–19:20 · 계획 8분"]].forEach(([k, v]) => {
      const row = html("div", null, null, facts); html("dt", null, k, row); html("dd", null, v, row);
    });
    const hint = html("div", "intro-hint", null, sec);
    hint.innerHTML = '<span><b>커서</b> 걷는 방향</span><span><b>스크롤</b> 걸음과 시간</span>';
    legend(sec);

    function sideUp(pt) {
      return offsetNormal(pt, 10).y < offsetNormal(pt, -10).y ? 1 : -1;
    }
    function sideAway(pt) {
      /* 화면 중앙(제목)에서 먼 쪽으로 캡션을 놓습니다 */
      const a = offsetNormal(pt, 10), b = offsetNormal(pt, -10);
      const da = Math.hypot(a.x - 720, a.y - 430), db = Math.hypot(b.x - 720, b.y - 430);
      return da > db ? 1 : -1;
    }
  }

  /* B안: 장면 묶음에서 뻗는 지시선 라벨. 제목 영역(AVOID)과 겹치면 아래로 내립니다 */
  const AVOID = { x1: 380, y1: 320, x2: 1070, y2: 560 };
  function leaderLabels(root, res, sideFn) {
    const seen = new Set();
    res.placed.forEach(p => {
      if (seen.has(p.photo.scene)) return;
      seen.add(p.photo.scene);
      const group = res.placed.filter(q => q.photo.scene === p.photo.scene);
      const mid = pointAt(res.guide, (group[0].start + group[group.length - 1].end) / 2);
      const sc = sceneOf(p.photo.scene);
      const types = typesOf(sc.id);

      const g = svg("g", { class: "leader-label" }, root);
      const t = svg("text", { x: 0, y: 0, class: "mark-text strong" }, g);
      t.textContent = (p.photo.time ? p.photo.time + "  " : "") + sc.place + (sc.segment === "after" ? " · 도착 후" : "");
      const w = Math.max(t.getComputedTextLength(), types.length * 14 + 90);

      const side = sideFn(mid);
      let s1 = offsetNormal(mid, side * 52), s2 = offsetNormal(mid, side * 92);
      let anchor = s2.x >= mid.x ? "start" : "end";
      const box = (x, y, an) => {
        const left = an === "start" ? x : an === "end" ? x - w : x - w / 2;
        return { x1: left, x2: left + w, y1: y - 14, y2: y + 24 };
      };
      const hit = (r) => !(r.x2 < AVOID.x1 || r.x1 > AVOID.x2 || r.y2 < AVOID.y1 || r.y1 > AVOID.y2);
      let tx = s2.x + (anchor === "start" ? 6 : -6), ty = s2.y + (s2.y > mid.y + 20 ? 14 : -6);
      if (hit(box(tx, ty, anchor))) {
        /* 겹치면: 사진 묶음 바로 아래로 */
        s1 = { x: mid.x, y: mid.y + 44 }; s2 = { x: mid.x, y: mid.y + 120 };
        anchor = "middle"; tx = s2.x; ty = s2.y + 14;
      }
      const r = box(tx, ty, anchor);
      if (r.x1 < 16) tx += 16 - r.x1;
      if (r.x2 > 1424) tx -= r.x2 - 1424;

      svg("line", { x1: s1.x, y1: s1.y, x2: s2.x, y2: s2.y, class: "leader" }, root);
      svg("circle", { cx: s1.x, cy: s1.y, r: 2.4, class: "leader-dot" }, root);
      g.setAttribute("transform", `translate(${tx},${ty})`);
      t.setAttribute("text-anchor", anchor);
      const dir = anchor === "end" ? -1 : 1;
      const x0 = anchor === "middle" ? -((types.length - 1) * 14) / 2 : dir * 6;
      types.forEach((it, i) => symbol(it.type, x0 + dir * i * 14, 14, 5, g, { filled: it.status === "확정" }));
      if (!p.photo.time && sc.timeBasis) {
        const tb = svg("text", { x: anchor === "middle" ? 0 : dir * (types.length * 14 + 10), y: anchor === "middle" ? 34 : 18,
          "text-anchor": anchor, class: "mark-text mark-mute" }, g);
        tb.textContent = "순서 기준 배치";
      }
      root.appendChild(g);
    });
  }

  function tag(root, p, str, dx, dy) {
    const t = svg("text", { x: p.x + dx, y: p.y + dy, class: "seg-tag" }, root);
    t.textContent = str;
  }

  /* 기호 범례: 상태(미검토/확정)를 함께 알립니다 */
  function legend(sec) {
    const lg = html("div", "intro-legend", null, sec);
    Object.entries(D.interactionTypes).forEach(([k, v]) => {
      const s = html("span", null, null, lg);
      s.appendChild(DT.symbolInline(k, false));
      html("span", null, v.label, s);
    });
    html("span", "legend-note", "외곽선 = 포스터 기록 · 검토 전", lg);
  }

  window.renderIntro = function (stage, variant) {
    (variant === "b" ? renderB : renderA)(stage);
  };
})();
