export function runBoardingpassSync(opts?: { apply?: boolean }): Promise<{
  links: number
  mapped: number
  skipped: number
  existing: number
  update: number
  insert: number
  applied: boolean
  updatedRows?: number
}>
