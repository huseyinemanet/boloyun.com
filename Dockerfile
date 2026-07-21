# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@11.15.1 --activate
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS builder
ARG DEPLOYMENT_VERSION
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG SITE_URL=https://boloyun.com
ENV DEPLOYMENT_VERSION=$DEPLOYMENT_VERSION
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV SITE_URL=$SITE_URL
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN --mount=type=cache,id=next-build-cache,target=/app/.next/cache \
    --mount=type=secret,id=supabase_service_role_key,required=true \
    SUPABASE_SERVICE_ROLE_KEY="$(cat /run/secrets/supabase_service_role_key)" pnpm build

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# Supabase Auth custom SMTP is configured in the Supabase control plane.
# This non-secret marker lets the admin status page report that external setup.
ENV SUPABASE_AUTH_SMTP_PROVIDER=brevo
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs --home-dir /app --shell /usr/sbin/nologin nextjs
WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Next standalone tracing preserves sharp's package links but can omit the
# payload of its platform-specific optional packages. Copy those native
# packages explicitly and fail the image build if libvips cannot be loaded.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.pnpm/@img+sharp-linux-x64@0.35.3 ./node_modules/.pnpm/@img+sharp-linux-x64@0.35.3
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.pnpm/@img+sharp-libvips-linux-x64@1.3.2 ./node_modules/.pnpm/@img+sharp-libvips-linux-x64@1.3.2
RUN node -e "require('/app/node_modules/.pnpm/sharp@0.35.3_@types+node@24.13.3/node_modules/sharp')"
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
