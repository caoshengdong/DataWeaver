import { useMemo, useState } from 'react'
import { Search, Plus, Wrench, Server, ChevronDown, ChevronRight, MoreHorizontal, Trash2, Edit } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Tool } from '@/types'
import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/utils'

interface ToolListProps {
  tools: Tool[]
  isLoading?: boolean
  selectedToolId?: string
  onSelect: (tool: Tool) => void
  onCreateNew: () => void
  onDelete: (id: string) => void
}

interface ToolGroup {
  serverId: string | null
  serverName: string
  tools: Tool[]
}

export function ToolList({
  tools,
  isLoading,
  selectedToolId,
  onSelect,
  onCreateNew,
  onDelete
}: ToolListProps) {
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['ungrouped']))
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; tool: Tool | null }>({
    open: false,
    tool: null
  })

  // Filter tools by search query
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return tools
    const query = searchQuery.toLowerCase()
    return tools.filter(tool =>
      tool.name.toLowerCase().includes(query) ||
      tool.displayName.toLowerCase().includes(query) ||
      tool.description?.toLowerCase().includes(query)
    )
  }, [tools, searchQuery])

  // Group tools by MCP Server
  const groupedTools = useMemo(() => {
    const groups: Map<string, ToolGroup> = new Map()

    for (const tool of filteredTools) {
      const key = tool.mcpServerId || 'ungrouped'
      if (!groups.has(key)) {
        groups.set(key, {
          serverId: tool.mcpServerId || null,
          serverName: tool.mcpServerId ? `MCP Server ${tool.mcpServerId.slice(0, 8)}` : (t.tools?.list?.ungrouped || 'Ungrouped'),
          tools: []
        })
      }
      groups.get(key)!.tools.push(tool)
    }

    // Sort groups: ungrouped first, then by server name
    return Array.from(groups.values()).sort((a, b) => {
      if (a.serverId === null) return -1
      if (b.serverId === null) return 1
      return a.serverName.localeCompare(b.serverName)
    })
  }, [filteredTools, t])

  // Toggle group expansion
  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Handle delete confirmation
  const handleDeleteClick = (tool: Tool, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirm({ open: true, tool })
  }

  const handleDeleteConfirm = () => {
    if (deleteConfirm.tool) {
      onDelete(deleteConfirm.tool.id)
    }
    setDeleteConfirm({ open: false, tool: null })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {t.tools?.list?.title || 'Tools'}
          </h2>
          <Button size="sm" onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-1" />
            {t.tools?.list?.create || 'New'}
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.tools?.list?.searchPlaceholder || 'Search tools...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tool list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              {t.common?.loading || 'Loading...'}
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mb-2 opacity-50" />
              <p>{searchQuery ? (t.tools?.list?.noResults || 'No tools found') : (t.tools?.list?.empty || 'No tools yet')}</p>
              {!searchQuery && (
                <Button variant="link" onClick={onCreateNew}>
                  {t.tools?.list?.createFirst || 'Create your first tool'}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {groupedTools.map((group) => {
                const groupKey = group.serverId || 'ungrouped'
                const isExpanded = expandedGroups.has(groupKey)

                return (
                  <Collapsible
                    key={groupKey}
                    open={isExpanded}
                    onOpenChange={() => toggleGroup(groupKey)}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-all duration-150 cursor-pointer">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Server className="h-4 w-4" />
                        <span className="flex-1 text-left">{group.serverName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {group.tools.length}
                        </Badge>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                      {group.tools.map((tool) => (
                        <div
                          key={tool.id}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all duration-150 group',
                            selectedToolId === tool.id
                              ? 'bg-primary/10 text-primary shadow-sm'
                              : 'hover:bg-muted active:scale-[0.99] motion-reduce:active:scale-100'
                          )}
                          onClick={() => onSelect(tool)}
                        >
                          <Wrench className="h-4 w-4 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {tool.displayName}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              <code>{tool.name}</code>
                            </div>
                          </div>
                          <Badge
                            variant={tool.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs shrink-0"
                          >
                            {tool.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={t.common?.moreOptions || 'More options'}
                              >
                                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onSelect(tool)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t.common?.edit || 'Edit'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => handleDeleteClick(tool, e)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t.common?.delete || 'Delete'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, tool: deleteConfirm.tool })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.tools?.list?.deleteTitle || 'Delete Tool'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.tools?.list?.deleteConfirm || 'Are you sure you want to delete this tool? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common?.cancel || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.common?.delete || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
