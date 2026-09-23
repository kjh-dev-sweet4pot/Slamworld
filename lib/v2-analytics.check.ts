// 실행: npx tsx lib/v2-analytics.check.ts
import assert from 'node:assert'
import { v2TimeBuckets } from './v2-analytics'

const aug = v2TimeBuckets('monthly', '2026-08')
assert.deepStrictEqual(aug.map(b => b.detail), ['8/1–8/7', '8/8–8/14', '8/15–8/21', '8/22–8/28', '8/29–8/31'])
assert.ok(aug[4].match('2026-08-31') && !aug[4].match('2026-09-01') && !aug[0].match('2026-08-08'))
assert.strictEqual(v2TimeBuckets('monthly', '2026-02').length, 4)
assert.strictEqual(v2TimeBuckets('all', '2026-08').length, 6)
console.log('v2TimeBuckets ok')
