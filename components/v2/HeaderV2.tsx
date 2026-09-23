'use client'

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
    <header className="sticky top-0 z-50 flex items-center gap-4 px-4 sm:px-7 py-4 bg-white/75 border-b border-[#f0e6d2] backdrop-blur-md">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-[20px] font-extrabold tracking-tight text-[#1a1d2e]">
            {partnerBrand ? `${partnerBrand} 인플루언서 리포트` : 'SLAM 인플루언서 리포트'}
          </span>
          <span className="text-[11px] font-bold text-[#2f5fd8] bg-[#eef3ff] px-2.5 py-1 rounded-[9px]">
            v1.0.0
          </span>
        </div>
        <div className="text-[11.5px] text-[#8b8578] mt-1">
          {collectedLabel}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden sm:inline-flex text-[12px] font-semibold text-[#6b6558] bg-white border border-[#efe7d6] rounded-[20px] px-3.5 py-2">
          {locationCount !== undefined ? `${locationCount}개 지점` : '8개 지점'}
        </span>
        {onPrintPdf && (
          <button
            type="button"
            onClick={onPrintPdf}
            className="text-[12px] font-semibold text-[#6b6558] hover:text-[#1a1d2e] bg-white hover:bg-[#faf7f0] border border-[#efe7d6] rounded-[20px] px-3.5 py-2 transition-colors"
          >
            PDF 저장
          </button>
        )}
        {onDownloadExcel && (
          <button
            type="button"
            onClick={onDownloadExcel}
            className="text-[12px] font-semibold text-[#6b6558] hover:text-[#1a1d2e] bg-white hover:bg-[#faf7f0] border border-[#efe7d6] rounded-[20px] px-3.5 py-2 transition-colors"
          >
            엑셀 저장
          </button>
        )}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="text-[12px] font-semibold text-[#6b6558] hover:text-[#1a1d2e] bg-white hover:bg-[#faf7f0] border border-[#efe7d6] rounded-[20px] px-3.5 py-2 transition-colors"
          >
            로그아웃
          </button>
        )}
      </div>
    </header>
  )
}
