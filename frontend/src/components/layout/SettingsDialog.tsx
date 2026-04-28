import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { useAccounts, useCurrentAccount, useUpdateAccount } from '../../hooks/useAccount'
import { THEMES, type ThemeId } from '../../hooks/useTheme'
import { useSettings } from '../../hooks/useSettings'

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 30]

interface Props {
  open: boolean
  onClose: () => void
  theme: ThemeId
  onThemeChange: (id: ThemeId) => void
}

export default function SettingsDialog({ open, onClose, theme, onThemeChange }: Props) {
  const { accountId } = useCurrentAccount()
  const { data: accounts } = useAccounts()
  const updateAccount = useUpdateAccount()
  const { settings, update: updateSettings } = useSettings()
  const [accountName, setAccountName] = useState('')
  const [saved, setSaved] = useState(false)

  const currentAccount = accounts?.find(a => a.id === accountId)

  useEffect(() => {
    if (currentAccount) setAccountName(currentAccount.name)
  }, [currentAccount, open])

  if (!open) return null

  const handleSaveName = () => {
    if (!accountName.trim() || accountName.trim() === currentAccount?.name) return
    updateAccount.mutate({ id: accountId, name: accountName.trim() }, {
      onSuccess: () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      },
    })
  }

  const inputClass = 'w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-t-primary outline-none focus:border-accent transition-colors placeholder:text-t-faint'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-bg-card/90 p-6 shadow-2xl border border-border-subtle glass animate-scaleIn" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-t-primary">设置</h2>
          <button onClick={onClose} className="text-t-muted hover:text-t-secondary transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Account Name */}
          <div>
            <label className="block text-xs font-medium text-t-muted mb-2">账户名称</label>
            <div className="flex gap-2">
              <input
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                className={inputClass}
                placeholder="输入账户名称"
              />
              <button
                onClick={handleSaveName}
                disabled={!accountName.trim() || accountName.trim() === currentAccount?.name}
                className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm text-white hover:opacity-90 transition-all disabled:opacity-40"
              >
                {saved ? <Check size={16} /> : '保存'}
              </button>
            </div>
          </div>

          {/* Page Size */}
          <div>
            <label className="block text-xs font-medium text-t-muted mb-2">每页持仓数</label>
            <div className="flex gap-2">
              {PAGE_SIZE_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => updateSettings({ holdingsPageSize: n })}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all border ${
                    settings.holdingsPageSize === n
                      ? 'border-accent bg-accent-bg text-accent'
                      : 'border-border-subtle text-t-muted hover:bg-bg-hover hover:text-t-secondary'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-xs font-medium text-t-muted mb-2">主题</label>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => onThemeChange(t.id)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all border ${
                    theme === t.id
                      ? 'border-accent bg-accent-bg'
                      : 'border-border-subtle hover:bg-bg-hover'
                  }`}
                >
                  <div
                    className="h-8 w-8 shrink-0 rounded-full border border-border-subtle"
                    style={{ background: t.preview }}
                  />
                  <div>
                    <div className={`text-sm font-medium ${theme === t.id ? 'text-accent' : 'text-t-primary'}`}>
                      {t.label}
                    </div>
                    <div className="text-xs text-t-faint">{t.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
