export type BrevoMarketingContactInput = {
  email: string;
  username?: string;
};

type BrevoContactSyncOptions = {
  apiKey?: string;
  listId?: string;
  fetchImpl?: typeof fetch;
};

type BrevoSyncResult =
  | { ok: true; skipped: false }
  | { ok: true; skipped: true; reason: "missing_config" }
  | { ok: false; skipped: false; reason: string };

export async function syncBrevoMarketingContact(
  input: BrevoMarketingContactInput,
  options: BrevoContactSyncOptions = {},
): Promise<BrevoSyncResult> {
  const apiKey = options.apiKey ?? process.env.BREVO_API_KEY;
  const listId = options.listId ?? process.env.BREVO_MARKETING_LIST_ID;

  if (!apiKey || !listId) {
    return { ok: true, skipped: true, reason: "missing_config" };
  }

  const numericListId = Number(listId);
  if (!Number.isInteger(numericListId) || numericListId <= 0) {
    return { ok: false, skipped: false, reason: "invalid_list_id" };
  }

  const response = await (options.fetchImpl ?? fetch)("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      attributes: {
        FNAME: input.username || undefined,
        USERNAME: input.username || undefined,
        SOURCE: "boloyun.com",
      },
      listIds: [numericListId],
      updateEnabled: true,
    }),
  });

  if (response.ok) {
    return { ok: true, skipped: false };
  }

  return { ok: false, skipped: false, reason: `brevo_${response.status}` };
}
