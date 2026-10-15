import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
const input = z
  .object({
    url: z.url(),
    key: z.string().min(1),
    email: z.email(),
    name: z.string().trim().min(2).max(150),
    password: z.string().min(12).max(128),
  })
  .safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SECRET_KEY,
    email: process.argv[2],
    name: process.argv[3],
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });
if (!input.success) {
  console.error(
    'Configura URL, SUPABASE_SECRET_KEY y BOOTSTRAP_ADMIN_PASSWORD (12+ caracteres). Uso: npm run bootstrap:admin -- correo@dominio.com "Nombre completo"',
  );
  process.exit(1);
}
const { url, key, email, name, password } = input.data;
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: existing, error: queryError } = await db
  .from("staff")
  .select("id")
  .eq("role", "superadmin")
  .eq("active", true)
  .limit(1);
if (queryError) {
  console.error(
    "No se pudo consultar staff. Aplica la migración y verifica el destino antes de crear usuarios.",
  );
  process.exit(1);
}
if (existing?.length) {
  console.error(
    "Ya existe un superadministrador activo. Este script solo inicializa la primera cuenta.",
  );
  process.exit(1);
}
const { data, error } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (error || !data.user) {
  console.error(
    "No se pudo crear la cuenta. Revisa si el correo ya existe y la configuración Auth.",
  );
  process.exit(1);
}
const { error: profileError } = await db
  .from("staff")
  .insert({ id: data.user.id, full_name: name, role: "superadmin" });
if (profileError) {
  await db.auth.admin.deleteUser(data.user.id);
  console.error("No se pudo guardar el perfil. La cuenta nueva se revirtió.");
  process.exit(1);
}
console.info(
  "Superadministrador creado. Ingresa desde /login. Retira BOOTSTRAP_ADMIN_PASSWORD del entorno.",
);
