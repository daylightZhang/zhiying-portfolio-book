import { createContext, useContext, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as accountsApi from '../api/accounts'

const ACCOUNT_KEY = 'zhiying_account_id'

// Context for current account ID
export const AccountContext = createContext<{
  accountId: number
  setAccountId: (id: number) => void
}>({ accountId: 1, setAccountId: () => {} })

export function useAccountState() {
  const [accountId, setAccountId] = useState(() => {
    const stored = localStorage.getItem(ACCOUNT_KEY)
    return stored ? parseInt(stored, 10) : 1
  })

  useEffect(() => {
    localStorage.setItem(ACCOUNT_KEY, String(accountId))
  }, [accountId])

  return { accountId, setAccountId }
}

export function useCurrentAccount() {
  return useContext(AccountContext)
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAccounts,
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => accountsApi.createAccount(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => accountsApi.updateAccount(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => accountsApi.deleteAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}
