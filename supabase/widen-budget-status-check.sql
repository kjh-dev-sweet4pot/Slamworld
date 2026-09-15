-- 기존 company_budget_rounds CHECK 를 보딩패스 라벨(입점 논의중, 협의중, 기소진)까지 허용.
-- Slamworld SQL editor에서 한 번 실행. sync 스크립트는 없어도 매핑하지만, 원문 저장용.

ALTER TABLE company_budget_rounds
  DROP CONSTRAINT IF EXISTS company_budget_rounds_deposit_check;
ALTER TABLE company_budget_rounds
  ADD CONSTRAINT company_budget_rounds_deposit_check
  CHECK (deposit_status IN ('입금 완료', '입금 지연', '검토 중', '협의중', '입점 논의중'));

ALTER TABLE company_budget_rounds
  DROP CONSTRAINT IF EXISTS company_budget_rounds_usage_check;
ALTER TABLE company_budget_rounds
  ADD CONSTRAINT company_budget_rounds_usage_check
  CHECK (usage_status IN ('기 소진', '기소진', '가용', '사용 예정', '예상', '예산 협의중', '협의중'));
