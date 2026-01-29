import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LLMProviderType } from '@/types'
import { getDefaultBaseUrl } from '@/lib/llm-providers'

interface ModelState {
  provider: LLMProviderType
  apiKey: string
  baseUrl: string
  model: string
  isValidated: boolean

  setProvider: (provider: LLMProviderType) => void
  setApiKey: (apiKey: string) => void
  setBaseUrl: (baseUrl: string) => void
  setModel: (model: string) => void
  setIsValidated: (isValidated: boolean) => void
  saveConfig: (config: { provider: LLMProviderType; apiKey: string; baseUrl: string; model: string; isValidated: boolean }) => void
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      provider: 'openai',
      apiKey: '',
      baseUrl: getDefaultBaseUrl('openai'),
      model: '',
      isValidated: false,

      setProvider: (provider) =>
        set({
          provider,
          apiKey: '',
          baseUrl: getDefaultBaseUrl(provider),
          model: '',
          isValidated: false,
        }),

      setApiKey: (apiKey) => set({ apiKey, isValidated: false }),

      setBaseUrl: (baseUrl) => set({ baseUrl, isValidated: false }),

      setModel: (model) => set({ model }),

      setIsValidated: (isValidated) => set({ isValidated }),

      saveConfig: (config) => set(config),
    }),
    {
      name: 'dataweaver-model-storage',
      partialize: (state) => ({
        provider: state.provider,
        apiKey: state.apiKey,
        baseUrl: state.baseUrl,
        model: state.model,
        isValidated: state.isValidated,
      }),
    }
  )
)
