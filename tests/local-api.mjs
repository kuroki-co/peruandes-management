// Servidor de pruebas local. No es un reemplazo de Supabase ni se publica.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`,
);
await db.exec(
  await readFile("supabase/migrations/202610140001_core.sql", "utf8"),
);
const id = randomUUID();
await db.query("insert into auth.users(id) values ($1)", [id]);
await db.query(
  `insert into public.staff(id,full_name,role) values($1,'Administrador de pruebas','superadmin')`,
  [id],
);
const user = {
  id,
  aud: "authenticated",
  role: "authenticated",
  email: "admin@pruebas.local",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: new Date().toISOString(),
};
const makeJwt = () =>
  `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, aud: "authenticated", role: "authenticated", email: user.email, exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })).toString("base64url")}.local-test-only`;
let jwt = makeJwt();
let queue = Promise.resolve();
const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3101");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization,apikey,content-type,x-client-info,x-supabase-api-version",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const path = (req.url ?? "").split("?")[0];
  const respond = (status, value) => {
    res.writeHead(status);
    res.end(JSON.stringify(value));
  };
  if (path === "/auth/v1/token" && req.method === "POST") {
    if (body.email !== user.email || body.password !== "PruebasLocales123!") {
      respond(400, { msg: "Invalid login credentials" });
      return;
    }
    jwt = makeJwt();
    respond(200, {
      access_token: jwt,
      refresh_token: "local-test-refresh",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user,
    });
    return;
  }
  if (path === "/auth/v1/user") {
    respond(200, user);
    return;
  }
  if (path === "/auth/v1/logout") {
    respond(200, {});
    return;
  }
  const name = path.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1];
  if (!name) {
    respond(404, { message: "Endpoint no disponible en pruebas" });
    return;
  }
  const job = async () => {
    try {
      await db.exec("reset role");
      const logged = req.headers.authorization === `Bearer ${jwt}`;
      await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
        logged ? id : "",
      ]);
      await db.exec(`set role ${logged ? "authenticated" : "anon"}`);
      const keys = Object.keys(body);
      if (keys.some((k) => !/^p_[a-z_]+$/.test(k)))
        throw new Error("Argumento inválido");
      const result = await db.query(
        `select public.${name}(${keys.map((k, i) => `${k}=>$${i + 1}`).join(",")}) value`,
        Object.values(body),
      );
      respond(200, result.rows[0].value);
    } catch (error) {
      respond(400, { code: error.code ?? "P0001", message: error.message });
    }
  };
  queue = queue.then(job, job);
});
server.listen(54329, "127.0.0.1", () =>
  console.info(
    "API de pruebas en http://127.0.0.1:54329 · datos efímeros · admin@pruebas.local / PruebasLocales123!",
  ),
);
