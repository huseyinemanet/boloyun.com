export type AdminUserCreateRole = "admin" | "member";

export type AdminUserCreateValues = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  password: string;
  role: AdminUserCreateRole;
};

export type AdminUserCreateFieldErrors = Partial<Record<keyof AdminUserCreateValues, string>>;

export type AdminUserCreateValidationResult = {
  values: AdminUserCreateValues;
  fieldErrors: AdminUserCreateFieldErrors;
};

export function normalizeAdminUserCreateRole(value: string): AdminUserCreateRole {
  return value === "admin" ? "admin" : "member";
}

export function normalizeAdminUserCreateValues(input: Record<string, unknown>): AdminUserCreateValues {
  return {
    username: String(input.username ?? "").trim(),
    email: String(input.email ?? "").trim(),
    first_name: String(input.first_name ?? "").trim(),
    last_name: String(input.last_name ?? "").trim(),
    display_name: String(input.display_name ?? "").trim(),
    password: String(input.password ?? ""),
    role: normalizeAdminUserCreateRole(String(input.role ?? "member")),
  };
}

export function validateAdminUserCreateValues(values: AdminUserCreateValues): AdminUserCreateFieldErrors {
  const errors: AdminUserCreateFieldErrors = {};

  if (!values.username) errors.username = "Kullanıcı adı gerekli.";
  else if (values.username.length < 3) errors.username = "Kullanıcı adı en az 3 karakter olmalı.";

  if (!values.email) errors.email = "E-posta gerekli.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Geçerli bir e-posta girin.";

  if (!values.password) errors.password = "Geçici şifre gerekli.";
  else if (values.password.length < 8) errors.password = "Geçici şifre en az 8 karakter olmalı.";

  return errors;
}
