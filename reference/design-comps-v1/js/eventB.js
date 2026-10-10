/* ==========================================================================
   화면 2 · 사건 B 데이터 탐색 (디자인 시안)
   --------------------------------------------------------------------------
   모든 수치와 위치는 data.js 에서 계산합니다.
   확정되지 않은 값(감정 강도, 상호작용 확정 여부 등)은 빈 슬롯으로 그립니다.
   ========================================================================== */
(function () {
  const { svg, html, toMin, symbol, emoColor } = DT;
  const D = SITE_DATA;
  const EV = D.events.B;
  const T0 = toMin(EV.start), T1 = toMin(EV.end);
  const TOTAL = T1 - T0;                 // 20분
  const PLAN = EV.plannedMinutes;        // 8분
  const scenes = D.scenes.filter(s => s.event === "B");
  const inter = D.interactions.filter(i => i.scene.startsWith("B-"));
  const scene = id => scenes.find(s => s.id === id);
  const fmt = m => { const t = T0 + m; return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };

  /* 상태 요약: 데이터에서 직접 셉니다 */
  function status() {
    const own = inter.filter(i => i.kind === "interaction");
    return {
      recorded: own.filter(i => i.type).length,
      confirmed: own.filter(i => i.status === "확정").length,
      pending: own.filter(i => scene(i.scene).segment === "pending").length,
      after: own.filter(i => scene(i.scene).segment === "after").length,
      personal: inter.filter(i => i.kind === "personal").length,
      scored: scenes.filter(s => s.emotion.score != null).length
    };
  }

  /* 장면의 시간 위치(분). 범위만 있는 장면은 범위의 가운데 */
  function sceneMin(s) {
    if (s.timeRange) return (toMin(s.timeRange[0]) + toMin(s.timeRange[1])) / 2 - T0;
    if (s.segment === "after") return null;
    return toMin(s.time) - T0;
  }

  function header(sec, variant) {
    const head = html("header", "evb-head", null, sec);
    const titles = html("div", "evb-titles", null, head);
    html("p", "eyebrow", variant === "b" ? "Event B — 과정 몰입형" : "사건 B · 과정 몰입형 · 계획된 걷기", titles);
    const h = html("h2", "evb-title", null, titles);
    h.innerHTML = "8분이면 닿을 길을<br>20분 동안 걸었다";
    html("p", "evb-lede", "식당까지 가는 길. 돌담길을 구경하고, 사진을 찍고, 이야기를 나누는 사이 이동 시간이 과정이 되었다.", titles);
    const nums = html("div", "evb-nums", null, head);
    [[PLAN, "분", "계획", "출발 + 8분 = 19:08 (계산값)"], [TOTAL, "분", "실제", `${EV.start}–${EV.end} · 출발은 19:00경`]].forEach(([n, u, k, note], i) => {
      const f = html("div", "num" + (i ? " num-real" : ""), null, nums);
      html("span", "num-k", k, f);
      const v = html("span", "num-v", null, f); v.innerHTML = `${n}<small>${u}</small>`;
      html("span", "num-note", note, f);
    });
    const plus = html("div", "num num-plus", null, nums);
    html("span", "num-k", "늘어난 시간", plus);
    const v = html("span", "num-v", null, plus); v.innerHTML = `+${TOTAL - PLAN}<small>분</small>`;
  }

  function statusBar(sec) {
    const s = status();
    const bar = html("footer", "evb-status", null, sec);
    const items = [
      ["상호작용 기록", `${s.recorded}건`, `확정 ${s.confirmed}건 · 나머지는 포스터 기록으로 검토 전`],
      ["경험의 밀도", "측정 예정", "확정된 상호작용 ÷ 걷기 20분 × 10"],
      ["감정 강도", s.scored ? `${s.scored}개 장면` : "미입력", "회고 평가(−2 ~ +2)를 입력하면 곡선이 그려집니다"],
      ["구간 확인 필요", `${s.pending}건`, "도착 순간의 발화 · 집계 보류"],
      ["개인 경험", `${s.personal}건`, "음악·노을 감상 · 상호작용 집계 제외"]
    ];
    items.forEach(([k, v, n]) => {
      const it = html("div", "st", null, bar);
      html("span", "st-k", k, it); html("span", "st-v", v, it); html("span", "st-n", n, it);
    });
  }

  /* 사진 열: 마우스를 올리거나 키보드로 선택하면 넓어집니다 (A안) */
  function photoRow(sec) {
    const wrap = html("div", "photo-row-wrap", null, sec);
    html("p", "row-label", "기록된 장면 · 사진에 마우스를 올려 보세요", wrap);
    const row = html("div", "photo-row", null, wrap);
    const photos = D.photos.filter(p => p.event === "B").sort((a, b) => (a.order || 99) - (b.order || 99));
    photos.forEach((p, i) => {
      const sc = scene(p.scene);
      const it = html("figure", "ph" + (i === 0 ? " is-open" : ""), null, row);
      it.tabIndex = 0;
      const img = html("img", null, null, it); img.src = p.file; img.alt = p.alt; img.loading = "lazy";
      const cap = html("figcaption", null, null, it);
      html("span", "ph-time", p.order ? `순서 ${p.order} / 6 · 19:00–19:20 사이` : `${p.time} · 도착 후`, cap);
      html("span", "ph-place", sc.place, cap);
      const syms = html("span", "ph-syms", null, cap);
      inter.filter(x => x.scene === sc.id && x.kind === "interaction" && x.type).forEach(x => {
        const s = html("span", null, null, syms);
        s.appendChild(DT.symbolInline(x.type, x.status === "확정"));
        html("span", null, x.text, s);
      });
      if (sc.emotion.kind) {
        const e = html("span", "ph-emo", null, cap);
        const dot = html("i", null, null, e); dot.style.background = emoColor(sc.emotion.kind);
        html("span", null, `${D.emotions[sc.emotion.kind].label} · 강도 미입력`, e);
      }
    });
    row.addEventListener("focusin", e => { row.querySelectorAll(".ph").forEach(x => x.classList.toggle("is-open", x === e.target.closest(".ph"))); });
  }

  /* ------------------------------------------------------------------------
     A안 · 여백 중심의 편집형 레인 차트
     ------------------------------------------------------------------------ */
  function renderA(stage) {
    const sec = html("section", "evb evb-a", null, stage);
    header(sec, "a");
    const box = html("div", "evb-chart", null, sec);
    const W = 1200, H = 540;
    const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "evb-svg", role: "img",
      "aria-label": "계획 8분과 실제 20분 타임라인 위의 감정과 상호작용" }, box);
    const x = m => 190 + m * 39;           // 0분 → 190, 20분 → 970
    const AFTER = [1040, 1190];

    const defs = svg("defs", null, root);
    const hatch = svg("pattern", { id: "hatchA", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    svg("line", { x1: 0, y1: 0, x2: 0, y2: 6, class: "hatch-line" }, hatch);

    /* 도착 후 영역 */
    svg("rect", { x: AFTER[0], y: 128, width: AFTER[1] - AFTER[0], height: 380, class: "after-zone", fill: "url(#hatchA)" }, root);
    label(root, (AFTER[0] + AFTER[1]) / 2, 150, "도착 후 · 집계 제외", "lane-note", "middle");

    /* 레인 이름 */
    [["계획", 44], ["실제", 96], ["감정 강도", 210], ["상호작용", 368], ["개인 경험", 440], ["P · I", 488]].forEach(([t, y]) => label(root, 24, y, t, "lane-name"));
    label(root, 24, 228, "−2 ~ +2 · 회고", "lane-note");

    /* 계획 8분 */
    svg("line", { x1: x(0), y1: 40, x2: x(PLAN), y2: 40, class: "line-plan" }, root);
    svg("circle", { cx: x(PLAN), cy: 40, r: 4.5, class: "dot-ink" }, root);
    label(root, x(PLAN) + 14, 44, `${fmt(PLAN)} 계획 도착 · 출발 + 8분 계산값`, "axis-label");

    /* 실제 20분 축 */
    svg("line", { x1: x(0), y1: 92, x2: x(TOTAL), y2: 92, class: "line-real" }, root);
    for (let m = 0; m <= TOTAL; m++) {
      svg("line", { x1: x(m), y1: 92, x2: x(m), y2: m % 4 === 0 ? 100 : 96, class: "tick" }, root);
      if (m % 4 === 0) label(root, x(m), 118, fmt(m), "axis-label", "middle");
    }
    svg("circle", { cx: x(TOTAL), cy: 92, r: 4.5, class: "dot-ink" }, root);
    /* 늘어난 12분 */
    svg("path", { d: `M${x(PLAN)},70 L${x(PLAN)},64 L${x(TOTAL)},64 L${x(TOTAL)},70`, class: "bracket" }, root);
    label(root, x(TOTAL) + 12, 70, `늘어난 ${TOTAL - PLAN}분`, "bracket-label");
    svg("line", { x1: x(PLAN), y1: 40, x2: x(PLAN), y2: 500, class: "plan-guide" }, root);

    /* 감정 슬롯 (EQ 슬라이더 형태) */
    const ys = lv => 210 - lv * 26;        // +2 → 158, −2 → 262
    svg("line", { x1: x(0) - 20, y1: ys(0), x2: x(TOTAL) + 20, y2: ys(0), class: "zero-line" }, root);
    label(root, x(0) - 30, ys(0) + 4, "0", "axis-label", "end");
    label(root, x(0) - 30, ys(2) + 4, "+2", "axis-label", "end");
    label(root, x(0) - 30, ys(-2) + 4, "−2", "axis-label", "end");
    scenes.forEach(s => {
      const m = sceneMin(s);
      const cx = m == null ? (AFTER[0] + AFTER[1]) / 2 : x(m);
      const g = svg("g", { class: "slot" + (s.segment !== "walk" ? " is-muted" : "") }, root);
      if (!s.emotion.kind) { label(g, cx, 300, "감정 기록 없음", "lane-note", "middle"); return; }
      svg("rect", { x: cx - 12, y: ys(2) - 14, width: 24, height: ys(-2) - ys(2) + 28, rx: 12, class: "slot-track" }, g);
      [2, 1, 0, -1, -2].forEach(lv => svg("circle", { cx, cy: ys(lv), r: 2.4, class: "slot-dot" }, g));
      if (s.emotion.score == null) {
        svg("circle", { cx, cy: ys(0), r: 9, class: "slot-empty" }, g);
        label(g, cx, ys(0) + 4, "?", "slot-q", "middle");
      } else {
        svg("circle", { cx, cy: ys(s.emotion.score), r: 9, fill: emoColor(s.emotion.kind) }, g);
      }
      const name = label(g, cx + 7, 300, D.emotions[s.emotion.kind].label, "emo-label", "middle");
      const w = name.getComputedTextLength();
      svg("circle", { cx: cx + 7 - w / 2 - 9, cy: 296, r: 5, fill: emoColor(s.emotion.kind) }, g);
      label(g, cx, 314, "포스터 기준 · 확인 필요", "lane-note", "middle");
    });

    /* 상호작용 */
    scenes.forEach(s => {
      const m = sceneMin(s);
      const cx = m == null ? (AFTER[0] + AFTER[1]) / 2 : x(m);
      const list = inter.filter(i => i.scene === s.id && i.kind === "interaction" && i.type);
      const g = svg("g", { class: "syms" + (s.segment === "after" ? " is-muted" : "") }, root);
      list.forEach((it, i) => symbol(it.type, cx + (i - (list.length - 1) / 2) * 30, 368, 9, g, { filled: it.status === "확정" }));
      if (s.segment === "pending") {
        svg("circle", { cx, cy: 368, r: 18, class: "pending-ring" }, g);
        label(g, cx, 402, "구간 확인 필요", "lane-note", "middle");
      }
      if (s.timeRange) {
        const a = x(toMin(s.timeRange[0]) - T0 + 0.5), b = x(toMin(s.timeRange[1]) - T0 - 0.5);
        svg("path", { d: `M${a},${338} L${a},${334} L${b},${334} L${b},${338}`, class: "bracket thin" }, g);
        label(g, (a + b) / 2, 328, "19:00–19:20 사이 · 순서만 확인됨", "lane-note", "middle");
        label(g, cx, 400, `“${s.quote}”`, "quote", "middle");
      }
    });

    /* 개인 경험 (집계 제외) */
    const pers = inter.filter(i => i.kind === "personal");
    svg("rect", { x: x(0), y: 430, width: x(TOTAL) - x(0), height: 18, rx: 9, class: "personal-band" }, root);
    label(root, x(0) + 14, 443, `${pers.map(p => p.text).join(" · ")} — 개인 경험 · 시점 미확인 · 상호작용 집계 제외`, "lane-note");

    /* P · I */
    label(root, x(0), 492, "P · I 표시 없음 (포스터 기준) · 정의에 따라 재확인", "lane-note");

    photoRow(sec);
    statusBar(sec);
  }

  /* ------------------------------------------------------------------------
     B안 · 늘어나는 시간의 지형
     ------------------------------------------------------------------------ */
  function renderB(stage) {
    const sec = html("section", "evb evb-b", null, stage);
    const grid = html("div", "evb-grid", null, sec);
    const aside = html("div", "evb-aside", null, grid);
    header(aside, "b");
    legendB(aside);

    const box = html("div", "evb-chart", null, grid);
    const W = 1000, H = 640;
    const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "evb-svg", role: "img",
      "aria-label": "8분 계획선에서 20분 실제선으로 늘어난 시간 위의 상호작용과 감정, 사진" }, box);
    const x = m => 70 + m * 38;            // 0 → 70, 20 → 830
    const YP = 70, YR = 300;

    const defs = svg("defs", null, root);
    const goo = svg("filter", { id: "gooB" }, defs);
    svg("feGaussianBlur", { in: "SourceGraphic", stdDeviation: 9, result: "b" }, goo);
    svg("feColorMatrix", { in: "b", mode: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" }, goo);
    const soft = svg("filter", { id: "softB", x: "-10%", y: "-60%", width: "120%", height: "220%" }, defs);
    svg("feGaussianBlur", { stdDeviation: 7 }, soft);
    const hatch = svg("pattern", { id: "hatchB", width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    svg("line", { x1: 0, y1: 0, x2: 0, y2: 7, class: "hatch-line" }, hatch);

    /* 감정 종류 그라디언트: 장면 위치에 색 정지점 */
    const grad = svg("linearGradient", { id: "emoGrad", gradientUnits: "userSpaceOnUse", x1: x(0), y1: 0, x2: x(TOTAL), y2: 0 }, defs);
    scenes.filter(s => s.segment !== "after" && s.emotion.kind).forEach(s => {
      const m = s.timeRange ? 0.5 : sceneMin(s);
      svg("stop", { offset: (m / TOTAL).toFixed(3), "stop-color": emoColor(s.emotion.kind) }, grad);
      if (s.timeRange) svg("stop", { offset: ((TOTAL - 0.5) / TOTAL).toFixed(3), "stop-color": emoColor(s.emotion.kind) }, grad);
    });

    /* 도착 후 */
    svg("rect", { x: 856, y: 30, width: 130, height: 590, class: "after-zone", fill: "url(#hatchB)" }, root);
    label(root, 921, 52, "도착 후", "mono-tag", "middle");
    label(root, 921, 68, "집계 제외", "lane-note", "middle");

    /* 늘어남: 계획선 → 실제선을 잇는 흰 형태 */
    svg("path", { class: "stretch", d: `M${x(0)},${YP} L${x(PLAN)},${YP} C${x(PLAN) + 170},${YP + 6} ${x(TOTAL) - 10},${YR - 150} ${x(TOTAL)},${YR} L${x(0)},${YR} C${x(0) - 26},${YR - 90} ${x(0) - 22},${YP + 60} ${x(0)},${YP} Z` }, root);
    label(root, (x(PLAN) + x(TOTAL)) / 2 - 30, 210, `+${TOTAL - PLAN}분`, "stretch-num", "middle");

    svg("line", { x1: x(0), y1: YP, x2: x(PLAN), y2: YP, class: "line-plan" }, root);
    svg("circle", { cx: x(PLAN), cy: YP, r: 5, class: "dot-ink" }, root);
    label(root, x(0), YP - 16, "계획 · 8분", "mono-tag");
    label(root, x(PLAN) + 12, YP + 4, `${fmt(PLAN)} · 계산값`, "lane-note");

    svg("line", { x1: x(PLAN), y1: YP, x2: x(PLAN), y2: YR, class: "plan-guide" }, root);
    label(root, x(PLAN) + 8, YP + 30, "계획했던 도착 지점", "lane-note");

    /* 개인 경험: 실제선 위의 점선 */
    svg("path", { d: `M${x(0)},${YR - 34} L${x(TOTAL) - 34},${YR - 34}`, class: "personal-dots" }, root);
    label(root, x(1), YR - 44, "개인 경험 · 음악 · 노을 — 시점 미확인 · 집계 제외", "lane-note");

    svg("line", { x1: x(0), y1: YR, x2: x(TOTAL), y2: YR, class: "line-real" }, root);
    label(root, x(0), YR + 26, EV.start, "mono-tag", "middle");
    label(root, x(PLAN), YR + 26, fmt(PLAN), "mono-tag", "middle");
    label(root, x(TOTAL), YR + 26, EV.end, "mono-tag", "middle");
    label(root, x(14), YR + 26, "실제 · 20분", "mono-tag", "middle");

    /* 감정 띠 (강도 미입력 → 높이 일정) */
    svg("rect", { x: x(0), y: YR + 44, width: x(TOTAL) - x(0), height: 46, rx: 23, fill: "url(#emoGrad)", class: "emo-band", filter: "url(#softB)" }, root);
    label(root, x(0), YR + 112, "감정 종류 · 포스터 기준 확인 필요 · 강도 미입력이라 띠의 높이는 일정합니다", "lane-note");

    /* 상호작용 버블 (유기적으로 이어짐) */
    const bubbles = svg("g", { filter: "url(#gooB)", class: "bubbles" }, root);
    const symLayer = svg("g", null, root);
    scenes.forEach(s => {
      const m = sceneMin(s);
      const list = inter.filter(i => i.scene === s.id && i.kind === "interaction" && i.type);
      if (m == null) {
        list.forEach((it, i) => {
          svg("circle", { cx: 921, cy: YR + i * 0, r: 19, class: "bubble-after" }, root);
          symbol(it.type, 921, YR, 8, root, { filled: it.status === "확정", cls: "is-muted" });
        });
        return;
      }
      list.forEach((it, i) => {
        const cx = x(m) + (i - (list.length - 1) / 2) * 34;
        svg("circle", { cx, cy: YR, r: 19 }, bubbles);
        symbol(it.type, cx, YR, 8, symLayer, { filled: it.status === "확정" });
      });
      if (s.segment === "pending") {
        svg("circle", { cx: x(m), cy: YR, r: 27, class: "pending-ring" }, root);
        label(root, x(m), YR - 56, "구간 확인 필요", "lane-note", "middle");
      }
      if (s.timeRange) {
        const a = x(0.6), b = x(TOTAL - 0.6);
        svg("path", { d: `M${a},${YR + 36} L${b},${YR + 36}`, class: "range-line" }, root);
      }
    });

    /* 사진: 원형 썸네일, 순서 기준 배치 */
    const walk = D.photos.filter(p => p.event === "B" && p.order).sort((a, b) => a.order - b.order);
    walk.forEach((p, i) => {
      const m = (i + 0.5) * TOTAL / walk.length;
      const cx = x(m), cy = i % 2 ? 560 : 500;
      photoCircle(root, defs, p, cx, cy, 30, `0${p.order}`);
      svg("line", { x1: cx, y1: YR + 142, x2: cx, y2: cy - 32, class: "leader" }, root);
    });
    label(root, x(0), YR + 128, "사진은 순서만 확인되어 같은 간격으로 놓았습니다", "lane-note");
    const r = D.photos.find(p => p.event === "B" && !p.order);
    if (r) photoCircle(root, defs, r, 921, 520, 30, r.time, true);

    statusBar(sec);
  }

  function photoCircle(root, defs, p, cx, cy, r, tagText, muted) {
    const id = "clip-" + p.id;
    const cp = svg("clipPath", { id }, defs);
    svg("circle", { cx, cy, r }, cp);
    const g = svg("g", { class: "photo-dot" + (muted ? " is-muted" : ""), tabindex: 0 }, root);
    svg("image", { href: p.file, x: cx - r * 1.4, y: cy - r, width: r * 2.8, height: r * 2, preserveAspectRatio: "xMidYMid slice", "clip-path": `url(#${id})` }, g);
    svg("circle", { cx, cy, r, class: "photo-ring" }, g);
    const t = svg("title", null, g); t.textContent = p.alt;
    label(root, cx, cy + r + 16, tagText, "mono-tag", "middle");
  }

  function legendB(aside) {
    const lg = html("div", "evb-legend", null, aside);
    html("p", "legend-h", "읽는 법", lg);
    const ul = html("ul", null, null, lg);
    Object.entries(D.interactionTypes).forEach(([k, v]) => {
      const li = html("li", null, null, ul); li.appendChild(DT.symbolInline(k, false)); html("span", null, v.label, li);
    });
    const ul2 = html("ul", "legend-emo", null, lg);
    Object.values(D.emotions).forEach(e => {
      const li = html("li", null, null, ul2); const i = html("i", null, null, li); i.style.background = `var(${e.token})`; html("span", null, e.label, li);
    });
    html("p", "legend-note", "기호 외곽선 = 검토 전 기록 · 채움 = 확정", lg);
  }

  function label(parent, x, y, text, cls, anchor) {
    const t = svg("text", { x, y, class: cls || "lane-note", "text-anchor": anchor || "start" }, parent);
    t.textContent = text;
    return t;
  }

  window.renderEventB = function (stage, variant) {
    (variant === "b" ? renderB : renderA)(stage);
  };
})();
