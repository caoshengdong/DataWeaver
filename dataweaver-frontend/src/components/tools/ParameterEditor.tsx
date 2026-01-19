import { useEffect, useMemo } from 'react'
import { Info, RefreshCw, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { ToolParameter, QueryParameter } from '@/types'
import { useQueryDetail } from '@/hooks/useQueries'
import { useI18n } from '@/i18n/I18nContext'

interface ParameterEditorProps {
  queryId: string | undefined
  parameters: ToolParameter[]
  onChange: (parameters: ToolParameter[]) => void
}

const PARAMETER_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'integer', label: 'Integer' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
]

// Convert query parameter type to tool parameter type
function convertParameterType(queryType: string): string {
  switch (queryType) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'date':
      return queryType
    case 'integer':
      return 'integer'
    default:
      return 'string'
  }
}

// Convert QueryParameter to ToolParameter
function queryParamToToolParam(qp: QueryParameter): ToolParameter {
  return {
    name: qp.name,
    type: convertParameterType(qp.type) as ToolParameter['type'],
    required: qp.required,
    default: qp.defaultValue,
    description: qp.description || '',
  }
}

export function ParameterEditor({ queryId, parameters, onChange }: ParameterEditorProps) {
  const { t } = useI18n()
  const { data: query, isLoading: isLoadingQuery } = useQueryDetail(queryId)

  // Derive source parameters from query
  const sourceParameters = useMemo(() => {
    if (!query?.parameters) return []
    return query.parameters.map(queryParamToToolParam)
  }, [query])

  // Sync with query parameters when query changes
  useEffect(() => {
    if (sourceParameters.length > 0 && parameters.length === 0) {
      onChange(sourceParameters)
    }
  }, [sourceParameters, parameters.length, onChange])

  // Handle reset to query defaults
  const handleResetToDefaults = () => {
    if (sourceParameters.length > 0) {
      onChange(sourceParameters)
    }
  }

  // Check if parameter differs from source
  const isDifferentFromSource = (param: ToolParameter): boolean => {
    const source = sourceParameters.find(sp => sp.name === param.name)
    if (!source) return true
    return (
      param.type !== source.type ||
      param.required !== source.required ||
      param.default !== source.default ||
      param.description !== source.description
    )
  }

  // Update a specific parameter
  const updateParameter = (index: number, updates: Partial<ToolParameter>) => {
    const newParams = [...parameters]
    newParams[index] = { ...newParams[index], ...updates }
    onChange(newParams)
  }

  // Reset a single parameter to source
  const resetParameterToSource = (index: number) => {
    const param = parameters[index]
    const source = sourceParameters.find(sp => sp.name === param.name)
    if (source) {
      const newParams = [...parameters]
      newParams[index] = { ...source }
      onChange(newParams)
    }
  }

  if (!queryId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t.tools?.parameters?.selectQueryFirst || 'Please select a query first to configure parameters.'}
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoadingQuery) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        {t.common?.loading || 'Loading...'}
      </div>
    )
  }

  if (parameters.length === 0 && sourceParameters.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t.tools?.parameters?.noParameters || 'The selected query has no parameters.'}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with reset button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t.tools?.parameters?.hint || 'Configure how parameters are exposed to AI models. You can override the query defaults.'}
        </div>
        {sourceParameters.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetToDefaults}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {t.tools?.parameters?.resetAll || 'Reset All'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t.tools?.parameters?.resetTooltip || 'Reset all parameters to query defaults'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Parameter cards */}
      <div className="space-y-4">
        {parameters.map((param, index) => (
          <Card key={param.name} className={isDifferentFromSource(param) ? 'border-primary/50' : ''}>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded text-sm">{param.name}</code>
                  {param.required && (
                    <Badge variant="destructive" className="text-xs">
                      {t.tools?.parameters?.required || 'Required'}
                    </Badge>
                  )}
                  {isDifferentFromSource(param) && (
                    <Badge variant="outline" className="text-xs">
                      {t.tools?.parameters?.modified || 'Modified'}
                    </Badge>
                  )}
                </div>
                {isDifferentFromSource(param) && sourceParameters.find(sp => sp.name === param.name) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => resetParameterToSource(index)}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t.tools?.parameters?.resetOne || 'Reset to query default'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
                <div className="space-y-2">
                  <Label>{t.tools?.parameters?.type || 'Type'}</Label>
                  <Select
                    value={param.type}
                    onValueChange={(value) => updateParameter(index, { type: value as ToolParameter['type'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PARAMETER_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Default Value */}
                <div className="space-y-2">
                  <Label>{t.tools?.parameters?.default || 'Default Value'}</Label>
                  <Input
                    value={String(param.default ?? '')}
                    onChange={(e) => {
                      const value = e.target.value
                      let parsedValue: unknown = value
                      if (param.type === 'number' || param.type === 'integer') {
                        parsedValue = value === '' ? undefined : Number(value)
                      } else if (param.type === 'boolean') {
                        parsedValue = value === 'true'
                      }
                      updateParameter(index, { default: parsedValue || undefined })
                    }}
                    placeholder={t.tools?.parameters?.defaultPlaceholder || 'Optional default value'}
                  />
                </div>
              </div>

              {/* Required toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t.tools?.parameters?.requiredLabel || 'Required'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t.tools?.parameters?.requiredHint || 'AI must provide this parameter'}
                  </p>
                </div>
                <Switch
                  checked={param.required}
                  onCheckedChange={(checked: boolean) => updateParameter(index, { required: checked })}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>{t.tools?.parameters?.description || 'Description'}</Label>
                <Textarea
                  value={param.description}
                  onChange={(e) => updateParameter(index, { description: e.target.value })}
                  placeholder={t.tools?.parameters?.descriptionPlaceholder || 'Describe what this parameter does'}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  {t.tools?.parameters?.descriptionHint || 'This description helps AI understand how to use this parameter.'}
                </p>
              </div>

              {/* Format (for date/datetime types) */}
              {(param.type === 'date' || param.type === 'datetime') && (
                <div className="space-y-2">
                  <Label>{t.tools?.parameters?.format || 'Format'}</Label>
                  <Select
                    value={param.format || (param.type === 'date' ? 'date' : 'date-time')}
                    onValueChange={(value) => updateParameter(index, { format: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">date (YYYY-MM-DD)</SelectItem>
                      <SelectItem value="date-time">date-time (ISO 8601)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
