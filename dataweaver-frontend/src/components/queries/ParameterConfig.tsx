import { useMemo, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { QueryParameter, QueryParameterType } from '@/types'
import { useI18n } from '@/i18n/I18nContext'

interface ParameterConfigProps {
  parameters: QueryParameter[]
  onChange: (parameters: QueryParameter[]) => void
  extractedParams?: string[]
}

interface SortableParameterItemProps {
  parameter: QueryParameter
  onUpdate: (id: string, updates: Partial<QueryParameter>) => void
  onDelete: (id: string) => void
}

const parameterTypes: { value: QueryParameterType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
]

function SortableParameterItem({ parameter, onUpdate, onDelete }: SortableParameterItemProps) {
  const { t } = useI18n()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: parameter.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-muted/30 border rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1 font-medium text-sm">
          :{parameter.name}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(parameter.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t.queries?.paramConfig?.type || 'Type'}</Label>
          <Select
            value={parameter.type}
            onValueChange={(value: QueryParameterType) =>
              onUpdate(parameter.id, { type: value })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {parameterTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{t.queries?.paramConfig?.defaultValue || 'Default Value'}</Label>
          <Input
            className="h-9"
            placeholder={t.queries?.paramConfig?.defaultValuePlaceholder || 'Optional'}
            value={parameter.defaultValue || ''}
            onChange={(e) =>
              onUpdate(parameter.id, { defaultValue: e.target.value || undefined })
            }
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t.queries?.paramConfig?.description || 'Description'}</Label>
        <Input
          className="h-9"
          placeholder={t.queries?.paramConfig?.descriptionPlaceholder || 'Parameter description...'}
          value={parameter.description || ''}
          onChange={(e) =>
            onUpdate(parameter.id, { description: e.target.value || undefined })
          }
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={`required-${parameter.id}`}
          checked={parameter.required}
          onCheckedChange={(checked) =>
            onUpdate(parameter.id, { required: !!checked })
          }
        />
        <Label htmlFor={`required-${parameter.id}`} className="text-xs cursor-pointer">
          {t.queries?.paramConfig?.required || 'Required'}
        </Label>
      </div>
    </div>
  )
}

export function ParameterConfig({ parameters, onChange, extractedParams = [] }: ParameterConfigProps) {
  const { t } = useI18n()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Find parameters in SQL that aren't configured yet
  const unconfiguredParams = useMemo(() => {
    const configuredNames = new Set(parameters.map((p) => p.name))
    return extractedParams.filter((name) => !configuredNames.has(name))
  }, [parameters, extractedParams])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = parameters.findIndex((p) => p.id === active.id)
      const newIndex = parameters.findIndex((p) => p.id === over.id)
      onChange(arrayMove(parameters, oldIndex, newIndex))
    }
  }, [parameters, onChange])

  const handleUpdate = useCallback((id: string, updates: Partial<QueryParameter>) => {
    onChange(
      parameters.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      )
    )
  }, [parameters, onChange])

  const handleDelete = useCallback((id: string) => {
    onChange(parameters.filter((p) => p.id !== id))
  }, [parameters, onChange])

  const handleAddParameter = useCallback((name: string) => {
    const newParam: QueryParameter = {
      id: crypto.randomUUID(),
      name,
      type: 'string',
      required: true,
      defaultValue: undefined,
      description: undefined,
    }
    onChange([...parameters, newParam])
  }, [parameters, onChange])

  return (
    <div className="space-y-4">
      {unconfiguredParams.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="text-sm text-yellow-500">
                {t.queries?.paramConfig?.unconfiguredParams || 'Unconfigured parameters detected:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {unconfiguredParams.map((name) => (
                  <Button
                    key={name}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleAddParameter(name)}
                  >
                    + :{name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {parameters.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            {t.queries?.paramConfig?.noParams || 'No parameters configured'}
          </p>
          <p className="text-xs mt-1">
            {t.queries?.paramConfig?.noParamsHint || 'Use :paramName syntax in your SQL to define parameters'}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={parameters.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {parameters.map((parameter) => (
                <SortableParameterItem
                  key={parameter.id}
                  parameter={parameter}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
