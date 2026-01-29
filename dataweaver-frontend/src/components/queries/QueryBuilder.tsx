import { useState, useCallback, useMemo, useEffect } from 'react'
import { Save, Code2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SQLEditor } from './SQLEditor'
import { ParameterConfig } from './ParameterConfig'
import { QueryTestPanel } from './QueryTestPanel'
import { QueryHistory } from './QueryHistory'
import { SchemaExplorer } from './SchemaExplorer'
import { useDataSources, useDataSourceTables } from '@/hooks/useDataSources'
import {
  useQueries,
  useCreateQuery,
  useUpdateQuery,
  useExecuteQuery,
  useValidateSql,
  useFormatSql,
  useQueryHistory,
} from '@/hooks/useQueries'
import type { Query, QueryParameter, TableInfo, ColumnInfo, QueryResult, QueryHistory as QueryHistoryType } from '@/types'
import { useI18n } from '@/i18n/I18nContext'
import { toast } from 'sonner'

interface QueryBuilderProps {
  queryId?: string
  onQuerySaved?: (query: Query) => void
}

// Extract parameters from SQL (matches :paramName pattern)
function extractParameters(sql: string): string[] {
  const regex = /:(\w+)/g
  const params: string[] = []
  let match

  while ((match = regex.exec(sql)) !== null) {
    if (!params.includes(match[1])) {
      params.push(match[1])
    }
  }

  return params
}

export function QueryBuilder({ queryId, onQuerySaved }: QueryBuilderProps) {
  const { t } = useI18n()

  // Data sources
  const { data: dataSourcesData } = useDataSources()
  const dataSources = Array.isArray(dataSourcesData) ? dataSourcesData : []

  // State
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>('')
  const [queryName, setQueryName] = useState('')
  const [queryDescription, setQueryDescription] = useState('')
  const [sql, setSql] = useState('SELECT * FROM ')
  const [parameters, setParameters] = useState<QueryParameter[]>([])
  const [activeTab, setActiveTab] = useState('params')
  const [isSaving, setIsSaving] = useState(false)
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message?: string } | null>(null)

  // Tables for selected data source
  const { data: tablesData, isLoading: isLoadingTables } = useDataSourceTables(selectedDataSourceId || undefined)
  const tables = Array.isArray(tablesData) ? tablesData : []

  // Queries
  const { data: savedQueriesData } = useQueries()
  const savedQueries = Array.isArray(savedQueriesData) ? savedQueriesData : []
  const createQuery = useCreateQuery()
  const updateQuery = useUpdateQuery()
  const executeQuery = useExecuteQuery()
  const validateSql = useValidateSql()
  const formatSql = useFormatSql()
  const { data: historyData, isLoading: isLoadingHistory } = useQueryHistory(queryId)

  // Extract parameters from SQL
  const extractedParams = useMemo(() => extractParameters(sql), [sql])

  // History data
  const history: QueryHistoryType[] = useMemo(() => {
    if (!historyData) return []
    return historyData.data || []
  }, [historyData])

  // Load query if editing
  useEffect(() => {
    if (queryId) {
      const query = savedQueries.find((q) => q.id === queryId)
      if (query) {
        setQueryName(query.name)
        setQueryDescription(query.description || '')
        setSql(query.sql)
        setParameters(query.parameters || [])
        setSelectedDataSourceId(query.dataSourceId)
      }
    }
  }, [queryId, savedQueries])

  // Handle data source change
  const handleDataSourceChange = useCallback((id: string) => {
    setSelectedDataSourceId(id)
    setValidationResult(null)
  }, [])

  // Handle table click - insert table name into SQL
  const handleTableClick = useCallback((table: TableInfo) => {
    const tableName = table.schema ? `${table.schema}.${table.name}` : table.name
    setSql((prev) => {
      // Simple append for now - could be smarter about cursor position
      if (prev.endsWith('FROM ') || prev.endsWith('JOIN ') || prev.endsWith('UPDATE ') || prev.endsWith('INTO ')) {
        return prev + tableName
      }
      return prev + ' ' + tableName
    })
  }, [])

  // Handle column click - insert column name
  const handleColumnClick = useCallback((_table: TableInfo, column: ColumnInfo) => {
    setSql((prev) => prev + column.name)
  }, [])

  // Format SQL
  const handleFormat = useCallback(async () => {
    try {
      const result = await formatSql.mutateAsync(sql)
      setSql(result.formattedSql)
      toast.success(t.queries?.messages?.formatSuccess || 'SQL formatted')
    } catch (error) {
      toast.error(t.queries?.messages?.formatError || 'Failed to format SQL')
    }
  }, [sql, formatSql, t])

  // Validate SQL
  const handleValidate = useCallback(async () => {
    if (!selectedDataSourceId) {
      toast.error(t.queries?.messages?.selectDataSource || 'Please select a data source first')
      return
    }

    try {
      const result = await validateSql.mutateAsync({ dataSourceId: selectedDataSourceId, sql })
      setValidationResult(result)
      if (result.valid) {
        toast.success(t.queries?.messages?.validateSuccess || 'SQL is valid')
      } else {
        toast.error(result.message || t.queries?.messages?.validateError || 'SQL validation failed')
      }
    } catch (error) {
      toast.error(t.queries?.messages?.validateError || 'SQL validation failed')
    }
  }, [selectedDataSourceId, sql, validateSql, t])

  // Save query
  const handleSave = useCallback(async () => {
    if (!queryName.trim()) {
      toast.error(t.queries?.messages?.nameRequired || 'Query name is required')
      return
    }
    if (!selectedDataSourceId) {
      toast.error(t.queries?.messages?.selectDataSource || 'Please select a data source')
      return
    }
    if (!sql.trim()) {
      toast.error(t.queries?.messages?.sqlRequired || 'SQL is required')
      return
    }

    setIsSaving(true)
    try {
      const data = {
        name: queryName,
        dataSourceId: selectedDataSourceId,
        sql,
        description: queryDescription || undefined,
        parameters,
      }

      let savedQuery: Query
      if (queryId) {
        savedQuery = await updateQuery.mutateAsync({ id: queryId, data })
      } else {
        savedQuery = await createQuery.mutateAsync(data)
      }

      onQuerySaved?.(savedQuery)
    } catch (error) {
      // Error handling is done in the hooks
    } finally {
      setIsSaving(false)
    }
  }, [queryName, selectedDataSourceId, sql, queryDescription, parameters, queryId, createQuery, updateQuery, onQuerySaved, t])

  // Execute query for test panel
  const handleExecute = useCallback(async (params: Record<string, unknown>): Promise<QueryResult> => {
    if (!queryId) {
      // For new queries, we need to save first or use a temporary execution endpoint
      throw new Error(t.queries?.messages?.saveFirst || 'Please save the query first')
    }

    const result = await executeQuery.mutateAsync({ id: queryId, parameters: params })
    return result
  }, [queryId, executeQuery, t])

  // Rerun from history
  const handleRerun = useCallback((_item: QueryHistoryType) => {
    setActiveTab('test')
    // The QueryTestPanel will pick up the parameters from the query
  }, [])

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Schema Explorer */}
      <div className="w-80 min-w-[280px] max-w-[480px] border-r bg-muted/30 flex-shrink-0">
        <SchemaExplorer
          dataSources={dataSources}
          selectedDataSourceId={selectedDataSourceId}
          onSelectDataSource={handleDataSourceChange}
          tables={tables}
          isLoadingTables={isLoadingTables}
          onTableClick={handleTableClick}
          onColumnClick={handleColumnClick}
        />
      </div>

      {/* Middle - SQL Editor (50%) */}
      <div className="flex-1 min-w-[400px] flex flex-col overflow-hidden">
        {/* Top Toolbar - Query Name, Save, Format, Validate */}
        <div className="p-4 border-b space-y-3 flex-shrink-0 bg-background">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder={t.queries?.form?.namePlaceholder || 'Query name'}
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                className="h-10 text-lg font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFormat}
                disabled={formatSql.isPending}
              >
                {formatSql.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Code2 className="h-4 w-4" />
                )}
                {t.queries?.actions?.format || 'Format'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidate}
                disabled={validateSql.isPending || !selectedDataSourceId}
              >
                {validateSql.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : validationResult?.valid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : validationResult?.valid === false ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {t.queries?.actions?.validate || 'Validate'}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !queryName.trim() || !selectedDataSourceId || !sql.trim()}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t.common?.save || 'Save'}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Textarea
              placeholder={t.queries?.form?.descriptionPlaceholder || 'Description (optional)'}
              value={queryDescription}
              onChange={(e) => setQueryDescription(e.target.value)}
              className="min-h-[40px] max-h-[60px] resize-none flex-1"
              rows={1}
            />
            {extractedParams.length > 0 && (
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {t.queries?.editor?.paramsDetected || 'Parameters:'} <span className="font-mono">{extractedParams.join(', ')}</span>
              </div>
            )}
          </div>
          {validationResult && !validationResult.valid && validationResult.message && (
            <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {validationResult.message}
            </div>
          )}
        </div>

        {/* SQL Editor - Scrollable Area */}
        <div className="flex-1 p-4 overflow-auto min-h-0">
          <div className="h-full min-h-[300px]">
            <SQLEditor
              value={sql}
              onChange={setSql}
              parameters={parameters}
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Tabs */}
      <div className="w-[35%] min-w-[360px] max-w-[600px] border-l flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-12 px-2">
            <TabsTrigger value="params" className="data-[state=active]:bg-muted">
              {t.queries?.tabs?.params || 'Parameters'}
            </TabsTrigger>
            <TabsTrigger value="test" className="data-[state=active]:bg-muted">
              {t.queries?.tabs?.test || 'Test'}
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-muted">
              {t.queries?.tabs?.history || 'History'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="params" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                <ParameterConfig
                  parameters={parameters}
                  onChange={setParameters}
                  extractedParams={extractedParams}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="test" className="flex-1 mt-0 overflow-hidden">
            <QueryTestPanel
              parameters={parameters}
              onExecute={handleExecute}
              isExecuting={executeQuery.isPending}
            />
          </TabsContent>

          <TabsContent value="history" className="flex-1 mt-0 overflow-hidden">
            <QueryHistory
              history={history}
              isLoading={isLoadingHistory}
              onRerun={handleRerun}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
