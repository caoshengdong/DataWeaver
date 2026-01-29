import { Database, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/I18nContext'
import type { DataSource } from '@/types'

interface DataSourceCardProps {
  dataSource: DataSource
  isSelected?: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

const DB_ICONS: Record<string, React.ReactNode> = {
  mysql: <Database className="h-4 w-4 text-blue-500" />,
  postgresql: <Database className="h-4 w-4 text-blue-600" />,
  sqlserver: <Database className="h-4 w-4 text-red-500" />,
  oracle: <Database className="h-4 w-4 text-red-600" />,
}

const STATUS_COLORS = {
  active: {
    dot: 'bg-green-500',
    text: 'text-green-700 dark:text-green-400',
  },
  inactive: {
    dot: 'bg-gray-400',
    text: 'text-gray-600 dark:text-gray-400',
  },
  error: {
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-400',
  },
}

export function DataSourceCard({
  dataSource,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
}: DataSourceCardProps) {
  const { t } = useI18n()
  const statusColors = STATUS_COLORS[dataSource.status]
  const statusText = t.dataSources.status[dataSource.status]

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card p-4 cursor-pointer',
        'transition-all duration-200 ease-out',
        'hover:shadow-sm hover:border-border/80',
        'active:scale-[0.99] motion-reduce:active:scale-100',
        isSelected
          ? 'border-primary/60 bg-primary/[0.04] dark:bg-primary/[0.06] shadow-sm'
          : 'hover:bg-muted/40'
      )}
      onClick={onSelect}
    >
      {/* Left accent bar for selected state */}
      {isSelected && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-primary" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div className="mt-0.5" aria-hidden="true">{DB_ICONS[dataSource.type]}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-medium text-sm truncate",
              isSelected && "text-primary"
            )}>{dataSource.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              {dataSource.type}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {dataSource.host}:{dataSource.port}
            </p>
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
              aria-label={t.common.moreOptions}
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {t.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2 mt-3">
        <div className={cn('h-2 w-2 rounded-full', statusColors.dot)} />
        <span className={cn('text-xs font-medium', statusColors.text)}>
          {statusText}
        </span>
      </div>

      {/* Description if available */}
      {dataSource.description && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          {dataSource.description}
        </p>
      )}
    </div>
  )
}
