import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useModelStore } from '@/stores/useModelStore'
import { useModelList, useValidateKey } from '@/hooks/useModels'
import { PROVIDER_LIST } from '@/lib/llm-providers'
import { useI18n } from '@/i18n/I18nContext'
import type { LLMProviderType } from '@/types'
import { Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react'

export function ModelSettings() {
  const { t } = useI18n()
  const store = useModelStore()

  // Local state for inputs — only committed to store on validate/save
  const [localProvider, setLocalProvider] = useState<LLMProviderType>(store.provider)
  const [localApiKey, setLocalApiKey] = useState(store.apiKey)
  const [localBaseUrl, setLocalBaseUrl] = useState(store.baseUrl)
  const [localModel, setLocalModel] = useState(store.model)
  const [localValidated, setLocalValidated] = useState(store.isValidated)

  const [showApiKey, setShowApiKey] = useState(false)

  const validateMutation = useValidateKey()

  const { data: models } = useModelList(
    localProvider,
    localApiKey,
    localBaseUrl,
    localValidated,
  )

  // When provider changes, reset local state
  const handleProviderChange = (provider: LLMProviderType) => {
    const providerConfig = PROVIDER_LIST.find((p) => p.id === provider)
    setLocalProvider(provider)
    setLocalApiKey('')
    setLocalBaseUrl(providerConfig?.defaultBaseUrl ?? '')
    setLocalModel('')
    setLocalValidated(false)
    validateMutation.reset()
  }

  // Sync from store on mount (in case localStorage had persisted data)
  useEffect(() => {
    setLocalProvider(store.provider)
    setLocalApiKey(store.apiKey)
    setLocalBaseUrl(store.baseUrl)
    setLocalModel(store.model)
    setLocalValidated(store.isValidated)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleValidate = () => {
    validateMutation.mutate(
      { provider: localProvider, apiKey: localApiKey, baseUrl: localBaseUrl },
      {
        onSuccess: () => {
          setLocalValidated(true)
        },
        onError: () => {
          setLocalValidated(false)
        },
      }
    )
  }

  const handleSave = () => {
    store.saveConfig({
      provider: localProvider,
      apiKey: localApiKey,
      baseUrl: localBaseUrl,
      model: localModel,
      isValidated: localValidated,
    })
  }

  const hasModels = localValidated && models && models.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.models.title}</CardTitle>
        <CardDescription>{t.settings.models.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider */}
        <div className="grid gap-2">
          <Label htmlFor="provider">{t.settings.models.provider}</Label>
          <Select value={localProvider} onValueChange={(v) => handleProviderChange(v as LLMProviderType)}>
            <SelectTrigger id="provider">
              <SelectValue placeholder={t.settings.models.providerPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_LIST.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* API Key */}
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="model-api-key">{t.settings.models.apiKey}</Label>
            {localValidated && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {t.settings.models.validated}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="model-api-key"
                type={showApiKey ? 'text' : 'password'}
                value={localApiKey}
                onChange={(e) => {
                  setLocalApiKey(e.target.value)
                  setLocalValidated(false)
                  validateMutation.reset()
                }}
                placeholder={t.settings.models.apiKeyPlaceholder}
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
                aria-label={showApiKey ? t.common.hidePassword : t.common.showPassword}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={handleValidate}
              disabled={!localApiKey || !localBaseUrl || validateMutation.isPending}
            >
              {validateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.settings.models.validate}
            </Button>
          </div>
          {validateMutation.isError && (
            <p className="text-sm text-destructive">{t.settings.models.validateError}</p>
          )}
        </div>

        {/* Base URL */}
        <div className="grid gap-2">
          <Label htmlFor="model-base-url">{t.settings.models.baseUrl}</Label>
          <Input
            id="model-base-url"
            value={localBaseUrl}
            onChange={(e) => {
              setLocalBaseUrl(e.target.value)
              setLocalValidated(false)
              validateMutation.reset()
            }}
            placeholder={t.settings.models.baseUrlPlaceholder}
          />
          <p className="text-xs text-muted-foreground">{t.settings.models.baseUrlHint}</p>
        </div>

        {/* Model */}
        <div className="grid gap-2">
          <Label htmlFor="model-select">{t.settings.models.model}</Label>
          {hasModels ? (
            <Select value={localModel} onValueChange={setLocalModel}>
              <SelectTrigger id="model-select">
                <SelectValue placeholder={t.settings.models.modelPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name !== m.id ? `${m.name} (${m.id})` : m.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="model-select"
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              placeholder={t.settings.models.modelManualPlaceholder}
            />
          )}
          <p className="text-xs text-muted-foreground">
            {localValidated ? t.settings.models.modelHintValidated : t.settings.models.modelHintManual}
          </p>
        </div>

        {/* Save */}
        <Button onClick={handleSave}>{t.settings.models.saveConfig}</Button>
      </CardContent>
    </Card>
  )
}
