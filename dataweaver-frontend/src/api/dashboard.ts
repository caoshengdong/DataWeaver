import apiClient from './client'
import type { ApiResponse } from '@/types'

// Dashboard statistics types
export interface DashboardStats {
  dataSourcesCount: number
  queriesCount: number
  toolsCount: number
  mcpServersCount: number
  activeDataSources: number
  publishedMcpServers: number
  totalQueryExecutions: number
  totalMcpCalls: number
}

export interface DashboardStatsApiResponse {
  data_sources_count: number
  queries_count: number
  tools_count: number
  mcp_servers_count: number
  active_data_sources: number
  published_mcp_servers: number
  total_query_executions: number
  total_mcp_calls: number
}

// Transform API response to frontend format
function fromApiFormat(apiData: DashboardStatsApiResponse): DashboardStats {
  return {
    dataSourcesCount: apiData.data_sources_count ?? 0,
    queriesCount: apiData.queries_count ?? 0,
    toolsCount: apiData.tools_count ?? 0,
    mcpServersCount: apiData.mcp_servers_count ?? 0,
    activeDataSources: apiData.active_data_sources ?? 0,
    publishedMcpServers: apiData.published_mcp_servers ?? 0,
    totalQueryExecutions: apiData.total_query_executions ?? 0,
    totalMcpCalls: apiData.total_mcp_calls ?? 0,
  }
}

export const dashboardApi = {
  // Get dashboard statistics
  getStats: async () => {
    const response = await apiClient.get<ApiResponse<DashboardStatsApiResponse>>('/v1/dashboard/stats')
    return {
      ...response,
      data: {
        ...response.data,
        data: fromApiFormat(response.data.data)
      }
    }
  },
}
