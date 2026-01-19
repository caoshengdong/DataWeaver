import { useState, useMemo } from 'react'
import { Code2, Play, RefreshCw, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTestTool } from '@/hooks/useTools'
import { useI18n } from '@/i18n/I18nContext'
import type { ToolParameter } from '@/types'

interface OutputSchemaEditorProps {
  toolId?: string
  parameters: ToolParameter[]
  outputSchema: Record<string, unknown>
  onChange: (schema: Record<string, unknown>) => void
}

// Infer JSON Schema type from a value
function inferType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

// Generate schema from sample data
function generateSchemaFromData(data: Record<string, unknown>[]): Record<string, unknown> {
  if (!data || data.length === 0) {
    return {
      type: 'array',
      items: { type: 'object', properties: {} }
    }
  }

  const sample = data[0]
  const properties: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(sample)) {
    const type = inferType(value)
    if (type === 'object' && value !== null) {
      properties[key] = {
        type: 'object',
        description: `Field: ${key}`
      }
    } else if (type === 'array') {
      properties[key] = {
        type: 'array',
        items: { type: 'string' },
        description: `Field: ${key}`
      }
    } else {
      properties[key] = {
        type: type === 'null' ? 'string' : type,
        description: `Field: ${key}`
      }
    }
  }

  return {
    type: 'array',
    items: {
      type: 'object',
      properties
    }
  }
}

export function OutputSchemaEditor({
  toolId,
  parameters,
  outputSchema,
  onChange
}: OutputSchemaEditorProps) {
  const { t } = useI18n()
  const testTool = useTestTool()
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [generatedSchema, setGeneratedSchema] = useState<Record<string, unknown> | null>(null)

  // Format schema as JSON string
  const schemaJson = useMemo(() => {
    try {
      return JSON.stringify(outputSchema, null, 2)
    } catch {
      return '{}'
    }
  }, [outputSchema])

  // Handle manual JSON editing
  const handleJsonChange = (value: string) => {
    try {
      const parsed = JSON.parse(value)
      setJsonError(null)
      onChange(parsed)
    } catch (e) {
      setJsonError((e as Error).message)
    }
  }

  // Generate schema from test execution
  const handleGenerateFromTest = async () => {
    if (!toolId) return

    // Build default parameters
    const testParams: Record<string, unknown> = {}
    for (const param of parameters) {
      if (param.default !== undefined) {
        testParams[param.name] = param.default
      } else if (param.required) {
        // Set sensible defaults for required params
        switch (param.type) {
          case 'number':
          case 'integer':
            testParams[param.name] = 0
            break
          case 'boolean':
            testParams[param.name] = false
            break
          case 'date':
            testParams[param.name] = new Date().toISOString().split('T')[0]
            break
          case 'datetime':
            testParams[param.name] = new Date().toISOString()
            break
          default:
            testParams[param.name] = ''
        }
      }
    }

    try {
      const result = await testTool.mutateAsync({
        id: toolId,
        parameters: testParams
      })

      if (result?.data && result.data.length > 0) {
        const schema = generateSchemaFromData(result.data)
        setGeneratedSchema(schema)
      }
    } catch {
      // Error handled by hook
    }
  }

  // Apply generated schema
  const handleApplyGenerated = () => {
    if (generatedSchema) {
      onChange(generatedSchema)
      setGeneratedSchema(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {t.tools?.outputSchema?.hint || 'Define the JSON Schema for the tool output. This helps AI models understand the response structure.'}
      </div>

      <Tabs defaultValue="visual" className="w-full">
        <TabsList>
          <TabsTrigger value="visual">
            <Code2 className="h-4 w-4 mr-1" />
            {t.tools?.outputSchema?.visual || 'Visual'}
          </TabsTrigger>
          <TabsTrigger value="json">
            {t.tools?.outputSchema?.json || 'JSON'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="space-y-4 mt-4">
          {/* Generate from test */}
          {toolId && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  {t.tools?.outputSchema?.generateTitle || 'Generate from Test'}
                </CardTitle>
                <CardDescription>
                  {t.tools?.outputSchema?.generateHint || 'Execute the tool with default parameters to infer the output schema.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateFromTest}
                  disabled={testTool.isPending}
                >
                  {testTool.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {t.tools?.outputSchema?.generate || 'Generate Schema'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Generated schema preview */}
          {generatedSchema && (
            <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="flex items-center justify-between">
                <span>{t.tools?.outputSchema?.generated || 'Schema generated successfully!'}</span>
                <Button type="button" size="sm" onClick={handleApplyGenerated}>
                  {t.tools?.outputSchema?.apply || 'Apply'}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Schema preview */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">
                {t.tools?.outputSchema?.preview || 'Schema Preview'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {Object.keys(outputSchema).length === 0 ? (
                <div className="text-muted-foreground text-sm py-4 text-center">
                  {t.tools?.outputSchema?.empty || 'No schema defined yet.'}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{String(outputSchema.type || 'object')}</Badge>
                  </div>
                  {outputSchema.items && typeof outputSchema.items === 'object' ? (
                    <div className="border rounded-md p-3 bg-muted/30">
                      <div className="text-xs text-muted-foreground mb-2">
                        {t.tools?.outputSchema?.itemProperties || 'Item Properties:'}
                      </div>
                      <div className="space-y-1">
                        {Object.entries(
                          ((outputSchema.items as Record<string, unknown>).properties as Record<string, unknown>) || {}
                        ).map(([key, value]) => {
                          const typeValue = String((value as Record<string, unknown>).type || 'unknown')
                          return (
                            <div key={key} className="flex items-center gap-2 text-sm">
                              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{key}</code>
                              <Badge variant="secondary" className="text-xs">
                                {typeValue}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="json" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>{t.tools?.outputSchema?.jsonEditor || 'JSON Schema'}</Label>
            <Textarea
              value={schemaJson}
              onChange={(e) => handleJsonChange(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="{}"
            />
            {jsonError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{jsonError}</AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
