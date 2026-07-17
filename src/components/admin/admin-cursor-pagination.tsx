import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { encodeKeysetCursor, type KeysetCursor } from "@/lib/keyset-pagination";

export function AdminCursorPagination({
  basePath,
  itemCount,
  itemName,
  emptyLabel,
  previousCursor,
  nextCursor,
  query,
}: {
  basePath: string;
  itemCount: number;
  itemName: string;
  emptyLabel?: string;
  previousCursor: KeysetCursor | null;
  nextCursor: KeysetCursor | null;
  query?: Record<string, string | undefined>;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm">
      <p className="shrink-0 text-muted-foreground">
        {itemCount > 0 ? (
          <>
            <span className="font-bold text-foreground">{itemCount.toLocaleString("tr-TR")} {itemName}</span>
            {" gösteriliyor"}
          </>
        ) : (
          emptyLabel ?? (
            <>
              <span className="font-bold text-foreground">0 {itemName}</span>
              {" bulunamadı"}
            </>
          )
        )}
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            {previousCursor ? (
              <PaginationPrevious href={cursorHref(basePath, previousCursor, "previous", query)} text="Önceki" />
            ) : (
              <DisabledPageLink label="Önceki" side="previous" />
            )}
          </PaginationItem>
          <PaginationItem>
            {nextCursor ? (
              <PaginationNext href={cursorHref(basePath, nextCursor, "next", query)} text="Sonraki" />
            ) : (
              <DisabledPageLink label="Sonraki" side="next" />
            )}
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function cursorHref(basePath: string, cursor: KeysetCursor, direction: "next" | "previous", query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) params.set(key, value);
  }
  params.set("cursor", encodeKeysetCursor(cursor));
  params.set("direction", direction);
  return `${basePath}?${params.toString()}`;
}

function DisabledPageLink({ label, side }: { label: string; side: "previous" | "next" }) {
  return (
    <span className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-2.5 text-sm font-bold text-muted-foreground opacity-45">
      {side === "previous" ? <span aria-hidden="true">‹</span> : null}
      <span>{label}</span>
      {side === "next" ? <span aria-hidden="true">›</span> : null}
    </span>
  );
}
