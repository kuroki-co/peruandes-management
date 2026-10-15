/** The hotel name is descriptive; only the random token authorizes access. */
export function bookingLinkPath(name: string, token: string): string {
  if (!/^(?:[a-f0-9]{32}|[a-f0-9]{64})$/.test(token))
    throw new Error("Token de reservas inválido.");
  const slug =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70)
      .replace(/-$/, "") || "intermediario";
  const binary = token
    .match(/../g)!
    .map((hex) => String.fromCharCode(parseInt(hex, 16)))
    .join("");
  const code = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `/reservar/${slug}/${code}`;
}

export function bookingTokenFromCode(code: string): string | null {
  if (!/^(?:[A-Za-z0-9_-]{22}|[A-Za-z0-9_-]{43})$/.test(code)) return null;
  const binary = atob(
    code.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (code.length % 4)) % 4),
  );
  const token = Array.from(binary, (char) =>
    char.charCodeAt(0).toString(16).padStart(2, "0"),
  ).join("");
  return bookingLinkPath("hotel", token).split("/").at(-1) === code
    ? token
    : null;
}
