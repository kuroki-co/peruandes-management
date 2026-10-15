"use client";

import { useState, useTransition } from "react";
import { LoadingButton } from "@/components/ui/loading";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput, type LoginValues } from "../schema";
import { signIn } from "../sign-in";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isNavigating, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput, unknown, LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setMessage("");
    try {
      const error = await signIn(values);
      if (error) {
        setMessage(
          "No se pudo iniciar sesión. Revisa tus datos e inténtalo de nuevo.",
        );
        return;
      }
      startTransition(() => {
        router.replace("/dashboard");
        router.refresh();
      });
    } catch {
      setMessage("No se pudo conectar. Inténtalo de nuevo en unos momentos.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="login-form"
      aria-busy={isSubmitting || isNavigating}
    >
      {!configured && (
        <p role="status">El acceso estará disponible al conectar Supabase.</p>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="rounded-md border p-3 focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        {errors.email && (
          <p id="email-error" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password">Contraseña</label>
        <div className="password-control">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            {...register("password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="rounded-md border p-3 focus-visible:outline-2 focus-visible:outline-offset-2"
          />
          <button
            type="button"
            className="password-toggle"
            aria-controls="password"
            aria-pressed={showPassword}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <LoadingButton
        type="submit"
        disabled={!configured}
        pending={isSubmitting || isNavigating}
        pendingLabel="Ingresando…"
        className="rounded-md bg-foreground p-3 text-background disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Iniciar sesión
      </LoadingButton>
    </form>
  );
}
