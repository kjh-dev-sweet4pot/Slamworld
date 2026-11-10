# 모바일 현황 진단 (대시보드 `/` · 리포트 `/owm-report`)

기준 폭: 375 / 390 / 360px. E2E: `e2e/mobile-audit.spec.ts`
스크린샷: `test-results/audit/{route}-{project}.png` (+ `-full.png`)

담당 id는 추정 배정임 (t3 리포트, t4 기간 탐색·달력, t5 대시보드 카드, t6 터치·스크롤).

| # | 파일:줄 | 의심 지점 | 영향 | 담당 | 조치 |
|---|---|---|---|---|---|
| 1 | app/owm-report/page.tsx:63 | table `min-w-[720px]` | 표 가로 스크롤 필수 | t3 | 보류 (리포트 미수정) |
| 2 | app/owm-report/page.tsx:253 | 기간 라벨 `min-w-[150px]` + 버튼 2개 | 좁은 폭 줄 넘침 | t3 | 보류 (리포트 미수정) |
| 3 | app/owm-report/page.tsx:289 | `xl` 2단 그리드 + 사이드 목차 | 모바일에서 목차 위치·노출 확인 | t3 | 보류 (리포트 미수정) |
| 4 | app/owm-report/page.tsx:181 | `md:grid-cols-[280px_…]` 2단 | 태블릿 경계 폭 압박 | t3 | 보류 (리포트 미수정) |
| 5 | components/v2/PeriodNavV2.tsx:122·196·243 | `min-w-[200px]` / `sm:min-w-[230px]` | 화살표와 합쳐 360px 초과 위험 | t4 | 조치됨 (t5, sm 미만 min-w-0·truncate) |
| 6 | components/owm/VisitCalendar.tsx:122 | `grid-cols-[repeat(7,…)_minmax(84px,120px)]` | 7칸이 매우 좁아짐 | t4 | 조치됨 (t6, calendar-cells) |
| 7 | components/v2/PopularContentSection.tsx:119 | 행 그리드 `28px_1fr_68px_72px` | 제목 칸 과소 | t5 | 조치됨 (t6, 모바일 2열 그리드) |
| 8 | components/BrandPipeline.tsx:153 | `min-w-[250px]` 문단 | flex 줄 넘침 | t5 | 조치됨 (t5, 모바일 basis-full) |
| 9 | components/BudgetSnapshot.tsx:225 | hover 전용 툴팁 (`owm-hover-bridge-y`, 168px) | 터치로 못 엶 | t6 | 보류 (hover 방식 유지) |
| 10 | components/BudgetSnapshot.tsx:513 | hover 전용 툴팁 (140px) | 터치로 못 엶 | t6 | 보류 (hover 방식 유지) |
| 11 | components/v2/UpcomingVisitsCard.tsx:281 | `max-h-[640px] overflow-y-auto` | 세로 스크롤 중첩 | t6 | 조치됨 (t6, sm 이상만 내부 스크롤) |

## 실행
```
E2E_FULL_PW=... npx playwright test e2e/mobile-audit.spec.ts
```
넘침 요소 목록은 콘솔 `[audit]` 줄과 리포트 첨부 `wide-*.json`에 남음.
