-- Slamworld SQL editor에서 한 번 실행.
-- 성과(contents)는 그대로 두고, 보딩패스 companies / company_budget_rounds 를 받을 테이블만 추가.
-- 금액은 원. 화면 만원 = amount_krw / 10000.
-- 비밀번호·이메일은 가져오지 않음.

CREATE TABLE IF NOT EXISTS companies (
  id                UUID PRIMARY KEY,
  name              TEXT NOT NULL,
  login_id          TEXT,
  aliases           TEXT[] NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  contract_stage    TEXT,
  budget_amount     BIGINT,
  spent_amount      BIGINT,
  first_meet_on     DATE,
  planned_start_on  DATE,
  planned_end_on    DATE,
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_budget_rounds (
  id              UUID PRIMARY KEY,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL,
  label           TEXT,
  period_month    DATE NOT NULL,
  amount_krw      BIGINT,
  deposit_status  TEXT NOT NULL,
  usage_status    TEXT NOT NULL,
  kind            TEXT NOT NULL DEFAULT '입금',
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_budget_rounds_kind_check
    CHECK (kind IN ('입금', '사용')),
  CONSTRAINT company_budget_rounds_deposit_check
    CHECK (deposit_status IN ('입금 완료', '입금 지연', '검토 중', '협의중', '입점 논의중')),
  CONSTRAINT company_budget_rounds_usage_check
    CHECK (usage_status IN ('기 소진', '기소진', '가용', '사용 예정', '예상', '예산 협의중', '협의중'))
);

CREATE INDEX IF NOT EXISTS idx_budget_rounds_company ON company_budget_rounds(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_rounds_month ON company_budget_rounds(period_month);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_budget_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read" ON companies;
DROP POLICY IF EXISTS "public read" ON company_budget_rounds;
CREATE POLICY "public read" ON companies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read" ON company_budget_rounds FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON companies TO anon, authenticated;
GRANT SELECT ON company_budget_rounds TO anon, authenticated;
