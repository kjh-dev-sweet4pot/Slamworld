# 모바일 점검표 · 수정 시안

대상 폭: 360 / 390 / 768px. 코드 정적 분석 기준(실기기 확인 전). 코드 수정 없음.

## 심각 (화면 넘침·기능 사라짐)

1. `app/owm-report/page.tsx:63` — 표 `min-w-[720px]`. 360·390·768 모두 가로 스크롤 발생.
   - **처리안(OWM 표): `md` 미만은 카드 목록으로 전환.** 카드 = 1행 날짜·지점, 2행 핸들(굵게), 3행 링크(1줄 말줄임), 4행 게시일·조회수(우측). `md` 이상(768)은 현재 표 유지 + `overflow-x-auto`(:62) 스크롤 허용, 첫 열 `sticky left-0`.
2. `app/owm-report/page.tsx:394` — 캘린더 aside `hidden xl:block`. 1280px 미만에서 기간 선택 위젯이 통째로 사라짐(주 클릭 이동 불가).
   - **처리안(캘린더 aside): `xl` 미만은 헤더 아래(본문 상단)로 이동, 기본 접힘.** 접힌 상태 = "기간: {periodText} ▾" 한 줄 버튼, 펼치면 현재 달력(grid-cols-7, :407·:426) 전체 폭 표시. `sticky top-28`(:394)·`w-[232px]`는 `xl:` 접두로만 적용.
3. `app/owm-report/page.tsx:289` — `xl:grid-cols-[232px_minmax(0,1180px)]`. xl 미만은 블록 흐름이라 레이아웃은 안전하나, 2번 처리 후 aside가 위로 쌓이도록 순서 유지 필요.
4. `app/owm-report/page.tsx:304` — 데이터 없을 때 placeholder `hidden xl:block`. 2번 처리 시 모바일 접힘 버튼 자리 스켈레톤으로 교체.
5. `components/SnapshotBar.tsx:130-131` — `w-[320px] shrink-0` 스페이서 + `absolute right-0 w-[320px]` "최근 업로드" 패널. 360·390에선 본문이 40px 이하로 눌리거나 겹침.
   - 처리안: `lg` 미만은 스페이서 숨김, 패널 `static w-full`로 본문 아래 배치(최대 높이 고정 + 내부 스크롤).

## 중간 (줄바꿈·눌림)

6. `app/owm-report/page.tsx:253` — 기간 텍스트 `min-w-[150px]` + 좌우 버튼 34px×2. 360에서 헤더 flex-wrap(:235) 줄이 3줄로 늘어남. 처리안: `min-w-0 sm:min-w-[150px]`, 기간 텍스트 13px.
7. `app/owm-report/page.tsx:86` — 링크 셀 `max-w-[300px] truncate`. 카드 전환 시 `max-w-full`로.
8. `app/owm-report/page.tsx:67,83-95` — 모든 셀 `whitespace-nowrap`. 표 폭 고정 원인. 카드 전환으로 해소.
9. `components/BudgetSnapshot.tsx:763` — `lg:grid-cols-[minmax(180px,1.05fr)_auto_minmax(0,2.2fr)]`. lg 미만 1열은 OK, 768에선 1열이 너무 김. 처리안: `md:grid-cols-2` 중간 단계 추가.
10. `components/BudgetSnapshot.tsx:574, 602, 630` — 단계 칼럼 `sm:w-[148px]`/`sm:w-[168px]` + 제목 `whitespace-nowrap`(:575, :603). 640~768 구간에서 3칸 합 464px + 본문 → 가로 눌림. 처리안: 고정 폭을 `md:`로 올리고 sm에선 `w-full`.
11. `components/BudgetSnapshot.tsx:320-321` — 도넛 `w-[148px]` 고정. 360에서 문제는 없으나 옆 범례(:382 `whitespace-nowrap`)와 같은 줄이면 넘침. 처리안: 모바일은 도넛 위·범례 아래 세로 배치.
12. `components/BudgetSnapshot.tsx:388, 398, 509` — 호버 팝오버 `hidden lg:flex`. 모바일(터치)에선 상세 정보 접근 불가. 처리안: 탭 시 하단 시트 또는 인라인 펼침.
13. `components/BudgetSnapshot.tsx:225, 513` — 호버 브리지 `min-w-[168px]`/`min-w-[140px]`. 12번과 함께 lg 전용이면 무해, 처리 시 같이 정리.
14. `components/BudgetSnapshot.tsx:780` — KPI `grid-cols-2 sm:grid-cols-3`. 360에서 숫자 큰 값 줄바꿈 가능. `num` 폰트 `text-[clamp(...)]` 권장.

## 차트 SVG

15. `components/MonthlyBarChart.tsx:147-149` — `viewBox 0 0 100 100` + `preserveAspectRatio="none"`. 폭에 늘어나 선 두께·점이 찌그러짐. 막대 `max-w-[52px]`(:126), 라벨 `whitespace-nowrap`(:137)로 12개월이면 360에서 라벨 겹침. 처리안: `vector-effect="non-scaling-stroke"`, 모바일은 최근 6개월만 또는 가로 스크롤.
16. `components/MonthlyBarChart.tsx:202` — 범례 `grid-cols-2 sm:grid-cols-5`. OK.
17. `components/LocationMonthlyLineChart.tsx:144-146` — 15번과 동일 구조. 값 라벨 `whitespace-nowrap absolute`(:209)가 좌우 끝에서 잘림. 처리안: 끝 라벨 `left-auto right-0` 정렬, 모바일 라벨 숨김(선택 시만 표시).
18. `components/ChannelDonut.tsx:63` / `components/RegionDonut.tsx:71` — 도넛 `w-[176px] h-[176px]`. 360 카드 내부 폭(~300px)엔 들어감. 범례 nowrap(:105, :113) 확인만.

## 낮음 / 확인만

19. `components/LocationStatus.tsx:290-291` — `owm-table-wrap` 안 표. wrap에 `overflow-x:auto` 있는지 CSS 확인 필요. 없으면 추가.
20. `components/BrandPipeline.tsx:76, 153` — `min-w-[170px]`, `min-w-[250px]` flex 자식. 360에서 줄바꿈되며 1줄 1개. 허용.
21. `components/ContentCard.tsx:115` — `grid-cols-3` 통계. 360 2열 갤러리면 칸당 ~50px로 숫자 잘림. 처리안: 갤러리는 360에서 1열.
22. `app/page.tsx:269, 330` — `grid-cols-1 lg:grid-cols-2`. 모바일 1열 OK. 768은 1열이라 길어짐 → `md:grid-cols-2` 검토(카드 내부 폭 확인 후).
23. `app/page.tsx:221` — 필터 토스트 `fixed left-1/2` 폭 미지정. 긴 지점명이면 360에서 넘침. `max-w-[calc(100vw-2rem)]` 추가.
24. `components/ReportPrint.tsx:112, 190` — 인쇄 전용(`grid-cols-5`). 화면 미노출이면 제외.

## 결정 요약

- OWM 표: **md 미만 카드, md 이상 스크롤 표.**
- 캘린더 aside: **xl 미만 본문 상단으로 이동 + 기본 접힘.**
- 다음 단계: 시안 승인 후 360/390/768 뷰포트 E2E(Playwright) 스냅샷으로 검증.
