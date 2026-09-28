import * as React from "react";
import { Badge } from "@/components/ui/badge";

interface NotificationBadgeProps {
  count?: number;
}

export function NotificationBadge({ count = 0 }: NotificationBadgeProps) {
  return (
    <Badge variant="secondary">
      {count > 0 ? count : /* optional: show dot when zero */ ""}
    </Badge>
  );
}
