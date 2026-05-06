import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as ipoApi from '../api/ipo'

export function useIPOList() {
  return useQuery({
    queryKey: ['ipo', 'list'],
    queryFn: ipoApi.getIPOList,
    staleTime: 3600 * 1000, // data stays fresh for 1 hour
    refetchInterval: 3600 * 1000, // background refresh every 1 hour
    refetchOnWindowFocus: false,
  })
}

export function useIPOReminders() {
  return useQuery({
    queryKey: ['ipo', 'reminders'],
    queryFn: ipoApi.getIPOReminders,
  })
}

export function useActiveReminders() {
  return useQuery({
    queryKey: ['ipo', 'reminders', 'active'],
    queryFn: ipoApi.getActiveReminders,
    refetchInterval: 30 * 1000, // 30 seconds
  })
}

export function useAddReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ipoApi.addIPOReminder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ipo', 'reminders'] })
    },
  })
}

export function useRemoveReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ipoApi.removeIPOReminder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ipo', 'reminders'] })
    },
  })
}
