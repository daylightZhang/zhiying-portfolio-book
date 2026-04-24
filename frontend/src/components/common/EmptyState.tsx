import { PackageOpen } from 'lucide-react'

interface Props {
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-t-muted">
      <PackageOpen size={48} className="mb-4 opacity-50" />
      <p className="text-lg font-medium">{title}</p>
      {description && <p className="mt-1 text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
