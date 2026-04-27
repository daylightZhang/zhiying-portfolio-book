import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, History, Plus, Trash2, ChevronDown, Settings } from 'lucide-react'
import ConfirmDialog from '../common/ConfirmDialog'
import type { ThemeId } from '../../hooks/useTheme'
import { useAccounts, useCurrentAccount, useCreateAccount, useDeleteAccount } from '../../hooks/useAccount'

const links = [
  { to: '/', icon: LayoutDashboard, label: '总览' },
  { to: '/holdings', icon: Briefcase, label: '持仓' },
  { to: '/history', icon: History, label: '记录' },
]

interface Props {
  theme: ThemeId
  onThemeChange: (id: ThemeId) => void
  onOpenSettings: () => void
}

export default function Sidebar({ theme, onThemeChange, onOpenSettings }: Props) {
  const { accountId, setAccountId } = useCurrentAccount()
  const { data: accounts } = useAccounts()
  const createAccount = useCreateAccount()
  const deleteAccount = useDeleteAccount()
  const [showDropdown, setShowDropdown] = useState(false)
  const [newName, setNewName] = useState('')
  const [showNewInput, setShowNewInput] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const currentAccount = accounts?.find(a => a.id === accountId)
  const deletingAccount = accounts?.find(a => a.id === deletingId)

  const handleCreate = () => {
    if (!newName.trim()) return
    createAccount.mutate(newName.trim(), {
      onSuccess: (account) => {
        setAccountId(account.id)
        setNewName('')
        setShowNewInput(false)
        setShowDropdown(false)
      },
    })
  }

  const handleDeleteClick = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (accounts && accounts.length <= 1) return
    setDeletingId(id)
    setShowDropdown(false)
  }

  const handleDeleteConfirm = () => {
    if (deletingId === null) return
    deleteAccount.mutate(deletingId, {
      onSuccess: () => {
        if (accountId === deletingId) {
          const remaining = accounts?.filter(a => a.id !== deletingId)
          if (remaining?.length) setAccountId(remaining[0].id)
        }
        setDeletingId(null)
      },
    })
  }

  return (
    <>
    <aside className="fixed left-0 top-0 z-40 flex h-full w-56 flex-col border-r border-border bg-bg-card/80 glass">
      <div className="flex items-center gap-3 px-5 py-5">
        <img src="/logo.png" alt="知盈" className="h-9 w-9 rounded-lg" />
        <div>
          <h1 className="text-lg font-bold text-t-primary">知盈</h1>
          <p className="text-[11px] text-t-faint">投资账本</p>
        </div>
      </div>

      {/* Account Selector */}
      <div className="px-3 mb-2 relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between rounded-lg border border-border-subtle bg-bg-hover px-3 py-2 text-sm text-t-primary hover:border-accent/50 transition-colors"
        >
          <span className="truncate">{currentAccount?.name || '选择账户'}</span>
          <ChevronDown size={14} className={`text-t-faint transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <div className="absolute left-3 right-3 top-full mt-1 rounded-xl border border-border-subtle bg-bg-card/95 shadow-xl glass z-50 animate-fadeIn overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {accounts?.map(a => (
                <div
                  key={a.id}
                  onClick={() => { setAccountId(a.id); setShowDropdown(false) }}
                  className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
                    a.id === accountId ? 'bg-accent-bg text-accent' : 'text-t-secondary hover:bg-bg-hover'
                  }`}
                >
                  <span className="truncate">{a.name}</span>
                  {accounts.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteClick(a.id, e)}
                      className="text-t-faint hover:text-loss shrink-0 ml-2"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-border-subtle p-2">
              {showNewInput ? (
                <div className="flex gap-1.5">
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    placeholder="账户名称"
                    autoFocus
                    className="flex-1 rounded-md border border-border bg-input-bg px-2 py-1 text-xs text-t-primary outline-none focus:border-accent"
                  />
                  <button onClick={handleCreate} className="rounded-md bg-accent px-2 py-1 text-xs text-white hover:opacity-90">
                    确定
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewInput(true)}
                  className="flex items-center gap-1.5 w-full rounded-md px-2 py-1.5 text-xs text-t-muted hover:bg-bg-hover hover:text-accent transition-colors"
                >
                  <Plus size={13} />
                  新建账户
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <nav className="mt-2 flex-1 px-3">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-1 ${
                isActive
                  ? 'bg-accent-bg text-accent'
                  : 'text-t-muted hover:bg-bg-hover hover:text-t-secondary'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border-subtle px-3 py-3">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-t-muted hover:bg-bg-hover hover:text-t-secondary transition-colors"
        >
          <Settings size={16} />
          <span>设置</span>
        </button>
      </div>

    </aside>

    <ConfirmDialog
      open={deletingId !== null}
      title="删除账户"
      message={`确定要删除账户「${deletingAccount?.name}」吗？该账户下所有持仓、交易记录和现金余额将被永久删除，此操作不可恢复。`}
      onConfirm={handleDeleteConfirm}
      onCancel={() => setDeletingId(null)}
      confirmLabel="确认删除"
      danger
    />
    </>
  )
}
