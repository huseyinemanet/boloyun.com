export const AUTH_PASSWORD_MIN_LENGTH = 8;

export function meetsAuthPasswordMinimum(password: string) {
  return password.length >= AUTH_PASSWORD_MIN_LENGTH;
}
