import { useQuery, useMutation } from '@tanstack/react-query'
import type { LLMProviderType } from '@/types'
import { fetchModels } from '@/api/ai'

export function useModelList(
  provider: LLMProviderType,
  apiKey: string,
  baseUrl: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['models', provider, apiKey, baseUrl],
    queryFn: () => fetchModels(provider, apiKey, baseUrl),
    enabled: enabled && !!apiKey && !!baseUrl,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useValidateKey() {
  return useMutation({
    mutationFn: async ({
      provider,
      apiKey,
      baseUrl,
    }: {
      provider: LLMProviderType
      apiKey: string
      baseUrl: string
    }) => {
      const models = await fetchModels(provider, apiKey, baseUrl)
      return models
    },
  })
}
