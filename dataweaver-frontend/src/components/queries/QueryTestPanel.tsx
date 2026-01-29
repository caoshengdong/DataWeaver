import { useState, useMemo, useCallback, useRef } from 'react'
import { Play, Download, Loader2, CheckCircle2, XCircle, Clock, Maximize2, Minimize2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { QueryParameter, QueryResult } from '@/types'
import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/utils'

interface QueryTestPanelProps {
  parameters: QueryParameter[]
  onExecute: (params: Record<string, unknown>) => Promise<QueryResult>
  isExecuting?: boolean
}

interface ExecutionResult {
  status: 'idle' | 'success' | 'error'
  data?: QueryResult
  error?: string
}

export function QueryTestPanel({ parameters, onExecute, isExecuting = false }: QueryTestPanelProps) {
  const { t } = useI18n()
  const [paramValues, setParamValues] = useState<Record<string, string>>({})
  const [result, setResult] = useState<ExecutionResult>({ status: 'idle' })
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedCell, setCopiedCell] = useState<string | null>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Initialize param values with defaults
  useMemo(() => {
    const defaults: Record<string, string> = {}
    parameters.forEach((p) => {
      if (p.defaultValue && !paramValues[p.name]) {
        defaults[p.name] = p.defaultValue
      }
    })
    if (Object.keys(defaults).length > 0) {
      setParamValues((prev) => ({ ...defaults, ...prev }))
    }
  }, [parameters])

  const handleParamChange = useCallback((name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleExecute = useCallback(async () => {
    // Validate required parameters
    const missingParams = parameters
      .filter((p) => p.required && !paramValues[p.name])
      .map((p) => p.name)

    if (missingParams.length > 0) {
      setResult({
        status: 'error',
        error: `${t.queries?.testPanel?.missingParams || 'Missing required parameters:'} ${missingParams.join(', ')}`,
      })
      return
    }

    // Convert values to proper types
    const typedParams: Record<string, unknown> = {}
    parameters.forEach((p) => {
      const value = paramValues[p.name]
      if (value === undefined || value === '') {
        if (p.defaultValue) {
          typedParams[p.name] = convertValue(p.defaultValue, p.type)
        }
        return
      }
      typedParams[p.name] = convertValue(value, p.type)
    })

    try {
      const data = await onExecute(typedParams)
      setResult({ status: 'success', data })
    } catch (error) {
      setResult({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [parameters, paramValues, onExecute, t])

  const handleExportCSV = useCallback(() => {
    if (!result.data) return

    const columns = result.data.columns || []
    const rows = result.data.rows || []

    if (columns.length === 0) return

    const csvContent = [
      columns.join(','),
      ...rows.map((row) =>
        columns.map((col) => {
          const value = row[col]
          if (value === null || value === undefined) return ''
          const str = String(value)
          // Escape quotes and wrap in quotes if contains comma or quote
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        }).join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `query_result_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }, [result.data])

  const handleCopyCell = useCallback((value: unknown, cellId: string) => {
    const text = formatCellValue(value)
    navigator.clipboard.writeText(text)
    setCopiedCell(cellId)
    setTimeout(() => setCopiedCell(null), 2000)
  }, [])

  // Detect column types for styling
  const columnTypes = useMemo(() => {
    if (!result.data?.rows?.length || !result.data?.columns?.length) return {}

    const types: Record<string, 'number' | 'date' | 'boolean' | 'null' | 'string'> = {}
    const columns = result.data.columns
    const firstRow = result.data.rows[0]

    columns.forEach(col => {
      const value = firstRow[col]
      if (value === null) {
        types[col] = 'null'
      } else if (typeof value === 'number') {
        types[col] = 'number'
      } else if (typeof value === 'boolean') {
        types[col] = 'boolean'
      } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        types[col] = 'date'
      } else {
        types[col] = 'string'
      }
    })

    return types
  }, [result.data])

  return (
    <div className={cn(
      "flex flex-col",
      isExpanded ? "fixed inset-4 z-50 bg-background rounded-lg shadow-2xl border" : "h-full"
    )}>
      {/* Parameter Form */}
      {parameters.length > 0 && !isExpanded && (
        <div className="p-4 border-b space-y-3 flex-shrink-0">
          <h4 className="font-medium text-sm flex items-center gap-2">
            {t.queries?.testPanel?.parameters || 'Parameters'}
            <Badge variant="secondary" className="text-xs">
              {parameters.length}
            </Badge>
          </h4>
          <div className="space-y-3">
            {parameters.map((param) => (
              <div key={param.id} className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  {param.name}
                  {param.required && <span className="text-destructive">*</span>}
                  {param.type && (
                    <span className="text-muted-foreground font-normal">({param.type})</span>
                  )}
                </Label>
                {param.type === 'boolean' ? (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={paramValues[param.name] === 'true'}
                      onCheckedChange={(checked) =>
                        handleParamChange(param.name, checked ? 'true' : 'false')
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {paramValues[param.name] === 'true' ? 'true' : 'false'}
                    </span>
                  </div>
                ) : (
                  <Input
                    type={param.type === 'number' ? 'number' : param.type === 'date' ? 'date' : 'text'}
                    placeholder={param.defaultValue || param.description || `Enter ${param.name}...`}
                    value={paramValues[param.name] || ''}
                    onChange={(e) => handleParamChange(param.name, e.target.value)}
                    className="h-9"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execute Button */}
      {!isExpanded && (
        <div className="p-4 border-b flex-shrink-0">
          <Button
            onClick={handleExecute}
            disabled={isExecuting}
            className="w-full"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.queries?.testPanel?.executing || 'Executing...'}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {t.queries?.testPanel?.execute || 'Execute Query'}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {result.status === 'idle' && (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <Play className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>{t.queries?.testPanel?.noResults || 'Execute query to see results'}</p>
            </div>
          </div>
        )}

        {result.status === 'error' && (
          <div className="p-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-destructive">
                    {t.queries?.testPanel?.executionFailed || 'Execution Failed'}
                  </h4>
                  <p className="text-sm text-destructive/80 mt-1 break-words">{result.error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {result.status === 'success' && result.data && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Stats Bar */}
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">{t.queries?.testPanel?.success || 'Success'}</span>
                </div>
                <Badge variant="secondary" className="tabular-nums">
                  {result.data.rowCount ?? 0} {t.queries?.testPanel?.rows || 'rows'}
                </Badge>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="tabular-nums text-xs">{result.data.executionTime ?? 0}ms</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsExpanded(!isExpanded)}
                      >
                        {isExpanded ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isExpanded ? 'Minimize' : 'Expand'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-8"
                  disabled={!result.data.columns?.length}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">
                    {t.queries?.testPanel?.exportCSV || 'Export'}
                  </span>
                </Button>
              </div>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-auto min-h-0" ref={tableContainerRef}>
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/80 backdrop-blur-sm">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-r bg-muted/90 sticky left-0 z-20 w-10">
                      #
                    </th>
                    {(result.data.columns || []).map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b whitespace-nowrap bg-muted/80"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{col}</span>
                          {columnTypes[col] && (
                            <span className="text-[10px] font-normal normal-case opacity-60">
                              {columnTypes[col]}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(result.data.rows || []).map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums border-r bg-muted/20 sticky left-0 font-mono">
                        {rowIndex + 1}
                      </td>
                      {(result.data?.columns || []).map((col) => {
                        const value = row[col]
                        const cellId = `${rowIndex}-${col}`
                        const isNull = value === null
                        const isNumber = typeof value === 'number'
                        const isBoolean = typeof value === 'boolean'

                        return (
                          <td
                            key={col}
                            className={cn(
                              "px-3 py-2 relative group/cell",
                              isNumber && "tabular-nums text-right font-mono",
                              isNull && "text-muted-foreground italic",
                              isBoolean && "font-mono"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "flex-1 min-w-0",
                                !isNumber && "truncate max-w-[300px]"
                              )} title={formatCellValue(value)}>
                                {isNull ? (
                                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">NULL</span>
                                ) : isBoolean ? (
                                  <span className={cn(
                                    "text-xs px-1.5 py-0.5 rounded",
                                    value ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  )}>
                                    {String(value)}
                                  </span>
                                ) : (
                                  formatCellValue(value)
                                )}
                              </span>
                              <button
                                onClick={() => handleCopyCell(value, cellId)}
                                className="opacity-0 group-hover/cell:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
                                title="Copy value"
                              >
                                {copiedCell === cellId ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3 text-muted-foreground" />
                                )}
                              </button>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Empty state for no rows */}
              {result.data.columns?.length > 0 && (!result.data.rows || result.data.rows.length === 0) && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p className="text-sm">No rows returned</p>
                </div>
              )}
            </div>

            {/* Footer with pagination info */}
            {result.data.rows && result.data.rows.length > 0 && (
              <div className="p-2 border-t bg-muted/20 text-xs text-muted-foreground text-center flex-shrink-0">
                Showing {result.data.rows.length} of {result.data.rowCount ?? result.data.rows.length} rows
                {result.data.columns && ` · ${result.data.columns.length} columns`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded mode close button */}
      {isExpanded && (
        <div className="absolute top-4 right-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(false)}
          >
            <Minimize2 className="h-4 w-4 mr-1" />
            Close
          </Button>
        </div>
      )}
    </div>
  )
}

function convertValue(value: string, type: string): unknown {
  switch (type) {
    case 'number':
      return Number(value)
    case 'boolean':
      return value === 'true'
    case 'date':
      return value
    default:
      return value
  }
}

function formatCellValue(value: unknown): string {
  if (value === null) return 'NULL'
  if (value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
