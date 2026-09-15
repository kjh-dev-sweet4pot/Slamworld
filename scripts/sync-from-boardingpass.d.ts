export function runBoardingpassSync(opts?: { apply?: boolean }): Promise<{
  links: number
  mapped: number
  skipped: number
  existing: number
  update: number
  insert: number
  companies: number
  budgetRounds: number
  skippedTestCompanies: number
  photos: number
  photoRows: number
  applied: boolean
  updatedRows?: number
  photosCopied?: number
  photoErrors?: number
}>
