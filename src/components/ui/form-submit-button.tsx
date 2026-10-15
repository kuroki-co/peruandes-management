"use client";
import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";
import { LoadingButton } from "./loading";

export function FormSubmitButton({
  pendingLabel,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <LoadingButton
      {...props}
      type="submit"
      pending={pending}
      pendingLabel={pendingLabel}
    />
  );
}
