import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons/app-icons";

export function AdminPagination({
  currentPage,
  perPage,
  total,
  basePath,
  itemName,
  pathStyle = "query",
  queryParams,
  variant = "card",
  pageWindow = 3,
}: {
  currentPage: number;
  perPage: number;
  total: number;
  basePath: string;
  itemName: string;
  pathStyle?: "query" | "segment";
  queryParams?: Record<string, string>;
  variant?: "card" | "plain";
  pageWindow?: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(total, currentPage * perPage);
  const pages = getAdminPaginationPages(currentPage, totalPages, pageWindow);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 text-sm ${variant === "card" ? "rounded-md border border-border bg-card px-3 py-2" : ""}`}>
      <p className="shrink-0 text-muted-foreground">
        {total === 0 ? (
          <>Henüz {itemName} yok.</>
        ) : (
          <>
            <span className="font-bold text-foreground">{total.toLocaleString("tr-TR")} {itemName}</span>
            {" içinden "}{from.toLocaleString("tr-TR")}–{to.toLocaleString("tr-TR")} arası gösteriliyor
          </>
        )}
      </p>

      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            {currentPage <= 1 ? (
              <span aria-label="Önceki sayfa" className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground opacity-45">
                <ChevronLeftIcon className="size-4" aria-hidden="true" />
              </span>
            ) : (
              <PaginationPrevious href={hrefForPage(basePath, currentPage - 1, pathStyle, queryParams)} />
            )}
          </PaginationItem>

          {pages.map((page, index) => (
            <PaginationItem key={`${page}-${index}`}>
              {page === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink href={hrefForPage(basePath, page, pathStyle, queryParams)} isActive={page === currentPage}>
                  {page.toLocaleString("tr-TR")}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            {currentPage >= totalPages ? (
              <span aria-label="Sonraki sayfa" className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground opacity-45">
                <ChevronRightIcon className="size-4" aria-hidden="true" />
              </span>
            ) : (
              <PaginationNext href={hrefForPage(basePath, currentPage + 1, pathStyle, queryParams)} />
            )}
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function hrefForPage(basePath: string, page: number, pathStyle: "query" | "segment", queryParams?: Record<string, string>) {
  if (pathStyle === "segment") return page <= 1 ? basePath : `${basePath}/sayfa/${page}`;
  const params = new URLSearchParams(queryParams);
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export function getAdminPaginationPages(currentPage: number, totalPages: number, pageWindow: number): Array<number | "ellipsis"> {
  const windowSize = Math.max(1, Math.floor(pageWindow));
  if (totalPages <= windowSize + 2) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const halfWindow = Math.floor(windowSize / 2);
  let start = Math.max(1, currentPage - halfWindow);
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages: Array<number | "ellipsis"> = [];

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("ellipsis");
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);
  }
  return pages;
}

export function parseAdminPage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}
