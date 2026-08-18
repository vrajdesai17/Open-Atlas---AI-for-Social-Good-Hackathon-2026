"use client";

import { useState } from "react";
import type { DbTask } from "@/lib/db";

export function AssessmentTaskEditor({
  assessmentId,
  initialTasks,
}: {
  assessmentId: string;
  initialTasks: DbTask[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskTimeframe, setNewTaskTimeframe] = useState("30_days");
  const [isAdding, setIsAdding] = useState(false);

  const toggleTask = async (id: string, currentlyCompleted: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !currentlyCompleted } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentlyCompleted }),
      });
      if (!res.ok) throw new Error("Failed to update task");
    } catch (err) {
      console.error(err);
      // Revert optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: currentlyCompleted } : t))
      );
    }
  };

  const updateTask = async (id: string, updates: { title?: string; description?: string }) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update task");
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete task");
    } catch (err) {
      console.error(err);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDescription.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDescription,
          timeframe: newTaskTimeframe,
        }),
      });

      if (!res.ok) throw new Error("Failed to add task");

      const data = await res.json();

      const newTask: DbTask = {
        id: data.id,
        assessmentId,
        userEmail: "", // Local state only
        criterionId: "", // Local state only
        title: newTaskTitle,
        description: newTaskDescription,
        timeframe: newTaskTimeframe,
        completed: false,
        createdAt: new Date(),
      };

      setTasks((prev) => [...prev, newTask]);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskTimeframe("30_days");
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {tasks.length === 0 ? (
        <p className="text-sm text-muted">No tasks available.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <div key={t.id} className="flex gap-4 rounded-xl border border-line bg-card p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-line"
                checked={t.completed}
                onChange={() => toggleTask(t.id, t.completed)}
              />
              <div className="flex-1">
                <input
                  type="text"
                  className="w-full bg-transparent font-medium focus:outline-none"
                  defaultValue={t.title}
                  onBlur={(e) => {
                    if (e.target.value !== t.title) {
                      updateTask(t.id, { title: e.target.value });
                    }
                  }}
                />
                <textarea
                  className="mt-1 w-full resize-none bg-transparent text-sm text-muted focus:outline-none"
                  defaultValue={t.description}
                  rows={2}
                  onBlur={(e) => {
                    if (e.target.value !== t.description) {
                      updateTask(t.id, { description: e.target.value });
                    }
                  }}
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-accent capitalize">{t.timeframe.replace("_", " ")}</span>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addTask} className="rounded-xl border border-line bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">Add a task</h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Task title"
            className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm focus:border-accent focus:outline-none"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Task description"
            className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm focus:border-accent focus:outline-none"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            required
            rows={2}
          />
          <div className="flex items-center gap-3">
            <select
              className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm focus:border-accent focus:outline-none"
              value={newTaskTimeframe}
              onChange={(e) => setNewTaskTimeframe(e.target.value)}
            >
              <option value="30_days">30 days</option>
              <option value="60_days">60 days</option>
              <option value="180_days">180 days</option>
            </select>
            <button
              type="submit"
              disabled={isAdding}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
            >
              {isAdding ? "Adding..." : "Add task"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
