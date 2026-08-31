# OWM 인플루언서 마케팅 리포트

Next.js 15 + Supabase 기반 캠페인 성과 대시보드

---

## 실행 순서

### 1. Supabase 세팅

1. [supabase.com](https://supabase.com) → New Project 생성
2. **SQL Editor** 에서 아래 순서로 실행:
   ```
   supabase/schema.sql   ← 테이블·뷰·인덱스 생성
   supabase/seed.sql     ← 329행 실데이터 INSERT
   ```
3. **Authentication → Users** 에서 클라이언트 계정 생성
   - ex) `client@owm.com` / 비밀번호 설정
4. **Project Settings → API** 에서 URL과 anon key 복사

### 2. 환경변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 편집:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. 로컬 실행

```bash
npm install
npm run dev
```

→ http://localhost:3000 에서 확인

---

## 파일 구조

```
owm-report/
├── app/
│   ├── page.tsx              # 메인 대시보드
│   ├── login/page.tsx        # 로그인 게이트
│   ├── api/
│   │   ├── summary/route.ts  # 스냅샷 + 지점 + 월별 집계
│   │   └── contents/route.ts # 콘텐츠 목록 (필터·정렬)
│   └── globals.css
├── components/
│   ├── SnapshotBar.tsx       # 상단 4개 수치
│   └── ContentCard.tsx       # 인플루언서 카드
├── lib/
│   ├── supabase.ts           # 브라우저·서버 클라이언트
│   └── types.ts              # TypeScript 타입
└── supabase/
    ├── schema.sql            # 테이블 + 뷰 + RLS
    └── seed.sql              # 실데이터 329행
```

---

## DB 테이블 구조 (contents)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| campaign | text | 명동오픈_0811 / 남포오픈 / 신사메가_6월 등 |
| location | text | 명동점 / 남포점 / 신사점 / 이태원점 등 |
| channel | text | 샤오홍슈 / 인스타그램 / 틱톡 / 도우인 / 웨이보 |
| influencer_name | text | 인플루언서 이름 |
| is_press | boolean | 기자단 여부 |
| views | integer | 실측 조회수 (없으면 NULL) |
| views_estimated | integer | 추정 조회수 (캘리브레이션 후 입력) |
| views_source | text | measured / estimated / none |
| likes | integer | 좋아요 |
| saves | integer | 저장 |
| comments | integer | 댓글 |

### 성과 등급 계산 (뷰: contents_with_performance)
캠페인 내 상호작용(좋아요+저장+댓글) 중앙값 기준:
- `high`: 중앙값 × 1.2 이상
- `mid`: 중앙값 × 0.8 ~ 1.2
- `low`: 중앙값 × 0.8 미만

### 샤오홍슈 추정 조회수 (역산)

샤오홍슈는 플랫폼이 조회수를 제공하지 않습니다. 좋아요·저장·댓글·공유(크롤러 미수집 시 0)로 **역산**하며, 결과는 `views_estimated` / `views_est_low` / `views_est_high`에 저장됩니다.

#### 1. Total Engagement Model

```
Total Interactions = likedCount + collectedCount + commentsCount + shareCount
Estimated Views  = Total Interactions / R_eng
```

| 콘텐츠 유형 | R_eng (인터랙션율) |
|---|---|
| 일반 이미지/피드 | 3.5% ~ 4.5% |
| 정보성/가이드 피드 **(방문형 캠페인 기본)** | **2.0% ~ 2.6%** (명동 캘리브 n=4) |
| 숏폼 동영상 | 2.0% ~ 3.0% |

`shareCount`가 크롤러에서 누락(0/null)이면 **R_eng에서 0.5%p 차감**합니다.

**점 추정값**은 Total Engagement Model을 사용합니다 (상호작용 합에 단조 증가).

#### 2. Component-Weighted Model (참고·백테스트용)

```
Estimated Views = (likedCount/r_like)×w1 + (collectedCount/r_collect)×w2
                + (commentsCount/r_comment)×w3 + (shareCount/r_share)×w4
```

| 지표 | 전환율 r | 가중치 w |
|---|---|---|
| 좋아요 | 2.5% | 0.45 |
| 저장 | 1.5% | 0.35 |
| 댓글 | 0.2% | 0.15 |
| 공유 | 0.1% | 0.05 |

공유 미수집 시 w₄=0, 나머지 가중치를 비율 재분배합니다.

#### 적용 방법

```bash
# DB 일괄 역산 (샤오홍슈 전 행, 인스타 URL 오분류 실측 제거 포함)
npm run estimate-xhs-views

# 미리보기
npm run estimate-xhs-views -- --dry-run
```

Apify `sync-metrics` 실행 시 샤오홍슈 행은 지표 수집 직후 자동 역산됩니다.  
구현: `lib/xhs-view-estimate.ts`

#### 정확도

**구조적 불확실성 (R_eng 밴드)**  
캘리브레이션 R_eng 2.0~2.6% (공유 미수집 시 1.5~2.1%)를 쓰면, 동일 상호작용에 대해 추정 조회수가 약 **±15%** 범위로 변합니다. `views_est_low` / `views_est_high`가 이 밴드를 반영합니다.

**캘리브레이션 백테스트 (n=4, 인플루언서 자가 신고 조회수)**

| 모델 | MAPE |
|---|---|
| **Total Engagement (점 추정)** | **32.6%** |
| Component-Weighted | 55.8% |
| Blended | 14.6% |
| 구간 [low–high] 적중 | 25% (1/4) |
| (참고) 구 방식 interaction×41 | **13.2%** |

```bash
npm run estimate-xhs-accuracy   # MAPE만 출력 (DB 불필요)
npm run estimate-xhs-views -- --dry-run
```

**해석**  
초기 4건 캘리브에서 실측 조회 대비 인터랙션 비율이 약 **2.3%**였습니다. 가이드 기본값 7%를 쓰면 점 추정이 실측보다 낮고, 좋아요 순서와 조회수 순서가 뒤집힐 수 있습니다. 채널이 샤오홍슈인데 `instagram.com` URL인 행은 인스타 실측 조회수를 제거하고 역산만 씁니다.

**운영 권장**
- 방문형 가이드 콘텐츠 → 현재 기본값 `contentType: 'guide'` 유지
- 샤오홍슈 전용 자가 신고 조회수가 쌓이면 `XHS_CALIBRATION_SAMPLES`를 갱신해 MAPE 재산출
- 대시보드에는 `views_estimated`와 함께 `views_est_low`~`high` 구간을 보면 구조적 오차를 함께 판단
