import apiClient from './client'
import type {
  Query,
  QueryFormData,
  QueryResult,
  QueryHistory,
  QueryExecuteApiResponse,
  QueryHistoryApiResponse,
  ApiResponse,
  PaginatedResponse
} from '@/types'

// Transform frontend data to backend API format (snake_case)
function toApiFormat(data: QueryFormData | Partial<QueryFormData>) {
  return {
    name: data.name,
    data_source_id: data.dataSourceId,
    sql_template: data.sql,
    description: data.description,
    parameters: data.parameters?.map(p => ({
      name: p.name,
      type: p.type,
      required: p.required,
      default: p.defaultValue,
      description: p.description,
    })),
  }
}

// Transform backend API response to frontend format (camelCase)
function fromApiFormat(apiData: Record<string, unknown>): Query {
  const params = apiData.parameters as Array<{
    name: string
    type: string
    required: boolean
    default?: string
    description?: string
  }> | undefined

  return {
    id: apiData.id as string,
    name: apiData.name as string,
    dataSourceId: (apiData.data_source_id || apiData.dataSourceId) as string,
    sql: (apiData.sql_template || apiData.sqlTemplate || apiData.sql) as string,
    description: apiData.description as string | undefined,
    parameters: params?.map(p => ({
      id: crypto.randomUUID(),
      name: p.name,
      type: p.type as Query['parameters'][0]['type'],
      required: p.required,
      defaultValue: p.default as string | undefined,
      description: p.description,
    })) || [],
    createdAt: (apiData.created_at || apiData.createdAt) as string,
    updatedAt: (apiData.updated_at || apiData.updatedAt) as string,
  }
}

export const queriesApi = {
  // Get all queries
  list: async () => {
    const response = await apiClient.get<ApiResponse<Record<string, unknown>[]>>('/v1/queries')
    return {
      ...response,
      data: {
        ...response.data,
        data: (response.data.data || []).map(fromApiFormat)
      }
    }
  },

  // Get a single query by ID
  get: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Record<string, unknown>>>(`/v1/queries/${id}`)
    return {
      ...response,
      data: {
        ...response.data,
        data: fromApiFormat(response.data.data)
      }
    }
  },

  // Create a new query
  create: async (data: QueryFormData) => {
    const response = await apiClient.post<ApiResponse<Record<string, unknown>>>('/v1/queries', toApiFormat(data))
    return {
      ...response,
      data: {
        ...response.data,
        data: fromApiFormat(response.data.data)
      }
    }
  },

  // Update an existing query
  update: async (id: string, data: Partial<QueryFormData>) => {
    const response = await apiClient.put<ApiResponse<Record<string, unknown>>>(`/v1/queries/${id}`, toApiFormat(data))
    return {
      ...response,
      data: {
        ...response.data,
        data: fromApiFormat(response.data.data)
      }
    }
  },

  // Delete a query
  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/v1/queries/${id}`),

  // Execute a query with parameters
  execute: async (id: string, parameters: Record<string, unknown>) => {
    const response = await apiClient.post<ApiResponse<QueryExecuteApiResponse>>(`/v1/queries/${id}/execute`, { parameters })
    const apiData = response.data.data
    // Transform backend response to frontend format
    const result: QueryResult = {
      columns: apiData?.columns || [],
      rows: apiData?.data || [],
      rowCount: apiData?.row_count ?? 0,
      executionTime: apiData?.execution_time_ms ?? 0,
    }
    return {
      ...response,
      data: {
        ...response.data,
        data: result
      }
    }
  },

  // Validate SQL syntax (backend only needs sql_template)
  validate: (_dataSourceId: string, sql: string) =>
    apiClient.post<ApiResponse<{ valid: boolean; message?: string }>>('/v1/queries/validate', {
      sql_template: sql
    }),

  // Format SQL
  format: (sql: string) =>
    apiClient.post<ApiResponse<{ formattedSql: string }>>('/v1/queries/format', { sql }),

  // Get query execution history
  getHistory: async (queryId?: string, page = 1, pageSize = 20) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<QueryHistoryApiResponse>>>('/v1/queries/history', {
      params: { queryId, page, pageSize }
    })

    // Transform backend response to frontend format
    const apiData = response.data.data
    const transformedData: PaginatedResponse<QueryHistory> = {
      ...apiData,
      data: (apiData?.data || []).map((item: QueryHistoryApiResponse) => ({
        id: item.id,
        queryId: item.query_id,
        queryName: item.query_name || '',
        parameters: item.parameters || {},
        status: item.status === 'success' ? 'success' : 'error',
        rowCount: item.row_count,
        executionTime: item.execution_time_ms,
        errorMessage: item.error_message,
        createdAt: item.created_at,
      }))
    }

    return {
      ...response,
      data: {
        ...response.data,
        data: transformedData
      }
    }
  },
}
