/* ==========================================================================
   시안 비교용 진입점
   - A안/B안, 화면 1/2 전환은 '검토 도구'에서만 쓰는 기능입니다.
   - 최종 사이트에서는 이 파일 대신 실제 스크롤 구성으로 바뀝니다.
   ========================================================================== */
(function () {
  const stage = document.getElementById("stage");
  const state = { variant: "a", screen: "intro" };

  /* 주소 끝의 #a-intro, #b-event 같은 표시로 시작 화면을 고를 수 있습니다 */
  const m = (location.hash || "").match(/^#(a|b)-(intro|event)$/);
  if (m) { state.variant = m[1]; state.screen = m[2]; }

  function render() {
    document.body.dataset.variant = state.variant;
    stage.innerHTML = "";
    if (state.screen === "intro") window.renderIntro(stage, state.variant);
    else window.renderEventB(stage, state.variant);
    document.querySelectorAll("[data-set]").forEach(b => {
      const [k, v] = b.dataset.set.split(":");
      b.setAttribute("aria-pressed", String(state[k] === v));
    });
  }

  document.querySelectorAll("[data-set]").forEach(b => b.addEventListener("click", () => {
    const [k, v] = b.dataset.set.split(":");
    if (state[k] === v) return;
    state[k] = v;
    render();
    window.scrollTo({ top: 0 });
  }));

  render();
})();
