import { useState, useMemo, useCallback } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Database,
  Table as TableIcon,
  Search,
  Key,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { DataSource, TableInfo, ColumnInfo } from '@/types'
import { useI18n } from '@/i18n/I18nContext'

interface SchemaExplorerProps {
  dataSources: DataSource[]
  selectedDataSourceId?: string
  onSelectDataSource: (id: string) => void
  tables: TableInfo[]
  isLoadingTables: boolean
  onTableClick?: (table: TableInfo) => void
  onColumnClick?: (table: TableInfo, column: ColumnInfo) => void
}

// Get icon for column type
function getColumnTypeIcon(type: string) {
  const lowerType = type.toLowerCase()

  if (lowerType.includes('int') || lowerType.includes('decimal') || lowerType.includes('float') || lowerType.includes('numeric')) {
    return <Hash className="h-3 w-3" />
  }
  if (lowerType.includes('date') || lowerType.includes('time')) {
    return <Calendar className="h-3 w-3" />
  }
  if (lowerType.includes('bool')) {
    return <ToggleLeft className="h-3 w-3" />
  }
  return <Type className="h-3 w-3" />
}

// Get database type icon
function getDbTypeIcon(type: string) {
  const iconClass = "h-4 w-4"
  switch (type) {
    case 'postgresql':
      return <Database className={cn(iconClass, "text-blue-500")} />
    case 'mysql':
      return <Database className={cn(iconClass, "text-orange-500")} />
    case 'sqlserver':
      return <Database className={cn(iconClass, "text-red-500")} />
    case 'oracle':
      return <Database className={cn(iconClass, "text-amber-600")} />
    default:
      return <Database className={iconClass} />
  }
}

interface TableTreeItemProps {
  table: TableInfo
  onTableClick?: (table: TableInfo) => void
  onColumnClick?: (table: TableInfo, column: ColumnInfo) => void
}

function TableTreeItem({ table, onTableClick, onColumnClick }: TableTreeItemProps) {
  const [expanded, setExpanded] = useState(false)

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  const handleTableClick = useCallback(() => {
    onTableClick?.(table)
  }, [table, onTableClick])

  const handleColumnClick = useCallback((column: ColumnInfo) => {
    onColumnClick?.(table, column)
  }, [table, onColumnClick])

  const hasColumns = table.columns && table.columns.length > 0

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted/50 group",
          "text-sm"
        )}
        onClick={handleToggle}
      >
        {hasColumns ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )
        ) : (
          <span className="w-4" />
        )}
        <TableIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span
          className="truncate flex-1 group-hover:text-primary"
          onClick={(e) => {
            e.stopPropagation()
            handleTableClick()
          }}
          title={`${table.schema ? `${table.schema}.` : ''}${table.name}`}
        >
          {table.name}
        </span>
        {table.schema && (
          <span className="text-xs text-muted-foreground shrink-0">
            {table.schema}
          </span>
        )}
      </div>

      {expanded && hasColumns && (
        <div className="ml-5 border-l pl-2 space-y-0.5">
          {table.columns!.map((column) => (
            <div
              key={column.name}
              className={cn(
                "flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer hover:bg-muted/50",
                "text-xs"
              )}
              onClick={() => handleColumnClick(column)}
              title={`${column.name} (${column.type})${column.nullable ? ' - nullable' : ''}`}
            >
              {column.isPrimaryKey ? (
                <Key className="h-3 w-3 text-yellow-500 shrink-0" />
              ) : (
                <span className="text-muted-foreground shrink-0">
                  {getColumnTypeIcon(column.type)}
                </span>
              )}
              <span className="truncate flex-1">{column.name}</span>
              <span className="text-muted-foreground shrink-0 uppercase text-[10px]">
                {column.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function SchemaExplorer({
  dataSources,
  selectedDataSourceId,
  onSelectDataSource,
  tables,
  isLoadingTables,
  onTableClick,
  onColumnClick,
}: SchemaExplorerProps) {
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState('')

  // Filter tables based on search query
  const filteredTables = useMemo(() => {
    if (!searchQuery) return tables

    const query = searchQuery.toLowerCase()
    return tables.filter(
      (table) =>
        table.name.toLowerCase().includes(query) ||
        table.schema?.toLowerCase().includes(query) ||
        table.columns?.some((col) => col.name.toLowerCase().includes(query))
    )
  }, [tables, searchQuery])

  const selectedDataSource = useMemo(
    () => dataSources.find((ds) => ds.id === selectedDataSourceId),
    [dataSources, selectedDataSourceId]
  )

  return (
    <div className="h-full flex flex-col">
      {/* Data Source Selector */}
      <div className="p-4 border-b space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t.queries?.schema?.dataSource || 'Data Source'}
          </label>
          <Select value={selectedDataSourceId} onValueChange={onSelectDataSource}>
            <SelectTrigger className="h-auto min-h-9 py-2">
              <SelectValue placeholder={t.queries?.schema?.selectDataSource || 'Select data source'} />
            </SelectTrigger>
            <SelectContent className="max-w-[350px]">
              {dataSources.map((ds) => (
                <SelectItem key={ds.id} value={ds.id} className="py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">{getDbTypeIcon(ds.type)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate" title={ds.name}>{ds.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {ds.host}:{ds.port}/{ds.database}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedDataSource && (
          <div className="text-xs text-muted-foreground break-all">
            <div className="font-medium text-foreground mb-1" title={selectedDataSource.name}>
              {selectedDataSource.name}
            </div>
            {selectedDataSource.host}:{selectedDataSource.port} / {selectedDataSource.database}
          </div>
        )}
      </div>

      {/* Search */}
      {selectedDataSourceId && (
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.queries?.schema?.searchTables || 'Search tables...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
              disabled={isLoadingTables}
            />
          </div>
        </div>
      )}

      {/* Table Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {!selectedDataSourceId && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Database className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">{t.queries?.schema?.selectPrompt || 'Select a data source'}</p>
            </div>
          )}

          {selectedDataSourceId && isLoadingTables && (
            <div className="space-y-2 p-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          )}

          {selectedDataSourceId && !isLoadingTables && tables.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <TableIcon className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">{t.queries?.schema?.noTables || 'No tables found'}</p>
            </div>
          )}

          {selectedDataSourceId && !isLoadingTables && tables.length > 0 && filteredTables.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">{t.queries?.schema?.noResults || 'No matching tables'}</p>
            </div>
          )}

          {selectedDataSourceId && !isLoadingTables && filteredTables.length > 0 && (
            <div className="space-y-0.5">
              {filteredTables.map((table, index) => (
                <TableTreeItem
                  key={`${table.schema}-${table.name}-${index}`}
                  table={table}
                  onTableClick={onTableClick}
                  onColumnClick={onColumnClick}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with count */}
      {selectedDataSourceId && !isLoadingTables && tables.length > 0 && (
        <div className="p-2 border-t text-xs text-center text-muted-foreground">
          {filteredTables.length === tables.length
            ? `${tables.length} ${t.queries?.schema?.tables || 'tables'}`
            : `${filteredTables.length} / ${tables.length} ${t.queries?.schema?.tables || 'tables'}`}
        </div>
      )}
    </div>
  )
}
