import { CheckCircle2, XCircle, Loader2, Database } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useI18n } from '@/i18n/I18nContext'
import type { TestConnectionResult } from '@/types'

interface ConnectionTestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: TestConnectionResult | null
  isLoading: boolean
  onViewTables?: () => void
}

export function ConnectionTestDialog({
  open,
  onOpenChange,
  result,
  isLoading,
  onViewTables,
}: ConnectionTestDialogProps) {
  const { t } = useI18n()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.dataSources.connectionTest.title}</DialogTitle>
          <DialogDescription>
            {t.dataSources.connectionTest.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t.dataSources.connectionTest.testing}</p>
            </div>
          )}

          {!isLoading && result && (
            <div className="space-y-4">
              {/* Success State */}
              {result.success && (
                <>
                  <div className="flex items-center justify-center">
                    <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                      <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold text-lg">{t.dataSources.connectionTest.success}</h3>
                    <p className="text-sm text-muted-foreground">
                      {result.message}
                    </p>
                    {result.latency !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {t.dataSources.connectionTest.latency}: {result.latency}ms
                      </p>
                    )}
                  </div>
                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertDescription>
                      {t.dataSources.connectionTest.configCorrect}
                    </AlertDescription>
                  </Alert>
                </>
              )}

              {/* Error State */}
              {!result.success && (
                <>
                  <div className="flex items-center justify-center">
                    <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
                      <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold text-lg">{t.dataSources.connectionTest.failed}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t.dataSources.connectionTest.failedDesc}
                    </p>
                  </div>
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="break-words">
                      {result.message}
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!isLoading && result?.success && onViewTables && (
            <Button
              variant="outline"
              onClick={() => {
                onViewTables()
                onOpenChange(false)
              }}
              className="w-full sm:w-auto"
            >
              <Database className="mr-2 h-4 w-4" />
              {t.dataSources.actions.viewTables}
            </Button>
          )}
          <Button
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {result?.success ? t.dataSources.connectionTest.done : t.dataSources.connectionTest.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
