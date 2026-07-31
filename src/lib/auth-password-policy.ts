export const AUTH_PASSWORD_MIN_LENGTH = 12;

export function meetsAuthPasswordMinimum(password: string) {
  return password.length >= AUTH_PASSWORD_MIN_LENGTH;
}
