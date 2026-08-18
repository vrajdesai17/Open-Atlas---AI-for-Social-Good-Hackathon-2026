"use client";

import { useState } from "react";
import type { DbTask } from "@/lib/db";

export function TaskList({ initialTasks }: { initialTasks: DbTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);

  const toggleTask = async (id: string, currentlyCompleted: boolean) => {
    // Optimistic update
    setTasks(tasks.filter(t => t.id !== id));
    
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentlyCompleted }),
      });
      if (!res.ok) {
        throw new Error("Failed to update task");
      }
    } catch (err) {
      console.error(err);
      // Let it stay removed for simplicity in this demo, or we could revert it
    }
  };

  if (tasks.length === 0) {
    return <p className="text-sm text-muted">No outstanding tasks. Great job!</p>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((t) => (
        <div key={t.id} className="flex gap-4 rounded-xl border border-line bg-card p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-line cursor-pointer"
            checked={t.completed}
            onChange={() => toggleTask(t.id, t.completed)}
          />
          <div>
            <p className="font-medium">{t.title}</p>
            <p className="mt-1 text-sm text-muted">{t.description}</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted">
              <span className="font-medium text-accent">{t.timeframe}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
