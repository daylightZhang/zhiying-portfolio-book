import client from './client'

export interface FlashItem {
  id: string
  time: string
  type: number
  data: {
    content?: string
    name?: string
    actual?: number
    previous?: string
    consensus?: string | null
    country?: string
    star?: number
    unit?: string
    pic?: string
    title?: string
    source?: string
    link?: string
  }
  important: number
  channel: number[]
}

export async function getFlashNews(): Promise<FlashItem[]> {
  const { data } = await client.get('/news/flash')
  return data
}
