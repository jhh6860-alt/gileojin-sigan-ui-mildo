/* ==========================================================================
   길어진 시간의 밀도 · 데이터 파일
   --------------------------------------------------------------------------
   사진과 데이터를 바꾸고 싶을 때는 이 파일만 고치면 됩니다.
   - 사진 교체: photos 목록의 file 경로를 바꾸거나, assets/photos 폴더의
     같은 이름 파일을 덮어쓰세요.
   - 값이 확인되지 않은 칸은 null 로 둡니다. 화면에는 '미입력'으로 표시됩니다.
   - 이 파일의 내용은 장면_데이터_시트.xlsx 와 같은 기준입니다.
   ========================================================================== */

window.SITE_DATA = {

  /* 감정 종류 4가지 (색은 css/base.css 의 --emo-1~4 와 연결) */
  emotions: {
    confuse: { label: "당황·혼란·불안",     token: "--emo-1" },
    calm:    { label: "안정·평온",          token: "--emo-2" },
    joy:     { label: "기쁨의 시작·즐거움", token: "--emo-3" },
    content: { label: "만족·행복감",        token: "--emo-4" }
  },

  /* 상호작용 유형 4가지 */
  interactionTypes: {
    move:      { symbol: "△", label: "이동·계획 대화" },
    situation: { symbol: "○", label: "상황·발견 대화" },
    together:  { symbol: "□", label: "공동 행동" },
    share:     { symbol: "♥", label: "감정 공유" }
  },

  /* 구간: walk = 걷기(밀도 집계), after = 도착 후(제외), pending = 시점 확인 필요(보류) */
  events: {
    A: {
      name: "예상 밖의 반전형",
      title: "예상하지 못한 걷기",
      start: "13:10",       startNote: "사용자 제공 · 닫힌 카페에서 출발",
      firstRecord: "13:16", lastRecord: "14:10",
      lastRecordNote: "14:10은 새 카페 사진 시각 (도착 시각 아님)"
    },
    B: {
      name: "과정 몰입형",
      title: "계획된 걷기",
      start: "19:00",  startNote: "사용자 제공 · 19:00경",
      end: "19:20",    endNote: "식당 도착",
      plannedMinutes: 8,
      plannedNote: "계획 도착 19:08은 출발 + 8분으로 계산한 값"
    }
  },

  /* emotion.score: 감정의 방향·강도 (−2~+2, 사용자 회고 값). 부호 = 방향(− 부정 / 0 / + 긍정), 크기 = 강도.
     P: 공간적 예상 밖 / I: 상호작용적 예상 밖 — 사용자가 장면(장소) 단위로 지정. 해당하지 않으면 생략.
     role: 장면의 역할에 대한 사용자 설명 */
  scenes: [
    { id: "A-0", event: "A", order: 0, place: "출발 · 닫힌 카페",  time: "13:10", timeBasis: "사용자 제공 · 출발 시각",
      segment: "walk",  emotion: { kind: "confuse", kindStatus: "", score: -2 },
      P: true, role: "걷기 시작한 계기", quote: "그럼 좀 더 걸어 볼까?" },
    { id: "A-1", event: "A", order: 1, place: "기념품샵",          time: "13:16", timeBasis: "사진 시각",
      segment: "walk",  emotion: { kind: "calm",    kindStatus: "", score: 0 },
      P: true, I: true, quote: "기념품샵 구경은 한 번 해야지!" },
    { id: "A-2", event: "A", order: 2, place: "바다",              time: "13:23", timeBasis: "사진 시각",
      segment: "walk",  emotion: { kind: "joy",     kindStatus: "", score: 2 },
      P: true, I: true, quote: "와 제주도 오고 바다를 제대로 처음 봐!" },
    { id: "A-3", event: "A", order: 3, place: "선글라스 매장",     time: "13:49", timeBasis: "사진 시각",
      segment: "walk",  emotion: { kind: "joy",     kindStatus: "", score: 1 },
      P: true, I: true, quote: "이거 잘 어울려?" },
    { id: "A-4", event: "A", order: 4, place: "새로운 카페",       time: "14:10", timeBasis: "사진 시각 · 도착 시각 아님",
      segment: "after", emotion: { kind: "content", kindStatus: "", score: 2 },
      P: true, quote: "여긴 원래 가려던 카페보다 전망이 좋다!" },

    { id: "B-0", event: "B", order: 0, place: "출발 · 걸어가자는 결정", time: "19:00", timeBasis: "사용자 제공 · 19:00경",
      segment: "walk",    emotion: { kind: "calm",    kindStatus: "", score: 1 },
      quote: "식당이 가까우니까 걸어서 가자" },
    { id: "B-1", event: "B", order: 1, place: "돌담길 · 이동 중",   time: null, timeRange: ["19:00", "19:20"], timeBasis: "사진별 시각 없음 · 순서 기준",
      segment: "walk",    emotion: { kind: "content", kindStatus: "", score: 2 },
      I: true, quote: "와, 이런 길 보니까 제주도 온 느낌 난다." },
    /* 식당 도착 순간과 식당 안을 하나의 장면으로 합침, 구간은 '도착 후'로 확정 (사용자 결정) */
    { id: "B-2", event: "B", order: 2, place: "식당 도착",          time: "19:20", timeBasis: "사용자 제공",
      segment: "after", emotion: { kind: "joy",     kindStatus: "", score: 1 },
      quote: "배고팠긴 한데, 벌써 도착한 게 조금 아쉽다!" }
  ],

  /* kind: interaction = 상호작용(집계 대상) / personal = 개인 경험(집계 제외)
     status: 미검토 / 확정 / 제외  — 사용자 검토 완료로 모두 '확정' */
  interactions: [
    { id: "A0-1", scene: "A-0", type: null,        kind: "interaction", text: "카페가 닫힌 것을 확인하며 나눈 대화", quote: "설마 오늘 문 닫은 거야?", I: null, status: "확정" },
    { id: "A0-2", scene: "A-0", type: "move",      kind: "interaction", text: "계속 걸어 보자는 제안",            quote: "그럼 좀 더 걸어 볼까?",   I: null, status: "확정" },
    { id: "A1-1", scene: "A-1", type: "situation", kind: "interaction", text: "새로운 장소 발견",                   quote: null, I: null, status: "확정" },
    { id: "A1-2", scene: "A-1", type: "together",  kind: "interaction", text: "기념품 함께 구경",                   quote: null, I: null, status: "확정" },
    { id: "A1-3", scene: "A-1", type: "share",     kind: "interaction", text: "마음에 드는 물건 공유",              quote: null, I: null, status: "확정" },
    { id: "A2-1", scene: "A-2", type: "situation", kind: "interaction", text: "바다를 발견하고 감탄",               quote: "와 제주도 오고 바다를 제대로 처음 봐!", I: null, status: "확정" },
    { id: "A2-2", scene: "A-2", type: "together",  kind: "interaction", text: "바다 앞에서 함께 사진 촬영",          quote: null, I: null, status: "확정" },
    { id: "A2-3", scene: "A-2", type: "share",     kind: "interaction", text: "예상치 못한 풍경에 대한 기쁨 공유",   quote: null, I: null, status: "확정" },
    { id: "A3-1", scene: "A-3", type: "situation", kind: "interaction", text: "대형 고양이 인형을 보고 궁금해져서 입장", quote: null, I: null, status: "확정" },
    { id: "A3-2", scene: "A-3", type: "together",  kind: "interaction", text: "선글라스를 써 보며 함께 구경",        quote: null, I: null, status: "확정" },
    { id: "A3-3", scene: "A-3", type: "share",     kind: "interaction", text: "어울림에 대한 반응 공유",            quote: "이거 잘 어울려?", I: null, status: "확정" },
    { id: "A3-4", scene: "A-3", type: "move",      kind: "interaction", text: "새 카페로 가자는 제안",              quote: "여기로 가자", I: null, status: "확정" },
    { id: "A4-1", scene: "A-4", type: "together",  kind: "interaction", text: "음료를 마시며 쉼",                  quote: null, I: null, status: "확정" },
    { id: "A4-2", scene: "A-4", type: "share",     kind: "interaction", text: "만족감 공유",                       quote: "여기 오길 잘했다", I: null, status: "확정" },

    { id: "B0-1", scene: "B-0", type: "move",      kind: "interaction", text: "식당까지 걸어가자는 제안",           quote: "식당이 가까우니까 걸어서 가자", I: null, status: "확정" },
    { id: "B1-1", scene: "B-1", type: "situation", kind: "interaction", text: "제주도스러운 돌담길 발견·감탄",       quote: "와, 이런 길 보니까 제주도 온 느낌 난다.", I: null, status: "확정" },
    { id: "B1-2", scene: "B-1", type: "together",  kind: "interaction", text: "함께 돌담길을 걸으며 구경, 사진 촬영", quote: null, I: null, status: "확정" },
    { id: "B1-3", scene: "B-1", type: "share",     kind: "interaction", text: "제주에 온 느낌 공유",                quote: null, I: null, status: "확정" },
    /* 음악·노을 감상: 사용자 확인으로 개인 경험이 아닌 함께한 경험 (유형은 공동 행동으로 둠) */
    { id: "B1-4", scene: "B-1", type: "together",  kind: "interaction", text: "음악 감상",                         quote: null, I: null, status: "확정" },
    { id: "B1-5", scene: "B-1", type: "together",  kind: "interaction", text: "노을 감상",                         quote: null, I: null, status: "확정" },
    { id: "B2-1", scene: "B-2", type: "share",     kind: "interaction", text: "걷기가 끝나는 아쉬움 공유",           quote: "배고팠긴 한데, 벌써 도착한 게 조금 아쉽다!", I: null, status: "확정" },
    { id: "B2-2", scene: "B-2", type: "together",  kind: "interaction", text: "함께 식사하기",                     quote: null, I: null, status: "확정" }
  ],

  /* 사진: time 은 사진 시각. order 만 있는 사진은 순서 기준으로 배치합니다. */
  photos: [
    { id: "a-souvenir-1", event: "A", scene: "A-1", file: "assets/photos/a-souvenir-1.jpg", time: "13:16", alt: "감귤 모자를 쓴 돌하르방 기념품 진열대" },
    { id: "a-souvenir-2", event: "A", scene: "A-1", file: "assets/photos/a-souvenir-2.jpg", time: "13:16", alt: "기념품샵 거울 앞에서 찍은 사진" },
    { id: "a-sea-1",      event: "A", scene: "A-2", file: "assets/photos/a-sea-1.jpg",      time: "13:23", alt: "현무암 해안 산책로" },
    { id: "a-sea-2",      event: "A", scene: "A-2", file: "assets/photos/a-sea-2.jpg",      time: "13:23", alt: "난간에 기대 바다를 보는 일행의 뒷모습" },
    { id: "a-sea-3",      event: "A", scene: "A-2", file: "assets/photos/a-sea-3.jpg",      time: "13:23", alt: "바다로 이어지는 돌길" },
    { id: "a-sea-4",      event: "A", scene: "A-2", file: "assets/photos/a-sea-4.jpg",      time: "13:23", alt: "검은 현무암과 바다" },
    { id: "a-sunglasses", event: "A", scene: "A-3", file: "assets/photos/a-sunglasses.jpg", time: "13:49", alt: "선글라스 매장의 대형 고양이 조형물" },
    { id: "a-cafe-1",     event: "A", scene: "A-4", file: "assets/photos/a-cafe-1.jpg",     time: "14:10", alt: "새 카페 소파에서 쉬는 모습" },
    { id: "a-cafe-2",     event: "A", scene: "A-4", file: "assets/photos/a-cafe-2.jpg",     time: "14:10", alt: "창살문과 등이 있는 카페 내부" },
    { id: "a-cafe-3",     event: "A", scene: "A-4", file: "assets/photos/a-cafe-3.jpg",     time: "14:10", alt: "바다 앞 카페 테라스의 파라솔" },

    { id: "b-walk-1", event: "B", scene: "B-1", file: "assets/photos/b-walk-1.jpg", order: 1, alt: "붉은 보도 위를 걷는 일행의 뒷모습" },
    { id: "b-walk-2", event: "B", scene: "B-1", file: "assets/photos/b-walk-2.jpg", order: 2, alt: "봉성로 2길 표지판과 볼록거울" },
    { id: "b-walk-3", event: "B", scene: "B-1", file: "assets/photos/b-walk-3.jpg", order: 3, alt: "볼록거울에 비친 일행" },
    { id: "b-walk-4", event: "B", scene: "B-1", file: "assets/photos/b-walk-4.jpg", order: 4, alt: "골목을 함께 걷는 다섯 명의 뒷모습" },
    { id: "b-walk-5", event: "B", scene: "B-1", file: "assets/photos/b-walk-5.jpg", order: 5, alt: "돌담 사이 길을 걷는 세 사람" },
    { id: "b-walk-6", event: "B", scene: "B-1", file: "assets/photos/b-walk-6.jpg", order: 6, alt: "돌담 옆에서 같은 포즈를 한 세 사람" },
    { id: "b-restaurant", event: "B", scene: "B-2", file: "assets/photos/b-restaurant.jpg", time: "19:20", alt: "식당 테이블 위 고기와 반찬" }
  ]
};

/* ==========================================================================
   홈 화면 설정
   - 홈의 길은 실제 이동 경로가 아니라, 두 걷기의 장면을 엮은 개념적인 길입니다.
   - side: "A" 는 진행 방향 왼쪽(낮의 걷기), "B" 는 오른쪽(저녁의 걷기)에 매달립니다.
   - 사진을 바꾸려면 아래 id 를 photos 목록의 다른 id 로 바꾸세요.
   ========================================================================== */
window.SITE_DATA.home = {
  /* 첫 화면에 이미 놓여 있는 두 장 */
  initial: ["a-sea-2", "b-walk-5"],
  /* 스크롤할 때 차례로 쌓이는 여덟 장 (A·B 번갈아) */
  sequence: ["a-souvenir-1", "b-walk-1", "a-sea-4", "b-walk-3", "a-sunglasses", "b-walk-6", "a-cafe-3", "b-restaurant"],
  labels: {
    "a-sea-2":      "A · 13:23 바다",
    "b-walk-5":     "B · 19:00–19:20 돌담길",
    "a-souvenir-1": "A · 13:16 기념품샵",
    "b-walk-1":     "B · 19:00–19:20 이동 중",
    "a-sea-4":      "A · 13:23 바다",
    "b-walk-3":     "B · 19:00–19:20 볼록거울 앞",
    "a-sunglasses": "A · 13:49 선글라스 매장",
    "b-walk-6":     "B · 19:00–19:20 돌담길",
    "a-cafe-3":     "A · 14:10 새로운 카페",
    "b-restaurant": "B · 19:20 식당 도착"
  },
  /* 갈림길에서 각 사건 입구에 겹쳐 놓을 사진 */
  gates: {
    A: ["a-sea-2", "a-sunglasses", "a-cafe-3"],
    B: ["b-walk-1", "b-walk-6", "b-restaurant"]
  }
};
