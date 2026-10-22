/**
 * 협상 진행중 인플루언서 — 신청 폼 응답 기준 수기 관리 (보딩패스 배정 전 단계)
 * 연락처·계좌 등 개인정보는 넣지 않는다 (클라이언트 번들에 포함됨)
 */
export interface Negotiation {
  influencer_name: string
  /** 희망 방문일 (폼 응답 원문 요약) */
  date_text?: string
  tiktok?: string
  instagram?: string
  store?: string
  memo?: string
  /** 출처 구분 (폼 신청 · 시트 탭) */
  group?: string
  /** 샤오홍슈 등 프로필 링크 */
  url?: string
  followers?: number
}

const n = (
  influencer_name: string,
  date_text: string,
  tiktok?: string,
  instagram?: string,
  extra: Partial<Negotiation> = {},
): Negotiation => ({ influencer_name, date_text, tiktok, instagram, group: '폼 신청', ...extra })

export const NEGOTIATIONS: Negotiation[] = [
  n('Ines Wallmen', '9/29 20시', 'lifeofines_', 'life.of.ines_'),
  n('DAHAL RABINA', '9/26', 'rabinadahaal', 'rabinadahaal_'),
  n('KONDTASHEVA POLINA', '9/22', undefined, 'poluuuna__'),
  n('MIKHAILOVA REGINA', '9/24', 'reginamalina'),
  n('Khatri Amisha', '9/21', 'as.at05', 'amishakhatri68'),
  n('Cerys Anne Williams', '10/10', 'haeuneelife', '__ceryswilliams__'),
  n('SAMOL VIBOLMONYVAN', '9/23', 'glowwith_mona', 'glowwith_mona'),
  n('Sara Ambre CHEKROUNE', '9/25, 9/26', 'ml.naraa'),
  n('Kunwar Reshma', '10/12', 'babyglamgirl0', 'reshmakunwarchhetri'),
  n('BHATIA SANSKRITI', '9/23, 9/28, 9/30', 'sansverse111', 'sansxverse'),
  n('Asia Andrea Piccinini', '10/12, 10/14, 10/16', 'i.am.pich0610'),
  n('Mimi', '10/7, 10/9, 10/14~16', 'mimi.alxt', undefined, { memo: 'TikTok 게시' }),
  n('Kumari Priti', '9/30', 'ipritii_', 'ipritii_'),
  n('ASHA EVANGELINE SUJATA RAJ', '9/26, 10/4, 10/17~18, 10/25', 'evangelineasha'),
  n('PAVLOVA MARIIA', '10/2', 'maria_ria_a', 'mariluna0405a'),
  n('lauren nunez', '10/30 이전 15~23시', 'laurenbrittany', 'laurennbrittany'),
  n('Tanisha Wognin', '9/29~10/3', 'teeniesha', 'teenieshe'),
  n('Davoodabadifarahani Mobina', '10/13~15', 'b.inseoul', 'abarbanoo'),
  n('Hannah McHutchison', '10/15', 'hannahmchutchison', 'hannahmchutchison'),
  n('Rupal Sharma', '10/22~25', undefined, '_mymeanderingmind_'),
  n('Josefin Tae', '10/29', 'josefintae', 'josefintae'),
  n('Mariia Nilsson', '10/12~16', 'meloumasha', 'melou.beauty'),
  n('Maile Kai Campagna', '10/5~11', 'mailecampagna', 'maile.campagna'),
  n('Begimai Oskonbaeva', '10/11, 10/14, 10/18', 'osk.bema', 'osk.bm', { memo: 'XHS 계정 있음' }),
  n('Rachel Rae', '10/13, 10/15~17', 'rachelrrae_', 'rachelrrae_'),
  n('Nazmiye Iskıncı', '10/16', 'naziskincii', 'naziskincii'),
  n('Nozima Odilova', '10/24', 'tcaitwng', 'tcaitwng'),
  n('SAH Anjali Kumari', '미정', 'anjalii714', 'anjali92231'),
  n('Ana Tabatadze', '10/5, 10/7, 10/9, 10/12', 'go.go.na', 'go.anaa_'),
  n('harukannade', '10/5, 10/9', 'harukannade', undefined, { memo: 'TikTok만 게시' }),
  n('Sune Brink', '10/24', 'sunaynay1', 'sunaynay1', { store: '북촌점' }),
  n('VIDYA JENNIFER', '10/24', 'jennifervidya', 'jennifervidya', { store: '북촌점' }),
  n('stephanie', '10/20', 'milcheese', 'milcheese'),
]
