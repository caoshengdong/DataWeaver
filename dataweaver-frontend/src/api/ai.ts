import type { LLMModel, LLMProviderType } from '@/types'
import { getProviderConfig, supportsModelList } from '@/lib/llm-providers'

interface OpenAIModelResponse {
  data: { id: string; owned_by?: string }[]
}

interface GoogleModelResponse {
  models: { name: string; displayName: string }[]
}

export async function fetchModelsDirect(
  provider: LLMProviderType,
  apiKey: string,
  baseUrl: string,
): Promise<LLMModel[]> {
  const config = getProviderConfig(provider)

  if (!supportsModelList(provider)) {
    return config.hardcodedModels ?? []
  }

  const url = new URL(config.modelListEndpoint, baseUrl)

  const headers: Record<string, string> = {}

  if (config.authType === 'bearer') {
    headers['Authorization'] = `Bearer ${apiKey}`
  } else if (config.authType === 'query-param') {
    url.searchParams.set('key', apiKey)
  } else if (config.authType === 'custom-header' && config.authHeader) {
    headers[config.authHeader] = apiKey
  }

  const response = await fetch(url.toString(), { headers })

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (provider === 'google') {
    const googleData = data as GoogleModelResponse
    return googleData.models
      .filter((m) => m.name.startsWith('models/gemini'))
      .map((m) => ({
        id: m.name.replace('models/', ''),
        name: m.displayName,
      }))
  }

  // OpenAI-compatible format
  const openaiData = data as OpenAIModelResponse
  return openaiData.data.map((m) => ({
    id: m.id,
    name: m.id,
  }))
}

export async function fetchModels(
  provider: LLMProviderType,
  apiKey: string,
  baseUrl: string,
): Promise<LLMModel[]> {
  const config = getProviderConfig(provider)

  try {
    return await fetchModelsDirect(provider, apiKey, baseUrl)
  } catch {
    // Fall back to hardcoded models if direct fetch fails (e.g., CORS)
    return config.hardcodedModels ?? []
  }
}
