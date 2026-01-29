import { useQuery } from '@tanstack/react-query'
import { dashboardApi, type DashboardStats } from '@/api/dashboard'
import { dataSourcesApi } from '@/api/datasources'
import { queriesApi } from '@/api/queries'
import { toolsApi } from '@/api/tools'
import { mcpServersApi } from '@/api/mcpServers'
import type { DataSource, Query, Tool, McpServer, QueryHistory } from '@/types'

// Query key factory
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
}

// Get dashboard statistics from dedicated endpoint
export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async () => {
      try {
        const response = await dashboardApi.getStats()
        return response.data.data
      } catch {
        // If the dedicated endpoint doesn't exist, return null
        // The component will fall back to counting from individual APIs
        return null
      }
    },
    retry: false,
    staleTime: 30000, // 30 seconds
  })
}

// Aggregated dashboard data from multiple sources
export interface DashboardSummary {
  stats: DashboardStats
  recentQueries: QueryHistory[]
  mcpServers: McpServer[]
  dataSources: DataSource[]
  isLoading: boolean
  isError: boolean
}

// Hook to get all dashboard data aggregated
export function useDashboardSummary() {
  // Fetch all data sources
  const dataSourcesQuery = useQuery({
    queryKey: ['datasources', 'list'],
    queryFn: async () => {
      const response = await dataSourcesApi.list()
      return response.data.data as DataSource[]
    },
    staleTime: 30000,
  })

  // Fetch all queries
  const queriesQuery = useQuery({
    queryKey: ['queries', 'list'],
    queryFn: async () => {
      const response = await queriesApi.list()
      return response.data.data as Query[]
    },
    staleTime: 30000,
  })

  // Fetch all tools
  const toolsQuery = useQuery({
    queryKey: ['tools', 'list'],
    queryFn: async () => {
      const response = await toolsApi.list()
      return response.data.data as Tool[]
    },
    staleTime: 30000,
  })

  // Fetch all MCP servers
  const mcpServersQuery = useQuery({
    queryKey: ['mcpServers', 'list'],
    queryFn: async () => {
      const response = await mcpServersApi.list()
      return response.data.data as McpServer[]
    },
    staleTime: 30000,
  })

  // Fetch query history (recent executions)
  const queryHistoryQuery = useQuery({
    queryKey: ['queries', 'history'],
    queryFn: async () => {
      const response = await queriesApi.getHistory(undefined, 1, 10)
      return response.data.data.data as QueryHistory[]
    },
    staleTime: 30000,
  })

  const isLoading = dataSourcesQuery.isLoading || queriesQuery.isLoading ||
                    toolsQuery.isLoading || mcpServersQuery.isLoading ||
                    queryHistoryQuery.isLoading

  const isError = dataSourcesQuery.isError || queriesQuery.isError ||
                  toolsQuery.isError || mcpServersQuery.isError

  const dataSources = dataSourcesQuery.data || []
  const queries = queriesQuery.data || []
  const tools = toolsQuery.data || []
  const mcpServers = mcpServersQuery.data || []
  const recentQueries = queryHistoryQuery.data || []

  // Calculate statistics
  const stats: DashboardStats = {
    dataSourcesCount: dataSources.length,
    queriesCount: queries.length,
    toolsCount: tools.length,
    mcpServersCount: mcpServers.length,
    activeDataSources: dataSources.filter(ds => ds.status === 'active').length,
    publishedMcpServers: mcpServers.filter(s => s.status === 'published').length,
    totalQueryExecutions: recentQueries.length,
    totalMcpCalls: mcpServers.reduce((sum, s) => sum + (s.toolIds?.length || 0), 0),
  }

  return {
    stats,
    recentQueries,
    mcpServers,
    dataSources,
    queries,
    tools,
    isLoading,
    isError,
  }
}
