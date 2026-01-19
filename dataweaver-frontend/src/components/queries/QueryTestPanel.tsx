import { useState, useMemo, useCallback } from 'react'
import { Play, Download, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { QueryParameter, QueryResult } from '@/types'
import { useI18n } from '@/i18n/I18nContext'

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

  return (
    <div className="h-full flex flex-col">
      {/* Parameter Form */}
      {parameters.length > 0 && (
        <div className="p-4 border-b space-y-3">
          <h4 className="font-medium text-sm">
            {t.queries?.testPanel?.parameters || 'Parameters'}
          </h4>
          <div className="space-y-3">
            {parameters.map((param) => (
              <div key={param.id} className="space-y-1.5">
                <Label className="text-xs">
                  {param.name}
                  {param.required && <span className="text-destructive ml-1">*</span>}
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
                    placeholder={param.defaultValue || param.description || `Enter ${param.name}`}
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
      <div className="p-4 border-b">
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

      {/* Results */}
      <div className="flex-1 overflow-hidden">
        {result.status === 'idle' && (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            {t.queries?.testPanel?.noResults || 'Execute query to see results'}
          </div>
        )}

        {result.status === 'error' && (
          <div className="p-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-destructive">
                    {t.queries?.testPanel?.executionFailed || 'Execution Failed'}
                  </h4>
                  <p className="text-sm text-destructive/80 mt-1">{result.error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {result.status === 'success' && result.data && (
          <div className="h-full flex flex-col">
            {/* Stats Bar */}
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{t.queries?.testPanel?.success || 'Success'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span>{result.data.rowCount ?? 0} {t.queries?.testPanel?.rows || 'rows'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{result.data.executionTime ?? 0}ms</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8"
                disabled={!result.data.columns?.length}
              >
                <Download className="h-4 w-4" />
                {t.queries?.testPanel?.exportCSV || 'Export CSV'}
              </Button>
            </div>

            {/* Data Table */}
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    {(result.data.columns || []).map((col) => (
                      <TableHead key={col} className="whitespace-nowrap">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(result.data.rows || []).map((row, i) => (
                    <TableRow key={i}>
                      {(result.data?.columns || []).map((col) => (
                        <TableCell key={col} className="max-w-[200px] truncate">
                          {formatCellValue(row[col])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </div>
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
