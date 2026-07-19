import "server-only";

import { hasTrustedMutationOriginFromHeaders } from "@/lib/request-origin";

export function hasTrustedMutationOrigin(request: Request) {
  return hasTrustedMutationOriginFromHeaders(request.headers);
}
