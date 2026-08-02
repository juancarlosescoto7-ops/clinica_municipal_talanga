const INTERNAL_AUTH_DOMAIN = "siemc.local";
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/;

export function normalizeUsername(value: string): string {
  const username = value.trim().toLocaleLowerCase("es");

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      "El usuario debe tener entre 3 y 32 caracteres y usar solo letras, números, punto, guion o guion bajo.",
    );
  }

  return username;
}

export function usernameToInternalEmail(value: string): string {
  return `${normalizeUsername(value)}@${INTERNAL_AUTH_DOMAIN}`;
}

export function internalEmailToUsername(email: string | undefined): string {
  if (!email) {
    return "Usuario";
  }

  const suffix = `@${INTERNAL_AUTH_DOMAIN}`;

  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : "Usuario";
}
