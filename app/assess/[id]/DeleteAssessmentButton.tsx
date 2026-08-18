"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteAssessmentButton({ id }: { id: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this assessment?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/assessments/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/assess");
        router.refresh(); // Refresh the assessments list
      } else {
        throw new Error("Failed to delete assessment");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete assessment");
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-500/20 disabled:opacity-50"
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}
