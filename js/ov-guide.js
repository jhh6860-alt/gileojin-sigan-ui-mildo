/* ==========================================================================
   개요 02 · 정보를 바라보는 네 가지 기준 — 기준 안내 (citrus3-overview.html 전용)
   · 기준을 고르면 짧은 설명과 추상 그래픽만 바뀝니다. 장면 상세는 위 섹션에서만.
   · 탭: 클릭 / 좌우·위아래 화살표 / Home·End
   ========================================================================== */
(function () {
  "use strict";
  const root = document.querySelector(".og");
  if (!root) return;
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panel = root.querySelector(".og-panel");
  const q = document.getElementById("og-q"), desc = document.getElementById("og-desc"), look = document.getElementById("og-look");

  const TEXT = {
    time: {
      q: "얼마나, 어디서 길어졌을까?",
      desc: "계획했던 시간과 실제로 걸린 시간의 차이를 봅니다. 시계의 숫자보다, 시간이 늘어난 구간이 어디였는지에 주목합니다.",
      look: "보는 것 · 늘어난 길이 · 늘어난 구간"
    },
    discovery: {
      q: "무엇을 새로 만났을까?",
      desc: "계획에 없던 장소나 풍경을 마주친 순간을 봅니다. 목적지가 바뀌거나 길이 옆으로 넓어진 지점이 단서가 됩니다.",
      look: '보는 것 · <span class="ov-tag ov-tag-p">P</span> 공간적 예상 밖'
    },
    action: {
      q: "무엇을 함께 했을까?",
      desc: "이동하는 동안 함께 한 일을 봅니다. 멈춰 서기, 구경하기, 이야기 나누기처럼 걷는 시간을 채운 행동이 쌓이는 방식에 주목합니다.",
      look: '보는 것 · 공동 행동 · <span class="ov-tag ov-tag-i">I</span> 상호작용적 예상 밖'
    },
    emotion: {
      q: "어떤 마음이었을까?",
      desc: "그 순간 느낀 감정의 종류와 방향(긍정·부정)을 봅니다. 감정은 회고로 기록된 것이며, 행동이 감정을 바꿨다고 단정하지 않습니다.",
      look: "보는 것 · 감정의 종류 · 방향과 강도"
    }
  };

  let current = null, swapTimer = 0;
  function play(k) {
    root.querySelectorAll(".og-g").forEach(g => {
      g.classList.remove("is-play");
      if (g.dataset.g === k) { void g.getBoundingClientRect(); g.classList.add("is-play"); }   // 다시 고를 때도 처음부터
    });
  }
  function select(k, focus) {
    if (k === current) { play(k); return; }
    const first = current === null;
    current = k;
    tabs.forEach(t => {
      const on = t.dataset.k === k;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) { panel.setAttribute("aria-labelledby", t.id); if (focus) t.focus(); }
    });
    panel.dataset.k = k;
    const T = TEXT[k];
    const fill = () => { q.textContent = T.q; desc.textContent = T.desc; look.innerHTML = T.look; panel.classList.remove("is-swap"); };
    clearTimeout(swapTimer);
    if (first) fill();
    else { panel.classList.add("is-swap"); swapTimer = setTimeout(fill, 180); }
    play(k);
  }

  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t.dataset.k));
    t.addEventListener("keydown", e => {
      const n = tabs.length;
      const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      select(tabs[(to + n) % n].dataset.k, true);
    });
  });

  select("time");
  /* 섹션이 화면에 처음 들어올 때 그래픽을 다시 그려 보여 줌 */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) { play(current); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(panel);
  }
})();
