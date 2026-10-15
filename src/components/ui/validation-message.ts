export function validationMessage(
  errors: unknown,
  depth = 0,
): string | undefined {
  if (!errors || typeof errors !== "object" || depth > 5) return;
  if ("message" in errors && typeof errors.message === "string")
    return errors.message;
  for (const [key, value] of Object.entries(errors)) {
    if (key === "ref" || key === "types") continue;
    const message = validationMessage(value, depth + 1);
    if (message) return message;
  }
}
