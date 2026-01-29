import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/i18n/I18nContext'
import type { DataSource, DataSourceFormData, DataSourceType } from '@/types'

// Base schema for type inference
const baseFormSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['mysql', 'postgresql', 'sqlserver', 'oracle']),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string(),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof baseFormSchema>

// Schema with translations for validation messages
const createFormSchema = (t: ReturnType<typeof useI18n>['t']) => z.object({
  name: z.string().min(1, t.dataSources.form.name),
  type: z.enum(['mysql', 'postgresql', 'sqlserver', 'oracle']),
  host: z.string().min(1, t.dataSources.form.host),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1, t.dataSources.form.database),
  username: z.string().min(1, t.dataSources.form.username),
  password: z.string(),
  description: z.string().optional(),
})

interface DataSourceFormProps {
  dataSource?: DataSource
  onSubmit: (data: DataSourceFormData) => void
  onCancel: () => void
  onTestConnection?: () => void
  isSubmitting?: boolean
  isTesting?: boolean
}

const DEFAULT_PORTS: Record<DataSourceType, number> = {
  mysql: 3306,
  postgresql: 5432,
  sqlserver: 1433,
  oracle: 1521,
}

export function DataSourceForm({
  dataSource,
  onSubmit,
  onCancel,
  onTestConnection,
  isSubmitting = false,
  isTesting = false,
}: DataSourceFormProps) {
  const { t } = useI18n()
  const [showPassword, setShowPassword] = useState(false)

  const formSchema = createFormSchema(t)
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: dataSource
      ? {
          name: dataSource.name,
          type: dataSource.type,
          host: dataSource.host,
          port: dataSource.port,
          database: dataSource.database,
          username: dataSource.username,
          password: '', // Don't populate password for security
          description: dataSource.description || '',
        }
      : {
          name: '',
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          database: '',
          username: '',
          password: '',
          description: '',
        },
  })

  // Update port when database type changes
  useEffect(() => {
    const subscription = form.watch((value: Partial<FormValues>, { name }: { name?: string }) => {
      if (name === 'type' && value.type) {
        const currentPort = form.getValues('port')
        const defaultPort = DEFAULT_PORTS[value.type as DataSourceType]

        // Only update if port is still at a default value
        if (Object.values(DEFAULT_PORTS).includes(currentPort)) {
          form.setValue('port', defaultPort)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.dataSources.form.name}</FormLabel>
              <FormControl>
                <Input placeholder={t.dataSources.form.namePlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.dataSources.form.type}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t.dataSources.form.typePlaceholder} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="sqlserver">SQL Server</SelectItem>
                  <SelectItem value="oracle">Oracle</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Host and Port */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="host"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>{t.dataSources.form.host}</FormLabel>
                <FormControl>
                  <Input placeholder={t.dataSources.form.hostPlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.dataSources.form.port}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="5432"
                    {...field}
                    value={field.value}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? 0 : parseInt(value, 10))
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Database */}
        <FormField
          control={form.control}
          name="database"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.dataSources.form.database}</FormLabel>
              <FormControl>
                <Input placeholder={t.dataSources.form.databasePlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Username */}
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.dataSources.form.username}</FormLabel>
              <FormControl>
                <Input placeholder={t.dataSources.form.usernamePlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.dataSources.form.password}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={dataSource ? t.dataSources.form.passwordKeepHint : t.dataSources.form.passwordPlaceholder}
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t.common.hidePassword : t.common.showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </FormControl>
              {dataSource && (
                <FormDescription>{t.dataSources.form.passwordKeepHint}</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.dataSources.form.descriptionOptional}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t.dataSources.form.descriptionPlaceholder}
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {onTestConnection && (
              <Button
                type="button"
                variant="outline"
                onClick={onTestConnection}
                disabled={isTesting || isSubmitting}
              >
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.dataSources.form.testConnection}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dataSource ? t.common.update : t.common.create}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
