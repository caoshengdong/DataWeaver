import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queriesApi } from '@/api/queries'
import type { QueryFormData } from '@/types'
import { toast } from 'sonner'

// Query key factory
export const queryKeys = {
  all: ['queries'] as const,
  lists: () => [...queryKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...queryKeys.lists(), filters] as const,
  details: () => [...queryKeys.all, 'detail'] as const,
  detail: (id: string) => [...queryKeys.details(), id] as const,
  history: (queryId?: string) => [...queryKeys.all, 'history', queryId] as const,
}

// Get all queries
export function useQueries() {
  return useQuery({
    queryKey: queryKeys.lists(),
    queryFn: async () => {
      const response = await queriesApi.list()
      return response.data.data
    },
  })
}

// Get a single query
export function useQueryDetail(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.detail(id) : ['queries', 'none'],
    queryFn: async () => {
      if (!id) return null
      const response = await queriesApi.get(id)
      return response.data.data
    },
    enabled: !!id,
  })
}

// Create a new query
export function useCreateQuery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: QueryFormData) => {
      const response = await queriesApi.create(data)
      return response.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() })
      toast.success('查询创建成功！')
      return data
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || '创建查询失败')
    },
  })
}

// Update an existing query
export function useUpdateQuery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<QueryFormData> }) => {
      const response = await queriesApi.update(id, data)
      return response.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(data.id) })
      toast.success('查询更新成功！')
      return data
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || '更新查询失败')
    },
  })
}

// Delete a query
export function useDeleteQuery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await queriesApi.delete(id)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() })
      toast.success('查询删除成功！')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || '删除查询失败')
    },
  })
}

// Execute a query
export function useExecuteQuery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, parameters }: { id: string; parameters: Record<string, unknown> }) => {
      const response = await queriesApi.execute(id, parameters)
      return response.data.data
    },
    onSuccess: () => {
      // Invalidate history to show new execution
      queryClient.invalidateQueries({ queryKey: queryKeys.history() })
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || '执行查询失败')
    },
  })
}

// Validate SQL syntax
export function useValidateSql() {
  return useMutation({
    mutationFn: async ({ dataSourceId, sql }: { dataSourceId: string; sql: string }) => {
      const response = await queriesApi.validate(dataSourceId, sql)
      return response.data.data
    },
  })
}

// Format SQL
export function useFormatSql() {
  return useMutation({
    mutationFn: async (sql: string) => {
      const response = await queriesApi.format(sql)
      return response.data.data
    },
  })
}

// Get query execution history
export function useQueryHistory(queryId?: string) {
  return useQuery({
    queryKey: queryKeys.history(queryId),
    queryFn: async () => {
      const response = await queriesApi.getHistory(queryId)
      return response.data.data
    },
  })
}
