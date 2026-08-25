export type AdminRouteError = {
  error?: string;
  message?: string;
  code?: string;
  continueUrl?: string;
};

export function redirectForAdminRouteError(response: Response, payload: AdminRouteError | null | undefined) {
  if (response.status !== 403 || payload?.code !== "admin_mfa_required" || !payload.continueUrl) return false;
  window.location.assign(payload.continueUrl);
  return true;
}
