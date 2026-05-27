"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { categoryMeta } from "@/lib/categories";
import { setHabitStatus, deleteHabit, reorderHabits } from "@/app/actions";
import type { Habit } from "@/lib/types";

type Row = {
  habit: Habit;
  streak: number;
  best: number;
  rate30: number;
};

function DragHandle({ listeners, attributes }: { listeners?: ReturnType<typeof useSortable>["listeners"]; attributes?: ReturnType<typeof useSortable>["attributes"] }) {
  return (
    <button
      type="button"
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-700 p-1 -ml-1 transition"
      aria-label="reorder"
      title="Drag to reorder"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
      </svg>
    </button>
  );
}

function SortableRow({ row }: { row: Row }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.habit.id });
  const [, startTransition] = useTransition();
  const cat = categoryMeta(row.habit.category);

  const diffChip: Record<string, string> = {
    easy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    medium: "bg-amber-50 text-amber-700 ring-amber-200",
    hard: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        boxShadow: isDragging ? "0 10px 30px rgba(15, 23, 42, 0.15)" : undefined,
        position: "relative",
        zIndex: isDragging ? 10 : undefined,
      }}
      className="hover:bg-slate-50/50 transition group bg-white"
    >
      <td className="px-3 py-4">
        <DragHandle listeners={listeners} attributes={attributes} />
      </td>
      <td className="px-3 py-4">
        <Link href={`/habits/${row.habit.id}`} className="flex items-center gap-3 group/link">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ring-1 ${cat.bg} ${cat.ring} shrink-0`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
              <path d={cat.icon} />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900 group-hover/link:underline">{row.habit.name}</p>
            {row.habit.goal_target > 1 && (
              <p className="text-xs text-slate-500">{row.habit.goal_target}{row.habit.goal_unit ? " " + row.habit.goal_unit : ""}</p>
            )}
          </div>
        </Link>
      </td>
      <td className="px-3 py-4">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${cat.bg} ${cat.color} ring-1 ${cat.ring}`}>
          {row.habit.category}
        </span>
      </td>
      <td className="px-3 py-4 text-slate-700 font-medium capitalize">{row.habit.frequency}</td>
      <td className="px-3 py-4">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ring-1 ${diffChip[row.habit.difficulty] ?? diffChip.medium}`}>
          {row.habit.difficulty}
        </span>
      </td>
      <td className="px-3 py-4 text-right font-bold text-slate-900 tabular-nums">
        <span className="inline-flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500">
            <path d="M13.5 0c-2.5 5.5-7 7-7 12 0 4 3 7 7 7s7-3 7-7c0-3.5-2.5-5-3.5-9-1 2-1.5 3-3.5 3 0-2 1-4 0-6z" />
          </svg>
          {row.streak}
        </span>
      </td>
      <td className="px-3 py-4 text-right font-semibold text-slate-600 tabular-nums">{row.best}</td>
      <td className="px-3 py-4 text-right">
        <span className={`font-bold tabular-nums ${row.rate30 >= 80 ? "text-emerald-700" : row.rate30 >= 50 ? "text-amber-700" : "text-rose-700"}`}>
          {row.rate30}%
        </span>
      </td>
      <td className="px-3 py-4 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => {
              startTransition(async () => {
                await setHabitStatus(row.habit.id, "paused");
                toast(`${row.habit.name} paused`);
              });
            }}
            className="px-2 py-1 text-xs font-semibold text-slate-700 rounded-md hover:bg-slate-100"
          >
            Pause
          </button>
          <button
            onClick={() => {
              startTransition(async () => {
                await setHabitStatus(row.habit.id, "archived");
                toast(`${row.habit.name} archived`);
              });
            }}
            className="px-2 py-1 text-xs font-semibold text-slate-700 rounded-md hover:bg-slate-100"
          >
            Archive
          </button>
          <button
            onClick={() => {
              if (!confirm(`Delete "${row.habit.name}"?`)) return;
              startTransition(async () => {
                await deleteHabit(row.habit.id);
                toast.success("Deleted");
              });
            }}
            className="px-2 py-1 text-xs font-semibold text-rose-600 rounded-md hover:bg-rose-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export function SortableHabitsTable({ rows: initialRows }: { rows: Row[] }) {
  const [rows, setRows] = useState(initialRows);
  const [, startTransition] = useTransition();

  // Sync when server data changes
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.habit.id === active.id);
    const newIndex = rows.findIndex((r) => r.habit.id === over.id);
    const next = arrayMove(rows, oldIndex, newIndex);
    setRows(next);
    startTransition(async () => {
      try {
        await reorderHabits(next.map((r) => r.habit.id));
      } catch {
        toast.error("Couldn't save order");
        setRows(rows); // revert
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <p className="text-sm text-slate-600 font-medium">No active habits.</p>
        <p className="text-xs text-slate-500 mt-1">
          Click <b>New habit</b> to add your first one.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50/50 border-b border-slate-100">
          <tr className="text-left">
            <th className="px-3 py-3"></th>
            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Habit</th>
            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Category</th>
            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Schedule</th>
            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Difficulty</th>
            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Streak</th>
            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Best</th>
            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">30d</th>
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={rows.map((r) => r.habit.id)} strategy={verticalListSortingStrategy}>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <SortableRow key={r.habit.id} row={r} />
              ))}
            </tbody>
          </SortableContext>
        </DndContext>
      </table>
    </div>
  );
}
