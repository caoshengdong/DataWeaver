import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Database,
  Search,
  Server,
  Wrench,
  Plus,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
} from 'lucide-react'
import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/utils'
import { useDashboardSummary } from '@/hooks/useDashboard'
import type { QueryHistory, McpServer } from '@/types'

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return `${diffInSeconds}s`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
  return `${Math.floor(diffInSeconds / 86400)}d`
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  bgColor,
  path,
  isLoading,
}: {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  color: string
  bgColor: string
  path: string
  isLoading?: boolean
}) {
  const navigate = useNavigate()
  const { t } = useI18n()

  return (
    <Card
      interactive
      onClick={() => navigate(path)}
      className="group"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn(
          'p-2 rounded-lg transition-colors duration-200',
          bgColor,
          'group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform duration-200'
        )}>
          <Icon className={cn('h-5 w-5', color)} aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {t.common.clickToViewDetails}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Quick Action Card Component
function QuickActionCard({
  title,
  description,
  icon: Icon,
  color,
  onClick,
}: {
  title: string
  description: string
  icon: React.ElementType
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        'bg-card hover:bg-accent transition-colors duration-200',
        'text-left w-full group'
      )}
    >
      <div className={cn('p-2 rounded-lg', color)}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

// Recent Queries Table Component
function RecentQueriesTable({
  queries,
  isLoading,
}: {
  queries: QueryHistory[]
  isLoading: boolean
}) {
  const { t } = useI18n()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (queries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">{t.dashboard.noRecentQueries}</p>
        <Button
          variant="link"
          size="sm"
          onClick={() => navigate('/queries')}
          className="mt-2"
        >
          {t.dashboard.createQuery}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.dashboard.queryHistory.name}</TableHead>
          <TableHead>{t.dashboard.queryHistory.status}</TableHead>
          <TableHead className="text-right">{t.dashboard.queryHistory.rows}</TableHead>
          <TableHead className="text-right">{t.dashboard.queryHistory.time}</TableHead>
          <TableHead className="text-right">{t.dashboard.queryHistory.executedAt}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {queries.slice(0, 5).map((query) => (
          <TableRow key={query.id}>
            <TableCell className="font-medium max-w-[150px] truncate">
              {query.queryName || `Query ${query.queryId.slice(0, 8)}`}
            </TableCell>
            <TableCell>
              {query.status === 'success' ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t.dashboard.queryHistory.success}
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {t.dashboard.queryHistory.error}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {query.rowCount ?? '-'}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {query.executionTime ? `${query.executionTime}${t.dashboard.queryHistory.ms}` : '-'}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {formatRelativeTime(query.createdAt)} {t.dashboard.queryHistory.ago}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// MCP Server Status Component
function McpServerStatusList({
  servers,
  isLoading,
}: {
  servers: McpServer[]
  isLoading: boolean
}) {
  const { t } = useI18n()
  const navigate = useNavigate()

  const statusColors: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success'; label: string }> = {
    draft: { variant: 'secondary', label: t.dashboard.serverStatus.draft },
    published: { variant: 'success', label: t.dashboard.serverStatus.published },
    stopped: { variant: 'outline', label: t.dashboard.serverStatus.stopped },
    error: { variant: 'destructive', label: t.dashboard.serverStatus.error },
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Server className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">{t.dashboard.noMcpServers}</p>
        <Button
          variant="link"
          size="sm"
          onClick={() => navigate('/mcp-servers')}
          className="mt-2"
        >
          {t.dashboard.createMcpServer}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {servers.slice(0, 4).map((server) => {
        const status = statusColors[server.status] || statusColors.draft
        return (
          <div
            key={server.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => navigate(`/mcp-servers/${server.id}/monitoring`)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                'p-2 rounded-lg',
                server.status === 'published' ? 'bg-green-500/10' : 'bg-muted'
              )}>
                <Server className={cn(
                  'h-4 w-4',
                  server.status === 'published' ? 'text-green-500' : 'text-muted-foreground'
                )} />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{server.name}</p>
                <p className="text-xs text-muted-foreground">
                  {server.toolIds?.length || 0} {t.dashboard.serverStatus.tools}
                  {server.endpoint && (
                    <span className="ml-2 text-primary">
                      {server.endpoint}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Badge variant={status.variant}>
              {status.label}
            </Badge>
          </div>
        )
      })}
    </div>
  )
}

export function Dashboard() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { stats, recentQueries, mcpServers, isLoading } = useDashboardSummary()

  const statCards = [
    {
      title: t.dashboard.stats.dataSources,
      value: stats.dataSourcesCount,
      subtitle: `${stats.activeDataSources} ${t.dashboard.stats.active}`,
      icon: Database,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      path: '/datasources',
    },
    {
      title: t.dashboard.stats.queries,
      value: stats.queriesCount,
      icon: Search,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      path: '/queries',
    },
    {
      title: t.dashboard.stats.tools,
      value: stats.toolsCount,
      icon: Wrench,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      path: '/tools',
    },
    {
      title: t.dashboard.stats.mcpServers,
      value: stats.mcpServersCount,
      subtitle: `${stats.publishedMcpServers} ${t.dashboard.stats.published}`,
      icon: Server,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      path: '/mcp-servers',
    },
  ]

  const quickActions = [
    {
      title: t.dashboard.createDataSource,
      description: t.dashboard.createDataSourceDesc,
      icon: Database,
      color: 'bg-blue-500',
      onClick: () => navigate('/datasources'),
    },
    {
      title: t.dashboard.createQuery,
      description: t.dashboard.createQueryDesc,
      icon: Search,
      color: 'bg-green-500',
      onClick: () => navigate('/queries'),
    },
    {
      title: t.dashboard.createTool,
      description: t.dashboard.createToolDesc,
      icon: Wrench,
      color: 'bg-yellow-500',
      onClick: () => navigate('/tools'),
    },
    {
      title: t.dashboard.createMcpServer,
      description: t.dashboard.createMcpServerDesc,
      icon: Server,
      color: 'bg-purple-500',
      onClick: () => navigate('/mcp-servers'),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t.dashboard.title}</h1>
        <p className="text-muted-foreground mt-1">{t.dashboard.welcomeDesc}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard
            key={stat.path}
            {...stat}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Queries - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                {t.dashboard.recentQueries}
              </CardTitle>
              <CardDescription>
                {t.dashboard.queryHistory.executedAt}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/queries')}
              className="gap-1"
            >
              {t.dashboard.viewAllQueries}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <RecentQueriesTable queries={recentQueries} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Quick Actions - Takes 1 column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              {t.dashboard.quickActions}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <QuickActionCard key={action.title} {...action} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* MCP Server Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-500" />
              {t.dashboard.mcpServerStatus}
            </CardTitle>
            <CardDescription>
              {t.dashboard.serverStatus.endpoint}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/mcp-servers')}
            className="gap-1"
          >
            {t.dashboard.viewAllServers}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <McpServerStatusList servers={mcpServers} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
