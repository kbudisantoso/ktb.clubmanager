'use client';

import { SlidersHorizontal, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// ============================================================================
// Types
// ============================================================================

interface ColumnPickerProps<K extends string> {
  /** Column visibility state */
  columns: Record<K, boolean>;
  /** Column display order */
  order: K[];
  /** Labels for each column key */
  labels: Record<K, string>;
  /** Called when a column is toggled */
  onToggle: (key: K) => void;
  /** Called when columns are reordered */
  onReorder: (order: K[]) => void;
  /** Called when columns are reset to defaults */
  onReset: () => void;
  /** Whether the current state matches defaults */
  isDefault: boolean;
}

// ============================================================================
// SortableColumnItem
// ============================================================================

interface SortableColumnItemProps {
  columnKey: string;
  label: string;
  isVisible: boolean;
  onToggle: () => void;
}

function SortableColumnItem({ columnKey, label, isVisible, onToggle }: SortableColumnItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: columnKey,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-accent"
    >
      <button
        type="button"
        className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Checkbox id={`col-${columnKey}`} checked={isVisible} onCheckedChange={onToggle} />
      <label htmlFor={`col-${columnKey}`} className="flex-1 cursor-pointer select-none text-sm">
        {label}
      </label>
    </div>
  );
}

// ============================================================================
// ColumnPicker
// ============================================================================

/**
 * Reusable popover for toggling column visibility and reordering columns
 * via drag-and-drop in data tables.
 */
export function ColumnPicker<K extends string>({
  columns,
  order,
  labels,
  onToggle,
  onReorder,
  onReset,
  isDefault,
}: ColumnPickerProps<K>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = order.indexOf(active.id as K);
    const newIndex = order.indexOf(over.id as K);

    const newOrder = [...order];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);

    onReorder(newOrder);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal />
          Spalten
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3">
        <div className="mb-2 text-sm font-medium">Spalten</div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {order.map((key) => (
                <SortableColumnItem
                  key={key}
                  columnKey={key}
                  label={labels[key]}
                  isVisible={columns[key]}
                  onToggle={() => onToggle(key)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Separator className="my-2" />
        <Button
          variant="ghost"
          size="sm"
          disabled={isDefault}
          onClick={onReset}
          className="w-full justify-start"
        >
          Zurücksetzen
        </Button>
      </PopoverContent>
    </Popover>
  );
}
