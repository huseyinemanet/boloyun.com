import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { encodeKeysetCursor, type KeysetCursor } from "@/lib/keyset-pagination";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons/app-icons";

export function AdminCursorPagination({
  basePath,
  itemCount,
  itemName,
  emptyLabel,
  previousCursor,
  nextCursor,
  query,
  plain = false,
}: {
  basePath: string;
  itemCount: number;
  itemName: string;
  emptyLabel?: string;
  previousCursor: KeysetCursor | null;
  nextCursor: KeysetCursor | null;
  query?: Record<string, string | undefined>;
  plain?: boolean;
}) {
  return (
    <div className={cn(
      "flex flex-wrap items-center justify-between gap-3 text-sm",
      plain ? "py-1" : "rounded-md border border-border bg-card px-3 py-2",
    )}>
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
              <PaginationPrevious href={cursorHref(basePath, previousCursor, "previous", query)} />
            ) : (
              <DisabledPageLink label="Önceki" side="previous" />
            )}
          </PaginationItem>
          <PaginationItem>
            {nextCursor ? (
              <PaginationNext href={cursorHref(basePath, nextCursor, "next", query)} />
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
    <span aria-label={label} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground opacity-45">
      {side === "previous" ? <ChevronLeftIcon className="size-4" aria-hidden="true" /> : <ChevronRightIcon className="size-4" aria-hidden="true" />}
    </span>
  );
}
