import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-t-muted">
      <Loader2 className="animate-spin" size={20} />
      <span>{text}</span>
    </div>
  )
}
