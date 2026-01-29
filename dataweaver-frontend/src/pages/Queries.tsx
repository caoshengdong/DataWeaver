import { useState, useCallback } from 'react'
import { Plus, FileCode, Search, MoreVertical, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { QueryBuilder } from '@/components/queries'
import { useQueries, useDeleteQuery } from '@/hooks/useQueries'
import type { Query } from '@/types'
import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/utils'

type ViewMode = 'empty' | 'create' | 'edit'

export function Queries() {
  const { t } = useI18n()
  const { data: queriesData, isLoading } = useQueries()
  const deleteQuery = useDeleteQuery()

  // Ensure queries is always an array
  const queries = Array.isArray(queriesData) ? queriesData : []

  const [viewMode, setViewMode] = useState<ViewMode>('empty')
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [queryToDelete, setQueryToDelete] = useState<Query | null>(null)

  // Filter queries based on search
  const filteredQueries = queries.filter((q) =>
    q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateNew = useCallback(() => {
    setSelectedQueryId(null)
    setViewMode('create')
  }, [])

  const handleSelectQuery = useCallback((query: Query) => {
    setSelectedQueryId(query.id)
    setViewMode('edit')
  }, [])

  const handleEditQuery = useCallback((query: Query) => {
    setSelectedQueryId(query.id)
    setViewMode('edit')
  }, [])

  const handleDeleteClick = useCallback((query: Query, e: React.MouseEvent) => {
    e.stopPropagation()
    setQueryToDelete(query)
    setDeleteDialogOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (queryToDelete) {
      await deleteQuery.mutateAsync(queryToDelete.id)
      if (selectedQueryId === queryToDelete.id) {
        setSelectedQueryId(null)
        setViewMode('empty')
      }
      setQueryToDelete(null)
      setDeleteDialogOpen(false)
    }
  }, [queryToDelete, deleteQuery, selectedQueryId])

  const handleQuerySaved = useCallback((query: Query) => {
    setSelectedQueryId(query.id)
    setViewMode('edit')
  }, [])

  return (
    <div className="h-[calc(100vh-4rem)] flex -m-6">
      {/* Left Sidebar - Query List */}
      <div className="w-72 min-w-[240px] border-r flex flex-col bg-muted/30">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t.queries?.title || 'Queries'}</h2>
            <Button size="sm" onClick={handleCreateNew}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.queries?.searchPlaceholder || 'Search queries...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Query List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading && (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {t.common?.loading || 'Loading...'}
              </div>
            )}

            {!isLoading && filteredQueries.length === 0 && (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {queries.length === 0
                  ? (t.queries?.noQueries || 'No queries yet')
                  : (t.queries?.noResults || 'No matching queries')}
              </div>
            )}

            {filteredQueries.map((query) => (
              <div
                key={query.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 group",
                  selectedQueryId === query.id && "bg-muted"
                )}
                onClick={() => handleSelectQuery(query)}
              >
                <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{query.name}</p>
                  {query.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {query.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditQuery(query)}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t.common?.edit || 'Edit'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => handleDeleteClick(query, e as unknown as React.MouseEvent)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t.common?.delete || 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'empty' && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <FileCode className="h-16 w-16 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {t.queries?.selectPrompt || 'Select a query or create a new one'}
            </h3>
            <p className="text-sm mb-4">
              {t.queries?.selectPromptDesc || 'Choose a query from the list or click the + button to create a new one'}
            </p>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              {t.queries?.createNew || 'Create New Query'}
            </Button>
          </div>
        )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <QueryBuilder
            key={selectedQueryId || 'new'}
            queryId={selectedQueryId || undefined}
            onQuerySaved={handleQuerySaved}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.queries?.deleteConfirm || 'Delete Query'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.queries?.deleteConfirmDesc?.replace('{name}', queryToDelete?.name || '') ||
                `Are you sure you want to delete "${queryToDelete?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common?.cancel || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.common?.delete || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
