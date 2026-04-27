import { useQuery } from '@tanstack/react-query'
import * as newsApi from '../api/news'

export function useFlashNews() {
  return useQuery({
    queryKey: ['news', 'flash'],
    queryFn: newsApi.getFlashNews,
    refetchInterval: 30 * 1000,
  })
}
