import { format } from 'date-fns'
import { CheckCircle2, XCircle, Clock, RotateCcw, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { QueryHistory as QueryHistoryType } from '@/types'
import { useI18n } from '@/i18n/I18nContext'

interface QueryHistoryProps {
  history: QueryHistoryType[]
  isLoading?: boolean
  onRerun?: (item: QueryHistoryType) => void
}

export function QueryHistory({ history, isLoading = false, onRerun }: QueryHistoryProps) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <Clock className="h-8 w-8 mb-2" />
        <p className="text-sm">{t.queries?.history?.empty || 'No execution history'}</p>
        <p className="text-xs mt-1">{t.queries?.history?.emptyHint || 'Execute a query to see history here'}</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-2">
        {history.map((item) => (
          <div
            key={item.id}
            className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {item.status === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <span className="text-sm font-medium truncate">
                  {item.queryName}
                </span>
              </div>
              {onRerun && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => onRerun(item)}
                  title={t.queries?.history?.rerun || 'Re-run query'}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {item.status === 'success' && item.rowCount !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  {item.rowCount} {t.queries?.history?.rows || 'rows'}
                </Badge>
              )}
              {item.executionTime !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {item.executionTime}ms
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {format(new Date(item.createdAt), 'MM/dd HH:mm:ss')}
              </span>
            </div>

            {item.status === 'error' && item.errorMessage && (
              <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
                {item.errorMessage}
              </div>
            )}

            {Object.keys(item.parameters).length > 0 && (
              <div className="mt-2 text-xs">
                <span className="text-muted-foreground">
                  {t.queries?.history?.params || 'Params'}:{' '}
                </span>
                <span className="text-foreground">
                  {Object.entries(item.parameters)
                    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                    .join(', ')}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
