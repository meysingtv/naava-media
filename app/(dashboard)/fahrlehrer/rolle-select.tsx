"use client";

import { useTransition } from "react";

import { fahrlehrerRolleSetzen } from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FahrlehrerRolle } from "@/lib/types";

export function RolleSelect({ id, rolle }: { id: string; rolle: FahrlehrerRolle }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={rolle}
      disabled={pending}
      onValueChange={(v) => startTransition(() => fahrlehrerRolleSetzen(id, v as FahrlehrerRolle))}
    >
      <SelectTrigger className="h-8 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="chef">Chef</SelectItem>
        <SelectItem value="fahrlehrer">Fahrlehrer</SelectItem>
        <SelectItem value="buero">Büro</SelectItem>
      </SelectContent>
    </Select>
  );
}
