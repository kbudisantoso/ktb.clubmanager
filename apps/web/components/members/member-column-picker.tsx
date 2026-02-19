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

import type { ColumnKey } from '@/hooks/use-column-visibility';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// ============================================================================
// Constants
// ============================================================================

/** Labels for each column */
const COLUMN_LABELS: Record<ColumnKey, string> = {
  name: 'Name',
  memberNumber: 'Nr.',
  status: 'Status',
  email: 'E-Mail',
  phone: 'Telefon',
  household: 'Haushalt',
  membershipType: 'Mitgliedschaft',
  joinDate: 'Eintritt',
  notes: 'Notizen',
};

// ============================================================================
// Types
// ============================================================================

interface MemberColumnPickerProps {
  columns: Record<ColumnKey, boolean>;
  order: ColumnKey[];
  onToggle: (key: ColumnKey) => void;
  onReorder: (order: ColumnKey[]) => void;
  onReset: () => void;
  isDefault: boolean;
}

// ============================================================================
// SortableColumnItem
// ============================================================================

interface SortableColumnItemProps {
  columnKey: ColumnKey;
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
      className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-accent"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Checkbox id={`col-${columnKey}`} checked={isVisible} onCheckedChange={onToggle} />
      <label htmlFor={`col-${columnKey}`} className="flex-1 text-sm cursor-pointer select-none">
        {label}
      </label>
    </div>
  );
}

// ============================================================================
// MemberColumnPicker
// ============================================================================

/**
 * Popover for toggling column visibility and reordering columns
 * via drag-and-drop in the member list table.
 */
export function MemberColumnPicker({
  columns,
  order,
  onToggle,
  onReorder,
  onReset,
  isDefault,
}: MemberColumnPickerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = order.indexOf(active.id as ColumnKey);
    const newIndex = order.indexOf(over.id as ColumnKey);

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
        <div className="font-medium text-sm mb-2">Spalten</div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {order.map((key) => (
                <SortableColumnItem
                  key={key}
                  columnKey={key}
                  label={COLUMN_LABELS[key]}
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
