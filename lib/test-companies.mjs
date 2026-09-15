/** 보딩패스 운영 목록에서 숨기는 테스트 회원사. 이름·로그인 아이디 공백 제거 후 소문자. */
const TEST_COMPANY_KEYS = new Set([
  '23yearsold',
  'aaa',
  'bbb',
  'brandslam',
  'company',
  'companya',
  'companyb',
  'ddd',
  'eee',
  'knownbeautyalpha',
  'knownbeautybeta',
  'technical',
  'test',
  'wjdghl',
])

function companyKey(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/주식회사/g, '')
    .replace(/\(주\)/g, '')
    .replace(/\s+/g, '')
}

export function isTestCompany(company) {
  if (!company) return false
  const name = companyKey(company.name)
  const login = String(company.login_id || '').trim().toLowerCase()
  return TEST_COMPANY_KEYS.has(name) || TEST_COMPANY_KEYS.has(login)
}
