import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ModelSettings } from '@/components/settings/ModelSettings'
import { useAppStore } from '@/stores/useAppStore'
import { useI18n } from '@/i18n/I18nContext'

export function Settings() {
  const { t } = useI18n()
  const { theme, setTheme } = useAppStore()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t.settings.title}</h1>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">{t.settings.tabs.general}</TabsTrigger>
          <TabsTrigger value="appearance">{t.settings.tabs.appearance}</TabsTrigger>
          <TabsTrigger value="models">{t.settings.tabs.models}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.profile.title}</CardTitle>
              <CardDescription>{t.settings.profile.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t.settings.profile.name}</Label>
                <Input id="name" placeholder={t.settings.profile.namePlaceholder} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t.settings.profile.email}</Label>
                <Input id="email" type="email" placeholder={t.settings.profile.emailPlaceholder} autoComplete="email" />
              </div>
              <Button>{t.settings.profile.saveChanges}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.theme.title}</CardTitle>
              <CardDescription>{t.settings.theme.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => {
                    setTheme('light')
                    document.documentElement.classList.remove('dark')
                  }}
                >
                  {t.settings.theme.light}
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => {
                    setTheme('dark')
                    document.documentElement.classList.add('dark')
                  }}
                >
                  {t.settings.theme.dark}
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  onClick={() => setTheme('system')}
                >
                  {t.settings.theme.system}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <ModelSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
