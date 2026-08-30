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

### 샤오홍슈 추정 조회수 업데이트 방법
```sql
-- 캘리브레이션 배수를 구한 뒤 일괄 업데이트
UPDATE contents
SET
  views_estimated = (COALESCE(likes,0) + COALESCE(saves,0) + COALESCE(comments,0)) * 41,
  views_est_low   = (COALESCE(likes,0) + COALESCE(saves,0) + COALESCE(comments,0)) * 37,
  views_est_high  = (COALESCE(likes,0) + COALESCE(saves,0) + COALESCE(comments,0)) * 58,
  views_source    = 'estimated'
WHERE channel = '샤오홍슈'
  AND views IS NULL
  AND (likes IS NOT NULL OR saves IS NOT NULL);
```
배수는 캘리브레이션 시트에서 나온 값으로 교체하세요 (현재 41/37/58은 명동 4건 기준 추정치).
