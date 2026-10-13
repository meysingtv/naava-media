"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

/** Absende-Button v3: nutzt den `loading`-Zustand des Buttons. */
export function SubmitButton({ children, disabled, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={disabled} {...props}>
      {children}
    </Button>
  );
}
