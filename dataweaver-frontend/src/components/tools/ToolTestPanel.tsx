import { useState, useCallback, useEffect } from 'react'
import { Play, Clock, Database, AlertCircle, Check, Copy, FileJson } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ToolParameter, ToolTestResult } from '@/types'
import { useTestTool } from '@/hooks/useTools'
import { toolsApi } from '@/api/tools'
import { useI18n } from '@/i18n/I18nContext'
import { toast } from 'sonner'

interface ToolTestPanelProps {
  toolId: string | undefined
  parameters: ToolParameter[]
}

export function ToolTestPanel({ toolId, parameters }: ToolTestPanelProps) {
  const { t } = useI18n()
  const testTool = useTestTool()
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({})
  const [result, setResult] = useState<ToolTestResult | null>(null)
  const [mcpDefinition, setMcpDefinition] = useState<Record<string, unknown> | null>(null)
  const [isLoadingMcp, setIsLoadingMcp] = useState(false)

  // Initialize parameter values with defaults
  useEffect(() => {
    const defaults: Record<string, unknown> = {}
    for (const param of parameters) {
      if (param.default !== undefined) {
        defaults[param.name] = param.default
      }
    }
    setParamValues(defaults)
  }, [parameters])

  // Load MCP definition when toolId changes
  useEffect(() => {
    if (!toolId) {
      setMcpDefinition(null)
      return
    }

    const loadMcpDefinition = async () => {
      setIsLoadingMcp(true)
      try {
        const definition = await toolsApi.getMCPDefinition(toolId)
        setMcpDefinition(definition as Record<string, unknown>)
      } catch {
        setMcpDefinition(null)
      } finally {
        setIsLoadingMcp(false)
      }
    }

    loadMcpDefinition()
  }, [toolId])

  // Handle parameter value change
  const handleParamChange = useCallback((name: string, value: unknown) => {
    setParamValues(prev => ({ ...prev, [name]: value }))
  }, [])

  // Execute test
  const handleTest = async () => {
    if (!toolId) return

    try {
      const testResult = await testTool.mutateAsync({
        id: toolId,
        parameters: paramValues
      })
      setResult(testResult)
    } catch {
      // Error handled by hook
    }
  }

  // Copy MCP definition to clipboard
  const handleCopyMcp = async () => {
    if (!mcpDefinition) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(mcpDefinition, null, 2))
      toast.success(t.tools?.test?.copied || 'Copied to clipboard!')
    } catch {
      toast.error(t.tools?.test?.copyFailed || 'Failed to copy')
    }
  }

  // Render parameter input based on type
  const renderParamInput = (param: ToolParameter) => {
    const value = paramValues[param.name]

    switch (param.type) {
      case 'boolean':
        return (
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked: boolean) => handleParamChange(param.name, checked)}
          />
        )
      case 'number':
      case 'integer':
        return (
          <Input
            type="number"
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => handleParamChange(param.name, e.target.value ? Number(e.target.value) : undefined)}
            placeholder={param.default !== undefined ? String(param.default) : ''}
            step={param.type === 'integer' ? 1 : 'any'}
          />
        )
      case 'date':
        return (
          <Input
            type="date"
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => handleParamChange(param.name, e.target.value)}
          />
        )
      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => handleParamChange(param.name, e.target.value)}
          />
        )
      default:
        return (
          <Input
            type="text"
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => handleParamChange(param.name, e.target.value)}
            placeholder={param.default !== undefined ? String(param.default) : ''}
          />
        )
    }
  }

  if (!toolId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t.tools?.test?.saveFirst || 'Please save the tool first to test it.'}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="test" className="w-full">
        <TabsList>
          <TabsTrigger value="test">
            <Play className="h-4 w-4 mr-1" />
            {t.tools?.test?.testTab || 'Test'}
          </TabsTrigger>
          <TabsTrigger value="mcp">
            <FileJson className="h-4 w-4 mr-1" />
            {t.tools?.test?.mcpTab || 'MCP Definition'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-4 mt-4">
          {/* Parameter inputs */}
          {parameters.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">
                  {t.tools?.test?.parameters || 'Parameters'}
                </CardTitle>
                <CardDescription>
                  {t.tools?.test?.parametersHint || 'Enter test values for each parameter.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {parameters.map((param) => (
                  <div key={param.name} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="font-mono text-sm">{param.name}</Label>
                      {param.required && (
                        <Badge variant="destructive" className="text-xs">
                          {t.tools?.test?.required || 'Required'}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{param.type}</Badge>
                    </div>
                    {renderParamInput(param)}
                    {param.description && (
                      <p className="text-xs text-muted-foreground">{param.description}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Execute button */}
          <Button
            onClick={handleTest}
            disabled={testTool.isPending}
            className="w-full"
          >
            {testTool.isPending ? (
              <>
                <Clock className="h-4 w-4 animate-spin mr-2" />
                {t.tools?.test?.executing || 'Executing...'}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {t.tools?.test?.execute || 'Execute Test'}
              </>
            )}
          </Button>

          {/* Test result */}
          {result && (
            <Card className={result.success ? 'border-green-500/50' : 'border-destructive/50'}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {result.success ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  {result.success
                    ? (t.tools?.test?.success || 'Execution Successful')
                    : (t.tools?.test?.failed || 'Execution Failed')
                  }
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {/* Execution stats */}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{result.executionTimeMs}ms</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span>{result.rowCount} {t.tools?.test?.rows || 'rows'}</span>
                  </div>
                </div>

                {/* Error message */}
                {!result.success && result.message && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t.tools?.test?.error || 'Error'}</AlertTitle>
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                )}

                {/* Data preview */}
                {result.success && result.data && result.data.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      {t.tools?.test?.preview || 'Data Preview'}
                    </div>
                    <ScrollArea className="border rounded-md">
                      <div className="max-h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {result.columns?.map((col) => (
                                <TableHead key={col} className="whitespace-nowrap">
                                  {col}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.data.slice(0, 10).map((row, idx) => (
                              <TableRow key={idx}>
                                {result.columns?.map((col) => (
                                  <TableCell key={col} className="whitespace-nowrap">
                                    {row[col] !== null && row[col] !== undefined
                                      ? typeof row[col] === 'object'
                                        ? JSON.stringify(row[col])
                                        : String(row[col])
                                      : <span className="text-muted-foreground">null</span>
                                    }
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                    {result.data.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">
                        {t.tools?.test?.showingFirst || 'Showing first 10 of'} {result.data.length} {t.tools?.test?.rows || 'rows'}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mcp" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">
                    {t.tools?.test?.mcpDefinition || 'MCP Tool Definition'}
                  </CardTitle>
                  <CardDescription>
                    {t.tools?.test?.mcpHint || 'The tool definition as exposed to MCP clients.'}
                  </CardDescription>
                </div>
                {mcpDefinition && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="outline" size="sm" onClick={handleCopyMcp}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t.tools?.test?.copyMcp || 'Copy to clipboard'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingMcp ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Clock className="h-4 w-4 animate-spin mr-2" />
                  {t.common?.loading || 'Loading...'}
                </div>
              ) : mcpDefinition ? (
                <ScrollArea className="border rounded-md bg-muted/30 max-h-[400px]">
                  <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                    {JSON.stringify(mcpDefinition, null, 2)}
                  </pre>
                </ScrollArea>
              ) : (
                <div className="text-muted-foreground text-sm py-4 text-center">
                  {t.tools?.test?.noMcpDefinition || 'MCP definition not available.'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
