'use client'

import ChangelogBadge from './ChangelogModal'

interface HeaderV2Props {
  collectedLabel?: string
  partnerBrand?: string | null
  locationCount?: number
  onPrintPdf?: () => void
  onDownloadExcel?: () => void
  onLogout?: () => void
}

export default function HeaderV2({
  collectedLabel = '08.31 수집 기준 · 자동 수집 · 다음 09.30',
  partnerBrand,
  locationCount,
  onPrintPdf,
  onDownloadExcel,
  onLogout,
}: HeaderV2Props) {
  return (
    <header className="sticky top-0 z-50 flex items-center gap-4 px-4 sm:px-10 py-3.5 bg-white border-b border-[#f0e6d2]">
      <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3.5">
        <div className="flex items-center gap-3.5">
          <span className="text-lg sm:text-[19px] font-extrabold text-[#1a1d2e]">
            {partnerBrand ? `${partnerBrand} 인플루언서 리포트` : 'SLAM 인플루언서 리포트'}
          </span>
          <ChangelogBadge className="text-[11px] font-bold text-[#3557d6] bg-[#eef2ff] px-2 py-1 rounded-full" />
        </div>
        <div className="text-[12px] text-[#6b6558]">
          {collectedLabel}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3.5">
        <span className="hidden sm:inline-flex text-[12px] text-[#5f5a4e] bg-[#f6f0e3] rounded-full px-2.5 py-[5px]">
          {locationCount !== undefined ? `${locationCount}개 지점` : '8개 지점'}
        </span>
        {onPrintPdf && (
          <button
            type="button"
            onClick={onPrintPdf}
            className="text-[13px] font-bold text-[#1a1d2e] bg-white hover:bg-[#faf7f0] border border-[#e3d9c4] rounded-[6px] px-3.5 py-[9px] transition-colors"
          >
            PDF 저장
          </button>
        )}
        {onDownloadExcel && (
          <button
            type="button"
            onClick={onDownloadExcel}
            className="text-[13px] font-bold text-white bg-[#1f7a4d] hover:bg-[#19663f] rounded-[6px] px-3.5 py-2.5 transition-colors"
          >
            엑셀 저장
          </button>
        )}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="text-[13px] font-medium text-[#6b6558] hover:text-[#1a1d2e] bg-transparent px-1.5 py-[9px] transition-colors"
          >
            로그아웃
          </button>
        )}
      </div>
    </header>
  )
}
