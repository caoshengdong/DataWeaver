import apiClient from './client'
import type {
  Tool,
  ToolFormData,
  ToolTestResult,
  ToolApiResponse,
  ToolTestApiResponse,
  ApiResponse,
} from '@/types'

// Transform backend API response to frontend format
function fromApiFormat(apiData: ToolApiResponse): Tool {
  return {
    id: apiData.id,
    name: apiData.name,
    displayName: apiData.display_name,
    description: apiData.description,
    queryId: apiData.query_id,
    parameters: apiData.parameters || [],
    outputSchema: apiData.output_schema || {},
    version: apiData.version,
    mcpServerId: apiData.mcp_server_id,
    status: apiData.status as 'active' | 'inactive',
    createdAt: apiData.created_at,
    updatedAt: apiData.updated_at,
    query: apiData.query,
  }
}

// Transform frontend data to backend API format
function toApiFormat(data: ToolFormData | Partial<ToolFormData>) {
  return {
    name: data.name,
    display_name: data.displayName,
    description: data.description,
    query_id: data.queryId,
    parameters: data.parameters,
    output_schema: data.outputSchema,
  }
}

export const toolsApi = {
  // Get all tools
  list: async () => {
    const response = await apiClient.get<ApiResponse<ToolApiResponse[]>>('/v1/tools')
    return {
      ...response,
      data: {
        ...response.data,
        data: (response.data.data || []).map(fromApiFormat)
      }
    }
  },

  // Get a single tool by ID
  get: async (id: string) => {
    const response = await apiClient.get<ApiResponse<ToolApiResponse>>(`/v1/tools/${id}`)
    return {
      ...response,
      data: {
        ...response.data,
        data: fromApiFormat(response.data.data)
      }
    }
  },

  // Create a new tool
  create: async (data: ToolFormData) => {
    const response = await apiClient.post<ApiResponse<ToolApiResponse>>('/v1/tools', toApiFormat(data))
    return {
      ...response,
      data: {
        ...response.data,
        data: fromApiFormat(response.data.data)
      }
    }
  },

  // Create tool from query
  createFromQuery: async (queryId: string, data: { displayName?: string; description?: string; customName?: string }) => {
    const response = await apiClient.post<ApiResponse<ToolApiResponse>>(`/v1/queries/${queryId}/create-tool`, {
      display_name: data.displayName,
      description: data.description,
      custom_name: data.customName,
    })
    return {
      ...response,
      data: {
        ...response.data,
        data: fromApiFormat(response.data.data)
      }
    }
  },

  // Update an existing tool
  update: async (id: string, data: Partial<ToolFormData>) => {
    const response = await apiClient.put<ApiResponse<ToolApiResponse>>(`/v1/tools/${id}`, toApiFormat(data))
    return {
      ...response,
      data: {
        ...response.data,
        data: fromApiFormat(response.data.data)
      }
    }
  },

  // Delete a tool
  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/v1/tools/${id}`),

  // Test a tool
  test: async (id: string, parameters: Record<string, unknown>) => {
    const response = await apiClient.post<ApiResponse<ToolTestApiResponse>>(`/v1/tools/${id}/test`, { parameters })
    const apiData = response.data.data
    const result: ToolTestResult = {
      success: apiData?.success ?? false,
      message: apiData?.message ?? '',
      executionTimeMs: apiData?.execution_time_ms ?? 0,
      rowCount: apiData?.row_count ?? 0,
      data: apiData?.data,
      columns: apiData?.columns,
    }
    return {
      ...response,
      data: {
        ...response.data,
        data: result
      }
    }
  },

  // Generate description using AI
  generateDescription: async (queryId: string, useAI = true) => {
    const response = await apiClient.post<ApiResponse<{ description: string; generated: boolean }>>(`/v1/queries/${queryId}/generate-description`, {
      use_ai: useAI
    })
    return response.data.data
  },

  // Get MCP tool definition (for export)
  getMCPDefinition: async (id: string) => {
    const response = await apiClient.get<ApiResponse<{ name: string; description: string; input_schema: Record<string, unknown> }>>(`/v1/tools/${id}/mcp-definition`)
    return response.data.data
  },
}
