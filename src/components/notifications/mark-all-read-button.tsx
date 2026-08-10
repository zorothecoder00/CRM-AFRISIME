"use client";

import { useState } from "react";
import { markAllAsRead } from "@/actions/notification.actions";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    try {
      await markAllAsRead();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isSubmitting}>
      Tout marquer comme lu
    </Button>
  );
}
