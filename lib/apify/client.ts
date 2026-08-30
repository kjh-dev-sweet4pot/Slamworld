import { ApifyClient } from 'apify-client'

let client: ApifyClient | null = null

export function getApifyClient(): ApifyClient {
  const token = process.env.APIFY_API_TOKEN
  if (!token) throw new Error('APIFY_API_TOKEN is not set in .env')
  if (!client) client = new ApifyClient({ token })
  return client
}

export async function runActor<T extends Record<string, unknown>>(
  actorId: string,
  input: T,
): Promise<Record<string, unknown>[]> {
  const apify = getApifyClient()
  const run = await apify.actor(actorId).call(input, { waitSecs: 600 })
  const { items } = await apify.dataset(run.defaultDatasetId).listItems({ limit: 5000 })
  return items as Record<string, unknown>[]
}
