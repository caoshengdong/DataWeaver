import type { LLMProviderConfig, LLMProviderType } from '@/types'

const PROVIDERS: Record<LLMProviderType, LLMProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com',
    modelListEndpoint: '/v1/models',
    authType: 'bearer',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com',
    modelListEndpoint: '',
    authType: 'custom-header',
    authHeader: 'x-api-key',
    hardcodedModels: [
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    ],
  },
  google: {
    id: 'google',
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    modelListEndpoint: '/v1beta/models',
    authType: 'query-param',
  },
  azure: {
    id: 'azure',
    name: 'Azure OpenAI',
    defaultBaseUrl: 'https://<your-resource>.openai.azure.com',
    modelListEndpoint: '',
    authType: 'custom-header',
    authHeader: 'api-key',
    hardcodedModels: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo' },
    ],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    modelListEndpoint: '/v1/models',
    authType: 'bearer',
  },
  qwen: {
    id: 'qwen',
    name: 'Qwen (DashScope)',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
    modelListEndpoint: '/v1/models',
    authType: 'bearer',
  },
  zhipu: {
    id: 'zhipu',
    name: 'Zhipu AI (GLM)',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas',
    modelListEndpoint: '/v4/models',
    authType: 'bearer',
  },
  moonshot: {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    defaultBaseUrl: 'https://api.moonshot.cn',
    modelListEndpoint: '/v1/models',
    authType: 'bearer',
  },
  minimax: {
    id: 'minimax',
    name: 'Minimax',
    defaultBaseUrl: 'https://api.minimax.chat',
    modelListEndpoint: '/v1/models',
    authType: 'bearer',
  },
  baichuan: {
    id: 'baichuan',
    name: 'Baichuan',
    defaultBaseUrl: 'https://api.baichuan-ai.com',
    modelListEndpoint: '',
    authType: 'bearer',
    hardcodedModels: [
      { id: 'Baichuan4', name: 'Baichuan 4' },
      { id: 'Baichuan3-Turbo', name: 'Baichuan 3 Turbo' },
      { id: 'Baichuan3-Turbo-128k', name: 'Baichuan 3 Turbo 128K' },
      { id: 'Baichuan2-Turbo', name: 'Baichuan 2 Turbo' },
    ],
  },
  yi: {
    id: 'yi',
    name: 'Yi (01.AI)',
    defaultBaseUrl: 'https://api.lingyiwanwu.com',
    modelListEndpoint: '/v1/models',
    authType: 'bearer',
  },
}

export const PROVIDER_LIST: LLMProviderConfig[] = [
  PROVIDERS.openai,
  PROVIDERS.anthropic,
  PROVIDERS.google,
  PROVIDERS.azure,
  PROVIDERS.deepseek,
  PROVIDERS.qwen,
  PROVIDERS.zhipu,
  PROVIDERS.moonshot,
  PROVIDERS.minimax,
  PROVIDERS.baichuan,
  PROVIDERS.yi,
]

export function getProviderConfig(provider: LLMProviderType): LLMProviderConfig {
  return PROVIDERS[provider]
}

export function getDefaultBaseUrl(provider: LLMProviderType): string {
  return PROVIDERS[provider].defaultBaseUrl
}

export function supportsModelList(provider: LLMProviderType): boolean {
  return PROVIDERS[provider].modelListEndpoint !== ''
}
