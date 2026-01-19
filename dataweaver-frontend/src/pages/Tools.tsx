import { useState, useCallback, useEffect } from 'react'
import { Wrench, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToolList } from '@/components/tools/ToolList'
import { ToolForm } from '@/components/tools/ToolForm'
import { ParameterEditor } from '@/components/tools/ParameterEditor'
import { OutputSchemaEditor } from '@/components/tools/OutputSchemaEditor'
import { ToolTestPanel } from '@/components/tools/ToolTestPanel'
import { useTools, useCreateTool, useUpdateTool, useDeleteTool, useTool } from '@/hooks/useTools'
import { useQueries } from '@/hooks/useQueries'
import type { Tool, ToolFormData, ToolParameter } from '@/types'
import { useI18n } from '@/i18n/I18nContext'

type ViewMode = 'empty' | 'create' | 'edit'

const emptyFormData: Partial<ToolFormData> = {
  name: '',
  displayName: '',
  description: '',
  queryId: '',
  parameters: [],
  outputSchema: {}
}

export function Tools() {
  const { t } = useI18n()
  const { data: toolsData, isLoading: isLoadingTools } = useTools()
  const { data: queriesData, isLoading: isLoadingQueries } = useQueries()
  const createTool = useCreateTool()
  const updateTool = useUpdateTool()
  const deleteTool = useDeleteTool()

  // Ensure tools and queries are always arrays
  const tools = Array.isArray(toolsData) ? toolsData : []
  const queries = Array.isArray(queriesData) ? queriesData : []

  const [viewMode, setViewMode] = useState<ViewMode>('empty')
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<ToolFormData>>(emptyFormData)
  const [hasChanges, setHasChanges] = useState(false)

  // Load selected tool data
  const { data: selectedTool, isLoading: isLoadingTool } = useTool(selectedToolId || undefined)

  // Update form data when selected tool changes
  useEffect(() => {
    if (selectedTool && viewMode === 'edit') {
      setFormData({
        name: selectedTool.name,
        displayName: selectedTool.displayName,
        description: selectedTool.description,
        queryId: selectedTool.queryId,
        parameters: selectedTool.parameters || [],
        outputSchema: selectedTool.outputSchema || {}
      })
      setHasChanges(false)
    }
  }, [selectedTool, viewMode])

  // Handle form data changes
  const handleFormChange = useCallback((updates: Partial<ToolFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }, [])

  // Handle parameter changes
  const handleParametersChange = useCallback((parameters: ToolParameter[]) => {
    setFormData(prev => ({ ...prev, parameters }))
    setHasChanges(true)
  }, [])

  // Handle output schema changes
  const handleOutputSchemaChange = useCallback((outputSchema: Record<string, unknown>) => {
    setFormData(prev => ({ ...prev, outputSchema }))
    setHasChanges(true)
  }, [])

  // Create new tool
  const handleCreateNew = useCallback(() => {
    setSelectedToolId(null)
    setFormData(emptyFormData)
    setViewMode('create')
    setHasChanges(false)
  }, [])

  // Select tool for editing
  const handleSelectTool = useCallback((tool: Tool) => {
    setSelectedToolId(tool.id)
    setViewMode('edit')
  }, [])

  // Delete tool
  const handleDeleteTool = useCallback(async (id: string) => {
    await deleteTool.mutateAsync(id)
    if (selectedToolId === id) {
      setSelectedToolId(null)
      setViewMode('empty')
    }
  }, [deleteTool, selectedToolId])

  // Save tool
  const handleSave = useCallback(async () => {
    if (!formData.name || !formData.displayName || !formData.queryId) {
      return
    }

    const data: ToolFormData = {
      name: formData.name || '',
      displayName: formData.displayName || '',
      description: formData.description || '',
      queryId: formData.queryId || '',
      parameters: formData.parameters || [],
      outputSchema: formData.outputSchema || {}
    }

    try {
      if (viewMode === 'create') {
        const newTool = await createTool.mutateAsync(data)
        setSelectedToolId(newTool.id)
        setViewMode('edit')
      } else if (viewMode === 'edit' && selectedToolId) {
        await updateTool.mutateAsync({ id: selectedToolId, data })
      }
      setHasChanges(false)
    } catch {
      // Error handled by hooks
    }
  }, [formData, viewMode, selectedToolId, createTool, updateTool])

  // Cancel editing
  const handleCancel = useCallback(() => {
    if (viewMode === 'create') {
      setViewMode('empty')
      setFormData(emptyFormData)
    } else if (selectedTool) {
      setFormData({
        name: selectedTool.name,
        displayName: selectedTool.displayName,
        description: selectedTool.description,
        queryId: selectedTool.queryId,
        parameters: selectedTool.parameters || [],
        outputSchema: selectedTool.outputSchema || {}
      })
    }
    setHasChanges(false)
  }, [viewMode, selectedTool])

  // Check if form is valid
  const isFormValid = Boolean(formData.name && formData.displayName && formData.queryId && formData.description)
  const isSaving = createTool.isPending || updateTool.isPending

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left Column - Tool List (30%) */}
      <div className="w-[30%] min-w-[280px] max-w-[400px] border-r bg-muted/30">
        <ToolList
          tools={tools}
          isLoading={isLoadingTools}
          selectedToolId={selectedToolId || undefined}
          onSelect={handleSelectTool}
          onCreateNew={handleCreateNew}
          onDelete={handleDeleteTool}
        />
      </div>

      {/* Right Column - Tool Editor (70%) */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'empty' && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <Wrench className="h-16 w-16 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {t.tools?.selectPrompt || 'Select a tool or create a new one'}
            </h3>
            <p className="text-sm mb-4">
              {t.tools?.selectPromptDesc || 'Choose a tool from the list or click the New button to create one'}
            </p>
            <Button onClick={handleCreateNew}>
              <Wrench className="h-4 w-4 mr-2" />
              {t.tools?.createNew || 'Create New Tool'}
            </Button>
          </div>
        )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between bg-background">
              <div>
                <h2 className="text-lg font-semibold">
                  {viewMode === 'create'
                    ? (t.tools?.createTitle || 'Create New Tool')
                    : (formData.displayName || t.tools?.editTitle || 'Edit Tool')
                  }
                </h2>
                {viewMode === 'edit' && formData.name && (
                  <p className="text-sm text-muted-foreground">
                    <code>{formData.name}</code>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                    <X className="h-4 w-4 mr-1" />
                    {t.common?.cancel || 'Cancel'}
                  </Button>
                )}
                <Button onClick={handleSave} disabled={!isFormValid || isSaving}>
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving
                    ? (t.common?.saving || 'Saving...')
                    : (t.common?.save || 'Save')
                  }
                </Button>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-auto p-6">
              {isLoadingTool ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  {t.common?.loading || 'Loading...'}
                </div>
              ) : (
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="basic">
                      {t.tools?.tabs?.basic || 'Basic Info'}
                    </TabsTrigger>
                    <TabsTrigger value="parameters">
                      {t.tools?.tabs?.parameters || 'Parameters'}
                    </TabsTrigger>
                    <TabsTrigger value="output">
                      {t.tools?.tabs?.output || 'Output Schema'}
                    </TabsTrigger>
                    <TabsTrigger value="test" disabled={viewMode === 'create'}>
                      {t.tools?.tabs?.test || 'Test'}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t.tools?.basicInfo?.title || 'Basic Information'}</CardTitle>
                        <CardDescription>
                          {t.tools?.basicInfo?.description || 'Configure the basic properties of your tool.'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ToolForm
                          data={formData}
                          onChange={handleFormChange}
                          queries={queries}
                          isLoadingQueries={isLoadingQueries}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="parameters">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t.tools?.parametersTab?.title || 'Parameters'}</CardTitle>
                        <CardDescription>
                          {t.tools?.parametersTab?.description || 'Configure how parameters are exposed to AI models.'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ParameterEditor
                          queryId={formData.queryId}
                          parameters={formData.parameters || []}
                          onChange={handleParametersChange}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="output">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t.tools?.outputTab?.title || 'Output Schema'}</CardTitle>
                        <CardDescription>
                          {t.tools?.outputTab?.description || 'Define the JSON Schema for the tool output.'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <OutputSchemaEditor
                          toolId={selectedToolId || undefined}
                          parameters={formData.parameters || []}
                          outputSchema={formData.outputSchema || {}}
                          onChange={handleOutputSchemaChange}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="test">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t.tools?.testTab?.title || 'Test Tool'}</CardTitle>
                        <CardDescription>
                          {t.tools?.testTab?.description || 'Test your tool with sample parameters and view the MCP definition.'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ToolTestPanel
                          toolId={selectedToolId || undefined}
                          parameters={formData.parameters || []}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
