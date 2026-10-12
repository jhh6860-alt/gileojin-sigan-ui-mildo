/* ==========================================================================
   비교 (Comparison) — Different ways of spending time
   --------------------------------------------------------------------------
   · 네 개의 분석 장면(TRIGGER · EXPERIENCE · EMOTION · INSIGHT)이 하나의 무대 위에서
     스크롤 진행도에 맞춰 바뀝니다. 위로 올리면 이전 장면으로 돌아갑니다.
   · 가운데 질문과 양옆 A·B 그래픽은 같은 진행도(같은 시점)에 함께 변합니다.
   · 그래픽의 값은 data.js 기록에서 읽습니다. 기록이 없는 수치는 만들지 않습니다.
     - 감정 높이: 사용자 회고 값(−2~+2). 색: 감정 종류
     - 시간 막대: B 의 계획 8분 / 실제 약 20분만 (A 는 원래 예상 시간이 없어 막대 없음)
     - 경험 구성도: 기록된 종류만, 크기·길이는 횟수·비중이 아님
   ========================================================================== */
(function () {
  "use strict";

  const D = window.SITE_DATA;
  const section = document.getElementById("cp");
  const stage = document.getElementById("cp-stage");
  if (!D || !section) return;
  const NS = "http://www.w3.org/2000/svg";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mqNarrow = window.matchMedia("(max-width: 860px)");

  const scenes = [...document.querySelectorAll(".cp-scene")];
  const centers = scenes.map(s => s.querySelector(".cp-center"));
  const N = scenes.length;
  const progressBtns = [...document.querySelectorAll("#cp-progress [data-go]")];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sceneOf = id => D.scenes.find(s => s.id === id);
  const ofScene = id => D.interactions.filter(i => i.scene === id);
  const signed = v => v > 0 ? "+" + v : v < 0 ? "−" + Math.abs(v) : "0";
  const dir = v => v > 0 ? "긍정" : v < 0 ? "부정" : "중립";

  /* ---------- SVG 도우미 ---------- */
  function S(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function T(parent, x, y, text, cls, anchor) {
    const t = S("text", { x, y, class: cls || "cp-t", "text-anchor": anchor || "start" }, parent);
    t.textContent = text;
    return t;
  }

  /* 스크롤에 따라 나타나는 조각: [장면, 요소, 시작, 끝, 방식(fade | draw)] */
  const parts = [];
  function reg(scene, el, a0, a1, kind) {
    kind = kind || "fade";
    if (kind === "draw") { el.setAttribute("pathLength", 1); el.style.strokeDasharray = "1"; el.style.strokeDashoffset = "1"; }
    else el.style.opacity = 0;
    parts.push({ scene, el, a0, a1, kind });
    return el;
  }

  /* 눌러서 설명을 보는 요소 (마우스·터치·키보드) */
  function hit(parent, label, text, tipEl, ring) {
    const g = S("g", { class: "cp-hit", tabindex: 0, role: "button", "aria-label": `${label}. ${text}` }, parent);
    if (ring) S("circle", Object.assign({ class: "cp-hit-ring" }, ring), g);
    const show = on => {
      tipEl.innerHTML = on ? `<b>${label}</b>${text}` : "";
      tipEl.classList.toggle("is-on", on);
    };
    g.addEventListener("pointerenter", () => { if (!g.classList.contains("is-on")) show(true); });
    g.addEventListener("pointerleave", () => { if (!g.classList.contains("is-on")) show(false); });
    g.addEventListener("focus", () => show(true));
    g.addEventListener("blur", () => { g.classList.remove("is-on"); show(false); });
    const toggle = () => {
      const on = !g.classList.contains("is-on");
      parent.closest("svg").querySelectorAll(".cp-hit.is-on").forEach(x => x.classList.remove("is-on"));
      g.classList.toggle("is-on", on); show(on);
    };
    g.addEventListener("click", toggle);
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    return g;
  }

  /* ---------- 01 TRIGGER ---------- */
  const A0 = sceneOf("A-0"), B0 = sceneOf("B-0"), B2 = sceneOf("B-2");
  const GRAPHICS = {
    /* A: 하나의 선이 외부 요인(카페 휴무)에 막혀 방향을 바꿈 */
    triggerA(svg, i) {
      svg.setAttribute("viewBox", "0 0 400 230");
      reg(i, S("path", { class: "cp-plan", d: "M20,150 L370,150" }, svg), 0, 0.15);
      const ghost = S("g", null, svg);
      S("circle", { class: "cp-ghost", cx: 300, cy: 150, r: 9 }, ghost);
      T(ghost, 300, 178, "원래 계획 · 카페", "cp-t-m", "middle");
      reg(i, ghost, 0.05, 0.2);
      const start = S("g", null, svg);
      S("circle", { class: "cp-dot-a", cx: 20, cy: 150, r: 4.5 }, start);
      T(start, 20, 132, `출발 ${A0.time}`, "cp-t");
      reg(i, start, 0, 0.1);
      reg(i, S("path", { class: "cp-line cp-line-a", d: "M20,150 L232,150" }, svg), 0.1, 0.4, "draw");
      const block = S("g", null, svg);
      S("rect", { class: "cp-block", x: 240, y: 128, width: 6, height: 44, rx: 3 }, block);
      T(block, 243, 196, "카페 휴무", "cp-t", "middle");
      reg(i, block, 0.36, 0.46);
      reg(i, S("path", { class: "cp-line cp-line-a", d: "M232,150 C262,150 262,80 300,72 S350,66 380,60" }, svg), 0.48, 0.8, "draw");
      const turn = S("g", null, svg);
      T(turn, 196, 98, "계획 변경", "cp-t", "end");
      T(turn, 196, 114, `“${A0.quote}”`, "cp-t-q", "end");
      reg(i, turn, 0.52, 0.64);
      [[318, 69.5], [345, 65.5], [372, 61]].forEach(([x, y], k) => reg(i, S("circle", { class: "cp-ring-a", cx: x, cy: y, r: 4.5 }, svg), 0.72 + k * 0.06, 0.8 + k * 0.06));
      reg(i, T(svg, 380, 40, "다른 장소 탐색", "cp-t", "end"), 0.86, 0.96);
    },
    /* B: 방향은 그대로, 같은 선 위에 활동이 쌓임 + 계획/실제 시간 막대 */
    triggerB(svg, i) {
      svg.setAttribute("viewBox", "0 0 400 230");
      const ends = S("g", null, svg);
      S("circle", { class: "cp-dot-b", cx: 20, cy: 110, r: 4.5 }, ends);
      S("circle", { class: "cp-dot-b", cx: 380, cy: 110, r: 4.5 }, ends);
      T(ends, 20, 132, `출발 ${B0.time} · 걸어서 가자`, "cp-t");
      T(ends, 380, 132, `${B2.place} ${B2.time}`, "cp-t", "end");
      reg(i, ends, 0, 0.12);
      reg(i, S("path", { class: "cp-line cp-line-b", d: "M20,110 L380,110" }, svg), 0.05, 0.38, "draw");
      ["사진", "대화", "풍경 감상"].forEach((label, k) => {
        const x = 110 + k * 90;
        const g = S("g", null, svg);
        S("line", { class: "cp-tick", x1: x, y1: 110, x2: x, y2: 62 - k * 0 }, g);
        S("rect", { class: "cp-pill-b", x: x - 34, y: 40, width: 68, height: 22, rx: 11 }, g);
        T(g, x, 55, label, "cp-t", "middle");
        reg(i, g, 0.42 + k * 0.1, 0.52 + k * 0.1);
      });
      /* 시간 막대: 실제 기록값 (계획 8분 / 실제 약 20분) — 이 막대만 시간에 비례 */
      const plan = D.events.B.plannedMinutes, real = 20, W = 360;
      reg(i, T(svg, 20, 160, `계획 ${plan}분`, "cp-t-m"), 0.72, 0.8);
      reg(i, S("path", { class: "cp-bar-plan", d: `M20,172 L${20 + W * plan / real},172` }, svg), 0.72, 0.84, "draw");
      reg(i, T(svg, 20, 198, "실제 약 20분", "cp-t"), 0.8, 0.88);
      reg(i, S("path", { class: "cp-bar-real", d: `M20,210 L${20 + W},210` }, svg), 0.8, 0.98, "draw");
    },

    /* ---------- 02 EXPERIENCE ---------- */
    /* A: 닫힌 카페에서 시작해 장소가 이어질수록 범위가 넓어지는 구성 (크기는 같음 = 비정량) */
    expA(svg, i) {
      svg.setAttribute("viewBox", "0 0 400 250");
      const tip = svg.parentNode.querySelector(".cp-tip");
      const nodes = [
        { id: "A-1", x: 140, y: 104, text: "목적지가 사라진 뒤 처음 머문 곳. 탐색이 '구경'으로 시작되었습니다." },
        { id: "A-2", x: 220, y: 190, text: "계획에 없던 풍경. A 에서 감정이 가장 높게(+2) 기록된 장면과 겹칩니다." },
        { id: "A-3", x: 292, y: 78, text: "눈에 띈 조형물을 따라 들어간 곳 — 경로가 호기심으로 정해졌습니다." },
        { id: "A-4", x: 360, y: 150, text: "원래 목적이던 '카페'가 다른 장소에서 다시 채워졌습니다. (도착 후 장면)" }
      ];
      /* 경험의 범위: 출발점과 장소들을 감싸는 영역 (바깥 둘레 순서) */
      const hull = [[36, 150], [nodes[0].x, nodes[0].y], [nodes[2].x, nodes[2].y], [nodes[3].x, nodes[3].y], [nodes[1].x, nodes[1].y]];
      const area = S("polygon", { class: "cp-area-a", points: hull.map(p => p.join(",")).join(" ") }, svg);
      reg(i, area, 0.86, 1);
      reg(i, S("path", { class: "cp-line cp-line-a", d: "M36,150 " + nodes.map(n => `L${n.x},${n.y}`).join(" ") }, svg), 0.08, 0.84, "draw");
      const start = S("g", null, svg);
      S("rect", { class: "cp-block", x: 33, y: 132, width: 6, height: 36, rx: 3 }, start);
      T(start, 36, 188, "닫힌 카페", "cp-t-m", "middle");
      reg(i, start, 0, 0.1);
      nodes.forEach((n, k) => {
        const sc = sceneOf(n.id);
        const g = hit(svg, `${sc.place}${sc.P ? " · P" : ""}`, n.text, tip, { cx: n.x, cy: n.y, r: 13 });
        S("circle", { class: "cp-ring-a", cx: n.x, cy: n.y, r: 7 }, g);
        const below = n.y > 140;
        T(g, n.x, below ? n.y + 26 : n.y - 16, sc.place, "cp-t-k", "middle");
        reg(i, g, 0.18 + k * 0.17, 0.28 + k * 0.17);
      });
      reg(i, T(svg, 210, 240, "점의 크기는 같습니다 — 경험의 범위가 넓어진 순서만 나타냄", "cp-t-m", "middle"), 0.9, 1);
    },
    /* B: 하나의 길 위에 겹쳐진 경험의 층 (모두 같은 길이 = 비정량) */
    expB(svg, i) {
      svg.setAttribute("viewBox", "0 0 400 250");
      const tip = svg.parentNode.querySelector(".cp-tip");
      const B1 = sceneOf("B-1");
      const layers = [
        { label: "함께 걷기", shared: true, text: "이동 자체가 함께하는 활동이 되었습니다. 걷는 구간 전체에 깔린 바탕입니다." },
        { label: "사진 촬영", shared: true, text: "돌담길에서 멈춰 서게 만든 행동 — 이동 중에 생긴 '머무름'의 흔적입니다." },
        { label: "대화", shared: true, text: `“${B1.quote}”처럼 풍경에 대한 감상을 나누는 대화였습니다.` },
        { label: "음악 감상", shared: true, text: "걷는 동안 함께 들은 음악 — 이동하는 시간의 분위기를 만든 경험입니다." },
        { label: "노을 감상", shared: true, text: "저녁 시간대에만 있었던 풍경을 함께 바라본 경험입니다." }
      ];
      reg(i, S("path", { class: "cp-line cp-line-b", d: "M30,214 L370,214" }, svg), 0, 0.2, "draw");
      reg(i, T(svg, 30, 238, "돌담길 · 이동 중 (19:00–19:20)", "cp-t-m"), 0.05, 0.15);
      layers.forEach((l, k) => {
        const y = 178 - k * 32;
        const g = hit(svg, l.label, l.text, tip, null);
        S("rect", { class: "cp-hit-ring", x: 26, y: y - 4, width: 348, height: 30, rx: 15 }, g);
        S("rect", { class: "cp-band " + (l.shared ? "cp-band-shared" : "cp-band-personal"), x: 30, y, width: 340, height: 22, rx: 11 }, g);
        T(g, 44, y + 15, l.label, "cp-t-k");
        reg(i, g, 0.22 + k * 0.13, 0.32 + k * 0.13);
      });
    },

    /* ---------- 03 EMOTION ---------- */
    /* A: 다섯 장면의 방향·강도를 잇는 선 (전환이 두드러짐) */
    emoA(svg, i) { emotionChart(svg, i, "A", true); },
    /* B: 같은 축이지만 곡선으로 잇지 않고, 각 장면에 함께 기록된 활동을 표시 */
    emoB(svg, i) { emotionChart(svg, i, "B", false); }
  };

  /* 감정 그래프의 짧은 장면 이름 (아래 줄에서 이웃 이름과 겹치지 않게) */
  const SHORT = { "A-0": "닫힌 카페", "A-1": "기념품샵", "A-2": "바다", "A-3": "선글라스", "A-4": "새 카페", "B-0": "출발", "B-1": "돌담길", "B-2": "식당 도착" };
  /* B: 각 장면에 함께 기록된 활동 (원인이 아니라 같은 장면의 기록) — 줄 단위 */
  const ACTS = { "B-0": ["걸어가자는 제안"], "B-1": ["사진 · 대화", "음악 · 노을"], "B-2": ["도착 · 아쉬움 공유"] };

  function emotionChart(svg, i, ev, connect) {
    /* 위에서부터: 전환 표시(A) → 그래프 → 장면 이름·점수 → (B) 함께 기록된 활동 → 인용 */
    svg.setAttribute("viewBox", connect ? "0 0 400 266" : "0 0 400 336");
    const tip = svg.parentNode.querySelector(".cp-tip");
    const list = D.scenes.filter(s => s.event === ev && typeof s.emotion.score === "number");
    const y = v => 126 - v * 40;                       // +2 → 46, 0 → 126, −2 → 206
    const x0 = connect ? 72 : 90, x1 = connect ? 352 : 330;
    const xs = list.map((s, k) => list.length === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * k / (list.length - 1));
    /* 축: +2 · 0 · −2 */
    const axis = S("g", null, svg);
    [2, 0, -2].forEach(v => {
      S("line", { class: v === 0 ? "cp-zero" : "cp-base", x1: 44, x2: 380, y1: y(v), y2: y(v) }, axis);
      T(axis, 36, y(v) + 4, signed(v), "cp-t-m", "end");
    });
    T(axis, 36, y(2) - 14, "긍정", "cp-t-m", "end");
    T(axis, 36, y(-2) + 18, "부정", "cp-t-m", "end");
    reg(i, axis, 0, 0.12);
    if (connect) {
      reg(i, S("path", { class: "cp-line cp-line-a", d: list.map((s, k) => `${k ? "L" : "M"}${xs[k]},${y(s.emotion.score)}`).join(" ") }, svg), 0.15, 0.75, "draw");
    }
    list.forEach((s, k) => {
      const emo = D.emotions[s.emotion.kind];
      const v = s.emotion.score, px = xs[k], py = y(v);
      const co = ofScene(s.id).filter(t => t.type === "together" || t.type === "situation");
      const text = `${emo.label} · ${dir(v)} ${signed(v)}` + (connect ? "" : co.length ? ` — 같은 장면 기록: ${co.map(t => t.text).join(", ")}` : "");
      const g = hit(svg, s.place, text, tip, { cx: px, cy: py, r: 13 });
      S("rect", { class: "cp-emo", x: px - 6, y: py - 6, width: 12, height: 12, rx: 2, transform: `rotate(45 ${px} ${py})`, style: `fill:var(${emo.token})` }, g);
      reg(i, g, 0.15 + k * (connect ? 0.13 : 0.2), 0.25 + k * (connect ? 0.13 : 0.2));
      /* 장면 이름과 점수 (그래프 아래 두 줄 — 선·점과 겹치지 않음) */
      const lab = S("g", null, svg);
      T(lab, px, 242, SHORT[s.id] || s.place, "cp-t-m", "middle");
      T(lab, px, 258, signed(v), "cp-t", "middle");
      reg(i, lab, 0.15 + k * 0.13, 0.3 + k * 0.13);
      if (!connect) {
        const cg = S("g", null, svg);
        S("line", { class: "cp-co", x1: px, y1: py + 9, x2: px, y2: 226 }, cg);
        (ACTS[s.id] || []).forEach((line, n) => T(cg, px, 282 + n * 15, line, "cp-t", "middle"));
        reg(i, cg, 0.35 + k * 0.2, 0.45 + k * 0.2);
      }
    });
    if (connect) {
      /* 전환 구간 표시: 가장 낮은 장면(−2) → 가장 높은 첫 장면(+2) */
      const lo = list.findIndex(s => s.emotion.score === Math.min(...list.map(t => t.emotion.score)));
      const hi = list.findIndex(s => s.emotion.score === Math.max(...list.map(t => t.emotion.score)));
      const br = S("g", null, svg);
      S("path", { class: "cp-bracket", d: `M${xs[lo]},28 L${xs[lo]},22 L${xs[hi]},22 L${xs[hi]},28` }, br);
      T(br, (xs[lo] + xs[hi]) / 2, 14, `전환 ${signed(list[lo].emotion.score)} → ${signed(list[hi].emotion.score)}`, "cp-t", "middle");
      reg(i, br, 0.8, 0.92);
    } else {
      const q = S("g", null, svg);
      T(q, 200, 316, `“${B2.quote}”`, "cp-t-q", "middle");
      T(q, 200, 332, "도착을 아쉬워한 말 — 과정이 즐거웠다는 회고로 읽힙니다 (해석)", "cp-t-m", "middle");
      reg(i, q, 0.85, 0.97);
    }
  }

  /* 감정 종류 범례 (가운데) */
  const key = document.getElementById("cp-emo-key");
  if (key) key.innerHTML = Object.values(D.emotions).map(e => `<li><i style="--emo:var(${e.token})"></i>${e.label}</li>`).join("");

  /* ---------- 04 INSIGHT: 앞의 세 그래픽을 작은 기호로 다시 정렬 ---------- */
  const GLYPH = {
    A: [
      ["계기", "예상하지 못한 변화", g => { S("path", { class: "cp-line cp-line-a", d: "M4,22 L30,22 C40,22 40,8 60,6" }, g); S("rect", { class: "cp-block", x: 31, y: 14, width: 3, height: 16, rx: 1.5 }, g); }],
      ["경험", "발견하며 확장", g => { S("path", { class: "cp-line cp-line-a", d: "M4,16 L22,8 L34,26 L46,4 L60,16" }, g); S("polygon", { class: "cp-area-a", points: "4,16 22,8 34,26 46,4 60,16" }, g); }],
      ["감정", "당황에서 즐거움으로 (−2 → +2)", g => { S("path", { class: "cp-line cp-line-a", d: "M4,28 L18,16 L32,2 L46,9 L60,2" }, g); }]
    ],
    B: [
      ["계기", "자발적인 머무름", g => { S("path", { class: "cp-line cp-line-b", d: "M4,22 L60,22" }, g); [16, 32, 48].forEach(x => S("rect", { class: "cp-pill-b", x: x - 5, y: 6, width: 10, height: 6, rx: 3 }, g)); }],
      ["경험", "과정에 머무름", g => { [4, 11, 18, 25].forEach(yy => S("rect", { class: "cp-band cp-band-shared", x: 4, y: yy, width: 56, height: 5, rx: 2.5 }, g)); }],
      ["감정", "과정 속에서 이어진 즐거움 (+1 ~ +2)", g => { [[12, 10], [32, 3], [52, 10]].forEach(([x, yy]) => S("circle", { class: "cp-dot-b", cx: x, cy: yy, r: 3.5 }, g)); S("line", { class: "cp-zero", x1: 2, x2: 62, y1: 22, y2: 22 }, g); }]
    ]
  };
  const insight = scenes.findIndex(s => s.classList.contains("cp-scene--insight"));
  document.querySelectorAll("[data-rows]").forEach(ul => {
    const ev = ul.dataset.rows;
    GLYPH[ev].forEach(([k, v, draw], n) => {
      const li = document.createElement("li");
      const svg = S("svg", { viewBox: "0 0 64 30", "aria-hidden": "true" });
      draw(svg);
      li.appendChild(svg);
      li.insertAdjacentHTML("beforeend", `<span class="k">${k}</span><span class="v">${v}</span>`);
      ul.appendChild(li);
      reg(insight, li, 0.1 + n * 0.14, 0.24 + n * 0.14);
    });
  });
  if (insight >= 0) {
    const sc = scenes[insight];
    reg(insight, sc.querySelector(".cp-a .cp-sum"), 0.52, 0.66);
    reg(insight, sc.querySelector(".cp-b .cp-sum"), 0.52, 0.66);
    sc.querySelectorAll(".cp-common li").forEach((li, n) => reg(insight, li, 0.62 + n * 0.08, 0.72 + n * 0.08));
  }

  /* 그래픽 그리기 */
  document.querySelectorAll("[data-graphic]").forEach(svg => {
    const i = +svg.closest(".cp-scene").dataset.scene;
    GRAPHICS[svg.dataset.graphic](svg, i);
  });

  /* ---------- 스크롤 진행도 → 장면 ----------
     f: 연속된 장면 번호 (-0.4 ~ N-1+0.25). 정수 근처에서 장면이 온전히 보이고,
        두 장면 사이에서 짧게 겹쳐 바뀝니다(crossfade). 각 장면의 그래픽은 f 가 i-0.4 → i 로
        다가오는 동안 순서대로 그려집니다. */
  const F0 = -0.3, F1 = N - 1 + 0.25;   // 시작: 첫 장면이 온전히 보이고 그래픽이 그려지기 시작하는 지점
  let target = 0, shown = null, narrow = mqNarrow.matches;
  function readScroll() {
    const total = section.offsetHeight - window.innerHeight;
    const p = clamp(-section.getBoundingClientRect().top / Math.max(1, total), 0, 1);
    target = F0 + p * (F1 - F0);
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("resize", readScroll);
  mqNarrow.addEventListener("change", e => { narrow = e.matches; shown = null; });

  function render(f) {
    scenes.forEach((sc, i) => {
      const d = f - i;
      /* 장면 보임 정도: 앞 장면이 먼저 사라진 뒤 다음 장면이 나타남 (두 질문이 겹치지 않게) */
      const w = narrow ? 1 : clamp((0.45 - Math.abs(d)) / 0.1, 0, 1);
      const g = narrow ? 1 : clamp((d + 0.42) / 0.42, 0, 1);                  // 장면 안 그래픽 진행
      sc.style.opacity = narrow ? "" : w.toFixed(3);
      sc.classList.toggle("is-live", w > 0.001);
      sc.classList.toggle("is-back", w < 0.6);
      sc.setAttribute("aria-hidden", w < 0.5 ? "true" : "false");
      if (!narrow && !reduce) centers[i].style.transform = `translateY(${(-d * 46).toFixed(1)}px)`;   // 질문이 위로 흘러가며 바뀜
      sc._g = g;
    });
    parts.forEach(pt => {
      const g = scenes[pt.scene] ? scenes[pt.scene]._g : 1;
      const k = clamp((g - pt.a0) / Math.max(0.001, pt.a1 - pt.a0), 0, 1);
      if (pt.kind === "draw") pt.el.style.strokeDashoffset = (1 - k).toFixed(4);
      else pt.el.style.opacity = k.toFixed(3);
    });
    /* 진행 표시 */
    const cur = clamp(Math.round(f), 0, N - 1);
    progressBtns.forEach((b, i) => {
      b.toggleAttribute("aria-current", false);
      if (i === cur) b.setAttribute("aria-current", "step");
      b.style.setProperty("--fill", (clamp((f - i + 0.42) / 0.67, 0, 1) * 100).toFixed(1) + "%");
    });
  }

  /* 진행 표시를 누르면 해당 장면 위치로 (키보드 포함) */
  progressBtns.forEach(b => b.addEventListener("click", () => {
    const i = +b.dataset.go;
    const total = section.offsetHeight - window.innerHeight;
    const p = clamp((i - F0) / (F1 - F0), 0, 1);
    window.scrollTo({ top: section.offsetTop + p * total, behavior: reduce ? "auto" : "smooth" });
  }));

  /* 매 프레임: 휠의 계단식 움직임을 부드럽게 이어 줌 (스크롤 위치가 기준, 자동 재생 없음) */
  let cur = null;
  function tick() {
    if (narrow) {
      if (shown !== "narrow") { render(N); shown = "narrow"; scenes.forEach(sc => { sc.style.opacity = ""; centers[scenes.indexOf(sc)].style.transform = ""; }); }
    } else {
      if (cur === null || reduce) cur = target;
      else cur += (target - cur) * 0.14;
      if (shown !== cur) { render(cur); shown = cur; }
    }
    requestAnimationFrame(tick);
  }
  readScroll();
  requestAnimationFrame(tick);
})();
