/* ==========================================================================
   개요 (Overview) — Two Walks, One Frame
   --------------------------------------------------------------------------
   · 두 개의 세로 단: A(왼쪽)와 B(오른쪽) 경로 위에 장면(점)과 실제 사진을 놓습니다.
   · 하나의 상태(선택 기준·선택 장면)를 큰 지도(섹션 01)와 작은 지도(섹션 02)가 함께 씁니다.
   · 모든 내용은 js/data.js 의 SITE_DATA 에서 읽습니다.
   ========================================================================== */
(function () {
  "use strict";

  const D = window.SITE_DATA;
  const root = document.getElementById("overview");
  if (!D || !root) return;

  const NS = "http://www.w3.org/2000/svg";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 조절하기 쉬운 값들 ----
     d: 경로 모양 (보드 좌표) / t: 장면 위치 (경로 길이 비율 0~1) / side: 장면 이름표 방향
     photos: 장면별 [사진 id, 장면에서 가로 거리, 세로 거리, 너비, 기울기(도)] */
  const LAYOUT = {
    W: 1000, H: 1600,
    A: {
      d: "M330,60 C330,210 250,270 270,430 S400,640 350,800 S240,1020 290,1180 S350,1380 330,1420",
      t: { "A-0": 0, "A-1": 0.25, "A-2": 0.5, "A-3": 0.75, "A-4": 1 },
      side: "right", compactSide: "left"
    },
    B: {
      d: "M670,190 C670,350 750,420 730,590 S610,830 650,990 S760,1220 720,1390 S670,1480 670,1530",
      t: { "B-0": 0, "B-1": 0.5, "B-2": 1 },
      side: "left", compactSide: "right"
    },
    photos: {
      "A-1": [["a-souvenir-1", -170, -40, 190, -2], ["a-souvenir-2", -140, 110, 120, 2.5]],
      "A-2": [["a-sea-2", -190, -30, 230, 1.5], ["a-sea-4", -150, 150, 140, -2]],
      "A-3": [["a-sunglasses", -170, 0, 180, -1.5]],
      "A-4": [["a-cafe-3", -180, -40, 190, 2], ["a-cafe-1", -120, 110, 110, -2.5]],
      "B-1": [["b-walk-1", 190, -150, 170, 2], ["b-walk-5", 200, 20, 210, -1], ["b-walk-6", 160, 180, 150, 2], ["b-walk-3", 300, 140, 100, -2]],
      "B-2": [["b-restaurant", 180, -20, 190, -1.5]]
    }
  };

  /* ---------- 데이터 도우미 ---------- */
  const scenes = D.scenes;
  const interactionsOf = s => D.interactions.filter(i => i.scene === s.id);
  const photosOf = id => D.photos.filter(p => p.scene === id);
  const photoById = id => D.photos.find(p => p.id === id);
  const timeLabel = s => s.time || (s.timeRange ? s.timeRange.join("–") : "시각 미확인");
  const SEG = { walk: "걷기 구간", after: "도착 후", pending: "구간 확인 필요" };
  const ofType = (s, type) => interactionsOf(s).filter(i => i.kind === "interaction" && i.type === type);
  /* 감정 방향·강도: score 의 부호가 방향, 크기가 강도 */
  const hasScore = s => typeof s.emotion.score === "number";
  const direction = v => v > 0 ? "긍정" : v < 0 ? "부정" : "중립";
  const signed = v => v > 0 ? "+" + v : v < 0 ? "−" + Math.abs(v) : "0";
  const scoreText = s => hasScore(s) ? `${direction(s.emotion.score)} ${signed(s.emotion.score)}` : "";
  const P_LABEL = "P 공간적 예상 밖", I_LABEL = "I 상호작용적 예상 밖";

  /* 관찰 기준 네 가지 — 실제 기록(data.js)으로만 판단합니다 */
  const CRITERIA = {
    time: {
      no: "01", en: "TIME", ko: "시간",
      hint: "기록된 시각과 확인된 구간",
      match: s => !!(s.time || s.timeRange),
      note: s => `${timeLabel(s)} · ${s.timeBasis}`,
      empty: "시각 미확인",
      status: "굵게 겹친 부분이 시각이 기록된 구간입니다 — A는 13:10 출발부터 14:10 새 카페 사진까지, B는 19:00경 출발부터 19:20 식당 도착까지."
    },
    discovery: {
      no: "02", en: "DISCOVERY", ko: "발견",
      hint: "새로운 장소·풍경을 만난 장면",
      match: s => !!s.P || ofType(s, "situation").length > 0,
      note: s => [s.P ? P_LABEL : null].concat(ofType(s, "situation").map(i => i.text)).filter(Boolean).join(" · "),
      empty: "발견 기록 없음",
      status: "공간적 예상 밖(P)으로 표시된 장면과 '상황·발견 대화'로 기록된 장면입니다."
    },
    action: {
      no: "03", en: "ACTION", ko: "행동",
      hint: "함께 한 행동이 기록된 장면",
      match: s => ofType(s, "together").length > 0,
      note: s => ofType(s, "together").map(i => i.text).concat(s.I ? [I_LABEL] : []).join(" · "),
      empty: "공동 행동 기록 없음",
      status: "'공동 행동'으로 기록된 장면입니다(사진 촬영·구경·함께 걷기 등). 상호작용적 예상 밖(I)도 함께 표시합니다. 도착 후 행동은 걷기 구간과 따로 표시합니다."
    },
    emotion: {
      no: "04", en: "EMOTION", ko: "감정",
      hint: "감정 종류와 방향·강도",
      match: s => !!s.emotion.kind,
      note: s => D.emotions[s.emotion.kind].label + (hasScore(s) ? ` · ${scoreText(s)}` : ""),
      empty: "감정 기록 없음",
      status: "네모의 색은 감정 종류, 눈금은 방향과 강도(−2 부정 ~ +2 긍정, 사용자 회고)입니다. 행동이 감정을 바꿨다는 인과는 단정하지 않습니다."
    }
  };

  /* ---------- 공유 상태 ---------- */
  const state = { criterion: null, hover: null, hoverSrc: null, selected: null, drawn: 0 };
  const instances = [];
  function set(patch) {
    Object.assign(state, patch);
    instances.forEach(update);
    renderDetail();
    renderReadout();
    renderControls();
  }
  /* 스크롤 중에는 마우스가 사진 위를 지나가도 커지지 않게 (사진이 글을 가리지 않도록) */
  let lastScroll = 0;
  const scrolling = () => performance.now() - lastScroll < 260;
  const hoverOn = id => { if (!scrolling()) set({ hover: id, hoverSrc: "pointer" }); };
  const hoverOff = id => { if (state.hover === id) set({ hover: null, hoverSrc: null }); };

  /* ---------- 도우미 ---------- */
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function svgEl(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function h(tag, cls, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }
  const pct = (v, total) => (v / total * 100).toFixed(3) + "%";
  /* 방향·강도 눈금 (−2 ~ +2, 다섯 칸) */
  const scaleHTML = s => !hasScore(s) ? "" :
    `<span class="ov-scale" aria-label="${esc(scoreText(s))}">` +
    [-2, -1, 0, 1, 2].map(v => `<i class="${v === s.emotion.score ? "is-on" : ""}${v === 0 ? " is-zero" : ""}"></i>`).join("") +
    `</span><span class="ov-scale-v">${esc(scoreText(s))}</span>`;
  const tagsHTML = s =>
    (s.P ? `<span class="ov-tag ov-tag-p" title="${P_LABEL}">P</span>` : "") +
    (s.I ? `<span class="ov-tag ov-tag-i" title="${I_LABEL}">I</span>` : "");

  /* ---------- 지도 그리기: mode = full(섹션 01) | compact(섹션 02) ---------- */
  function mount(el, mode) {
    const L = LAYOUT;
    el.innerHTML = "";
    el.style.setProperty("--ar", `${L.W} / ${L.H}`);
    const svg = svgEl("svg", { viewBox: `0 0 ${L.W} ${L.H}`, class: "ov-svg", "aria-hidden": "true", focusable: "false" }, el);
    const gLead = svgEl("g", { class: "ov-leaders" }, svg);
    const inst = { el, mode, L, svg, paths: {}, nodes: [], photos: [], leaders: [] };

    ["A", "B"].forEach(ev => {
      const P = L[ev], k = ev.toLowerCase();
      const track = svgEl("path", { d: P.d, class: `ov-path ov-path-${k}`, pathLength: 1 }, svg);
      const seg = svgEl("path", { d: P.d, class: `ov-seg ov-seg-${k}`, pathLength: 1 }, svg);
      inst.paths[ev] = { track, seg, len: track.getTotalLength() };
      /* 시각이 기록된 구간 (TIME 기준에서 굵게 겹쳐 보임) */
      const ts = scenes.filter(s => s.event === ev && (s.time || s.timeRange)).map(s => P.t[s.id]).filter(v => v != null);
      if (ts.length) {
        const a = Math.min(...ts), b = Math.max(...ts);
        seg.style.strokeDasharray = `0 ${a} ${Math.max(0.001, b - a)} 2`;
      }
    });

    scenes.forEach(s => {
      const P = L[s.event], t = P.t[s.id];
      if (t == null) return;
      const pt = inst.paths[s.event].track.getPointAtLength(inst.paths[s.event].len * t);
      const x = pt.x, y = pt.y;
      const side = mode === "compact" ? P.compactSide : P.side;

      /* 사진 (큰 지도에서만) */
      if (mode === "full") {
        (L.photos[s.id] || []).forEach(([pid, dx, dy, w, rot]) => {
          const p = photoById(pid);
          if (!p) return;
          const cx = x + dx, cy = y + dy;
          const line = svgEl("line", { x1: x, y1: y, x2: cx, y2: cy, class: `ov-leader ov-leader-${s.event.toLowerCase()}` }, gLead);
          inst.leaders.push({ el: line, scene: s, t });
          const fig = h("figure", `ov-ph ov-ph-${s.event.toLowerCase()}`, el);
          fig.style.left = pct(cx, L.W);
          fig.style.top = pct(cy, L.H);
          fig.style.width = pct(w, L.W);
          fig.style.setProperty("--rot", (rot || 0) + "deg");
          const img = h("img", null, fig);
          img.src = p.file; img.alt = p.alt; img.loading = "lazy"; img.decoding = "async";
          fig.addEventListener("pointerenter", () => hoverOn(s.id));
          fig.addEventListener("pointerleave", () => hoverOff(s.id));
          fig.addEventListener("click", () => set({ selected: state.selected === s.id ? null : s.id }));
          inst.photos.push({ el: fig, scene: s, t });
        });
      }

      /* 장면 점 (버튼: 마우스·터치·키보드 모두 선택 가능) */
      const btn = h("button", `ov-node ov-node-${s.event.toLowerCase()} seg-${s.segment}`, el);
      btn.type = "button";
      btn.style.left = pct(x, L.W);
      btn.style.top = pct(y, L.H);
      btn.setAttribute("aria-label", `사건 ${s.event}, ${s.place}, ${timeLabel(s)}, ${SEG[s.segment]}`);
      btn.innerHTML =
        `<span class="ov-dot" aria-hidden="true"></span>` +
        `<span class="ov-label ov-label--${side}" aria-hidden="true">` +
          `<span class="ov-label-id">${esc(s.id)} · ${esc(timeLabel(s))}</span>` +
          `<span class="ov-label-place">${esc(s.place)}</span>` +
          `<span class="ov-label-tags">` +
            (s.role ? `<span class="ov-label-seg">${esc(s.role)}</span>` : "") +
            (s.segment !== "walk" ? `<span class="ov-label-seg">${esc(SEG[s.segment])}</span>` : "") +
            tagsHTML(s) +
          `</span>` +
          `<span class="ov-label-crit"></span>` +
        `</span>` +
        `<span class="ov-emo" aria-hidden="true"></span>`;
      btn.addEventListener("pointerenter", () => hoverOn(s.id));
      btn.addEventListener("pointerleave", () => hoverOff(s.id));
      btn.addEventListener("focus", () => set({ hover: s.id, hoverSrc: "focus" }));
      btn.addEventListener("blur", () => hoverOff(s.id));
      btn.addEventListener("click", () => set({ selected: state.selected === s.id ? null : s.id }));
      inst.nodes.push({ el: btn, scene: s, t, x, y });
    });

    inst.tip = h("div", "ov-tip", el);
    inst.tip.setAttribute("aria-hidden", "true");
    instances.push(inst);
    return inst;
  }

  /* ---------- 상태를 화면에 반영 ---------- */
  function update(inst) {
    const { hover, selected, criterion } = state;
    const C = criterion && CRITERIA[criterion];
    inst.el.dataset.criterion = criterion || "all";
    inst.el.classList.toggle("has-hover", !!hover);
    inst.el.classList.toggle("has-selected", !!selected);

    const drawn = inst.mode === "full" ? state.drawn : 1;
    ["A", "B"].forEach(ev => { inst.paths[ev].track.style.strokeDashoffset = (1 - drawn).toFixed(4); });

    const sceneState = s => ({
      match: !!C && C.match(s),
      mute: !!C && !C.match(s),
      dim: !!hover && hover !== s.id,
      on: hover === s.id,
      sel: selected === s.id
    });
    const apply = (list, withState) => list.forEach(item => {
      const st = sceneState(item.scene), cl = item.el.classList;
      cl.toggle("is-in", item.t <= drawn + 0.001);
      withState(cl, st, item);
    });

    apply(inst.nodes, (cl, st, n) => {
      cl.toggle("is-match", st.match); cl.toggle("is-mute", st.mute); cl.toggle("is-dim", st.dim);
      cl.toggle("is-hover", st.on); cl.toggle("is-selected", st.sel);
      n.el.setAttribute("aria-pressed", st.sel ? "true" : "false");
      n.el.querySelector(".ov-label-crit").textContent = C ? (st.match ? C.note(n.scene) : C.empty) : "";
      const emo = n.el.querySelector(".ov-emo");
      const k = n.scene.emotion.kind;
      if (criterion === "emotion" && k) {
        emo.style.setProperty("--emo", `var(${D.emotions[k].token})`);
        emo.classList.add("is-on");
      } else emo.classList.remove("is-on");
    });
    apply(inst.photos, (cl, st) => {
      cl.toggle("is-match", st.match); cl.toggle("is-mute", st.mute); cl.toggle("is-dim", st.dim);
      cl.toggle("is-hover", st.on); cl.toggle("is-selected", st.sel);
    });
    apply(inst.leaders, (cl, st) => {
      cl.toggle("is-mute", st.mute || st.dim);
      cl.toggle("is-hover", st.on || st.sel);
    });

    /* 툴팁: 올려놓은 장면의 짧은 기록 */
    const tip = inst.tip;
    const n = hover && inst.nodes.find(x => x.scene.id === hover);
    if (n) {
      const s = n.scene;
      const first = interactionsOf(s).find(i => i.kind === "interaction");
      tip.innerHTML =
        `<span class="ov-tip-id">사건 ${s.event} · ${esc(s.id)} · ${esc(timeLabel(s))}</span>` +
        `<strong>${esc(s.place)}</strong>` +
        (s.role ? `<span class="ov-tip-src">${esc(s.role)}</span>` : "") +
        (s.quote ? `<span class="ov-tip-quote">“${esc(s.quote)}”</span><span class="ov-tip-src">기록된 발화</span>`
                 : first ? `<span class="ov-tip-quote">${esc(first.text)}</span><span class="ov-tip-src">기록된 상호작용</span>` : "") +
        `<span class="ov-tip-src">눌러서 기록 고정</span>`;
      const L = inst.L;
      tip.style.left = pct(n.x, L.W);
      tip.style.top = pct(n.y, L.H);
      tip.classList.toggle("is-left", n.x > L.W * 0.62);
      tip.classList.toggle("is-up", n.y > L.H * 0.55);
      tip.classList.add("is-on");
    } else tip.classList.remove("is-on");
  }

  /* ---------- 장면 기록 (선택하면 고정) ---------- */
  const detailEls = [document.getElementById("ov-detail"), document.getElementById("ov-detail-2")].filter(Boolean);
  function sceneDetail(s) {
    const ph = photosOf(s.id);
    const its = interactionsOf(s);
    const inter = its.filter(i => i.kind === "interaction");
    const personal = its.filter(i => i.kind === "personal");
    const k = s.emotion.kind ? D.emotions[s.emotion.kind] : null;
    const typeLabel = i => i.type ? `${D.interactionTypes[i.type].symbol} ${D.interactionTypes[i.type].label}` : "유형 미분류";
    const unexpected = [s.P ? P_LABEL : null, s.I ? I_LABEL : null].filter(Boolean);
    return `
      <div class="ov-d-head">
        <p class="ov-d-eyebrow"><i class="ov-d-dot ov-d-dot-${s.event.toLowerCase()}"></i>사건 ${s.event} · ${esc(s.id)}</p>
        <button type="button" class="ov-d-close" data-close aria-label="선택 해제">닫기 ×</button>
      </div>
      <h4 class="ov-d-title">${esc(s.place)}</h4>
      ${s.role ? `<p class="ov-d-role">${esc(s.role)}</p>` : ""}
      <dl class="ov-d-facts">
        <div><dt>시각</dt><dd>${esc(timeLabel(s))}<small>${esc(s.timeBasis)}</small></dd></div>
        <div><dt>구간</dt><dd>${esc(SEG[s.segment])}</dd></div>
      </dl>
      ${unexpected.length ? `<p class="ov-d-tags">${unexpected.map(u => `<span>${esc(u)}</span>`).join("")}</p>` : ""}
      ${ph.length
        ? `<div class="ov-d-photos">${ph.map(p => `<img src="${esc(p.file)}" alt="${esc(p.alt)}" loading="lazy">`).join("")}</div>`
        : `<p class="ov-d-empty">이 장면의 사진 기록은 없습니다.</p>`}
      <div class="ov-d-block">
        <h5>회고 · 기록된 발화</h5>
        ${s.quote ? `<blockquote>“${esc(s.quote)}”</blockquote>` : `<p class="ov-d-empty">발화 기록 없음</p>`}
      </div>
      <div class="ov-d-block">
        <h5>분석 분류</h5>
        ${inter.length || personal.length ? `<ul class="ov-d-list">
          ${inter.map(i => `<li><span>${esc(typeLabel(i))}</span>${esc(i.text)}</li>`).join("")}
          ${personal.map(i => `<li class="is-personal"><span>개인 경험 · 집계 제외</span>${esc(i.text)}</li>`).join("")}
        </ul>` : `<p class="ov-d-empty">기록 없음</p>`}
      </div>
      <div class="ov-d-block">
        <h5>감정</h5>
        ${k ? `<p class="ov-d-emo"><i style="--emo:var(${k.token})"></i>${esc(k.label)}${s.emotion.kindStatus ? `<small>${esc(s.emotion.kindStatus)}</small>` : ""}</p>` : `<p class="ov-d-empty">감정 기록 없음</p>`}
        ${hasScore(s) ? `<p class="ov-d-score"><span>방향 · 강도</span>${scaleHTML(s)}</p>` : ""}
      </div>
      <p class="ov-d-evidence">기록 근거 — 사진 ${ph.length}장 · 발화 ${s.quote ? "있음" : "없음"} · 상호작용 ${inter.length}건</p>`;
  }
  function renderDetail() {
    const s = state.selected && scenes.find(x => x.id === state.selected);
    detailEls.forEach(el => {
      el.classList.toggle("is-open", !!s);
      el.innerHTML = s ? sceneDetail(s) : el.dataset.empty || "";
    });
  }
  detailEls.forEach(el => {
    el.dataset.empty = el.innerHTML;
    el.addEventListener("click", e => { if (e.target.closest("[data-close]")) set({ selected: null }); });
  });

  /* ---------- 섹션 02: 기준 선택과 읽기 ---------- */
  const controls = document.getElementById("ov-criteria");
  const readout = document.getElementById("ov-readout");
  if (controls) {
    controls.innerHTML = Object.entries(CRITERIA).map(([key, c]) =>
      `<button type="button" class="ov-crit" data-crit="${key}" aria-pressed="false">` +
        `<span class="ov-crit-no">${c.no}</span><span class="ov-crit-en">${c.en}</span>` +
        `<span class="ov-crit-ko">${c.ko}</span><span class="ov-crit-hint">${c.hint}</span></button>`
    ).join("") +
      `<button type="button" class="ov-crit ov-crit-reset" data-crit="" aria-pressed="true"><span class="ov-crit-no">—</span><span class="ov-crit-en">ALL</span><span class="ov-crit-ko">전체 보기</span><span class="ov-crit-hint">두 경로와 장면</span></button>`;
    controls.addEventListener("click", e => {
      const b = e.target.closest("[data-crit]");
      if (!b) return;
      const key = b.dataset.crit || null;
      set({ criterion: state.criterion === key ? null : key });
    });
  }
  function renderControls() {
    if (!controls) return;
    controls.querySelectorAll("[data-crit]").forEach(b => {
      b.setAttribute("aria-pressed", String((b.dataset.crit || null) === state.criterion));
    });
  }
  function renderReadout() {
    if (!readout) return;
    const c = state.criterion, C = c && CRITERIA[c];
    if (!C) {
      readout.innerHTML =
        `<p class="ov-r-lede">위의 기준 하나를 고르면 두 경로의 장면이 <b>함께</b> 반응합니다. 장면을 누르면 그 기록이 고정됩니다.</p>
         <ul class="ov-r-keys">
           <li><i class="k-walk"></i>걷기 구간의 장면</li>
           <li><i class="k-after"></i>도착 후 (걷기 집계에서 제외)</li>
           <li><span class="ov-tag ov-tag-p">P</span>공간적 예상 밖</li>
           <li><span class="ov-tag ov-tag-i">I</span>상호작용적 예상 밖</li>
         </ul>`;
      return;
    }
    const col = ev => {
      const list = scenes.filter(s => s.event === ev);
      return `<div class="ov-r-col ov-r-col-${ev.toLowerCase()}">
        <p class="ov-r-ev"><i></i>사건 ${ev}</p>
        <ol>${list.map(s => {
          const m = C.match(s);
          const note = c === "emotion" && m
            ? `<span class="ov-r-emo-k"><i style="--emo:var(${D.emotions[s.emotion.kind].token})"></i>${esc(D.emotions[s.emotion.kind].label)}</span>${scaleHTML(s)}`
            : esc(m ? C.note(s) : C.empty);
          return `<li class="${m ? "is-match" : "is-mute"}"><button type="button" data-scene="${s.id}">
            <span class="ov-r-id">${esc(s.id)}</span><span class="ov-r-place">${esc(s.place)}</span>
            <span class="ov-r-note">${note}</span></button></li>`;
        }).join("")}</ol></div>`;
    };
    let extra = "";
    if (c === "time") {
      const B = D.events.B;
      extra = `<div class="ov-r-bars" aria-label="걷기 시간 비교">
        <div class="ov-r-bar ov-r-bar-a"><span class="ov-r-bar-k">A</span><span class="ov-r-bar-track"><i style="width:100%"></i></span><span class="ov-r-bar-v">약 60분 · ${esc(D.events.A.start)} 출발</span></div>
        <div class="ov-r-bar ov-r-bar-b"><span class="ov-r-bar-k">B 계획</span><span class="ov-r-bar-track"><i class="is-plan" style="width:${(B.plannedMinutes / 60 * 100).toFixed(1)}%"></i></span><span class="ov-r-bar-v">${B.plannedMinutes}분</span></div>
        <div class="ov-r-bar ov-r-bar-b"><span class="ov-r-bar-k">B 실제</span><span class="ov-r-bar-track"><i style="width:${(20 / 60 * 100).toFixed(1)}%"></i></span><span class="ov-r-bar-v">약 20분 · ${esc(B.start)}경 – ${esc(B.end)} ${esc(B.endNote)}</span></div>
      </div>`;
    }
    if (c === "emotion") {
      extra = `<ul class="ov-r-emo">${Object.values(D.emotions).map(e => `<li><i style="--emo:var(${e.token})"></i>${esc(e.label)}</li>`).join("")}</ul>`;
    }
    readout.innerHTML =
      `<p class="ov-r-status"><span>데이터 상태</span>${esc(C.status)}</p>${extra}<div class="ov-r-cols">${col("A")}${col("B")}</div>`;
  }
  if (readout) readout.addEventListener("click", e => {
    const b = e.target.closest("[data-scene]");
    if (b) set({ selected: state.selected === b.dataset.scene ? null : b.dataset.scene });
  });

  /* ---------- 스크롤에 따라 경로가 드러남 ---------- */
  const stageFull = document.getElementById("ov-stage");
  function readScroll() {
    lastScroll = performance.now();
    if (state.hover && state.hoverSrc === "pointer") set({ hover: null, hoverSrc: null });
    if (!stageFull) return;
    if (reduceMotion) { if (state.drawn < 1) set({ drawn: 1 }); return; }
    const r = stageFull.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (innerHeight * 0.88 - r.top) / (r.height * 0.75)));
    if (p > state.drawn + 0.004 || (p === 1 && state.drawn < 1)) {
      state.drawn = p;
      instances.forEach(i => { if (i.mode === "full") update(i); });
    }
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("resize", readScroll);

  /* ---------- 글이 화면에 들어올 때 살며시 나타남 ---------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { threshold: 0.18 }) : null;
  root.querySelectorAll("[data-reveal]").forEach(el => { if (io && !reduceMotion) io.observe(el); else el.classList.add("is-in"); });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && (state.selected || state.hover)) set({ selected: null, hover: null, hoverSrc: null });
  });

  if (stageFull) mount(stageFull, "full");
  const compact = document.getElementById("ov-stage-compact");
  if (compact) mount(compact, "compact");
  instances.forEach(update);
  renderDetail(); renderReadout(); renderControls();
  readScroll();
  lastScroll = 0;
})();
