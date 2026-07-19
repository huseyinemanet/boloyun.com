"use client";

import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { IconGridCircleListFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGridCircleListFillDuo18";
import { IconGripDotsVerticalFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconGripDotsVerticalFillDuo18";
import { IconTextTitleCaseFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconTextTitleCaseFillDuo18";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/icons/category-icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { groupSidebarCategories, moveItem, moveItemById, orderItemsById } from "@/lib/category-order";
import { cn } from "@/lib/utils";
import type { CategoryRow } from "@/lib/db-categories";
import { CategoryForm } from "./category-form";

type CategoryManagerProps = {
  categories: CategoryRow[];
  initialEditingId?: string;
};

export function CategoryManager({ categories, initialEditingId }: CategoryManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState(categories);
  const [selectedId, setSelectedId] = useState(initialEditingId);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [savingVisibilityIds, setSavingVisibilityIds] = useState<Set<string>>(() => new Set());
  const draggedIdRef = useRef<string | null>(null);
  const overIdRef = useRef<string | null>(null);
  const dragStartOrderRef = useRef<string[]>([]);
  const dropHandledRef = useRef(false);

  useEffect(() => {
    if (!draggedIdRef.current) setItems(categories);
  }, [categories]);

  const editingCategory = items.find((category) => category.id === selectedId);
  const savingVisibility = savingVisibilityIds.size > 0;

  function selectCategory(id?: string) {
    setSelectedId(id);
    router.push(id ? `/admin/categories?edit=${id}` : "/admin/categories", { scroll: false });
  }

  function handleDragStart(event: DragEvent<HTMLButtonElement>, id: string) {
    if (savingOrder || savingVisibility) {
      event.preventDefault();
      return;
    }
    draggedIdRef.current = id;
    dragStartOrderRef.current = items.map((category) => category.id);
    dropHandledRef.current = false;
    setDraggedId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function handleDragOver(event: DragEvent<HTMLTableRowElement>, targetId: string) {
    const activeId = draggedIdRef.current;
    if (!activeId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (overIdRef.current === targetId) return;
    overIdRef.current = targetId;
    setOverId(targetId);
    if (activeId === targetId) return;
    setItems((current) => moveItemById(current, activeId, targetId));
  }

  function handleDrop(event: DragEvent<HTMLTableRowElement>) {
    event.preventDefault();
    dropHandledRef.current = true;
    const orderedIds = items.map((category) => category.id);
    const previousIds = dragStartOrderRef.current;
    clearDragState();
    if (orderedIds.join(",") !== previousIds.join(",")) {
      void persistOrder(orderedIds, previousIds);
    }
  }

  function handleDragEnd() {
    if (!dropHandledRef.current) {
      setItems((current) => orderItemsById(current, dragStartOrderRef.current));
    }
    clearDragState();
  }

  function handleKeyboardMove(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    if (savingOrder || savingVisibility) return;

    const currentIndex = items.findIndex((category) => category.id === id);
    const targetIndex = event.key === "ArrowUp" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= items.length) return;

    const previousIds = items.map((category) => category.id);
    const nextItems = moveItem(items, currentIndex, targetIndex);
    setItems(nextItems);
    void persistOrder(nextItems.map((category) => category.id), previousIds);
  }

  function clearDragState() {
    draggedIdRef.current = null;
    overIdRef.current = null;
    setDraggedId(null);
    setOverId(null);
  }

  async function persistOrder(orderedIds: string[], previousIds: string[]) {
    const groupedItems = groupSidebarCategories(orderItemsById(items, orderedIds));
    const groupedIds = groupedItems.map((category) => category.id);
    setItems(groupedItems);
    setSavingOrder(true);
    try {
      const response = await fetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds: groupedIds }),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Kategori sırası kaydedilemedi.");
      toast.success(result.message || "Kategori sırası kaydedildi.");
      router.refresh();
    } catch (error) {
      setItems((current) => orderItemsById(current, previousIds));
      toast.error(error instanceof Error ? error.message : "Kategori sırası kaydedilemedi.");
    } finally {
      setSavingOrder(false);
    }
  }

  async function setSidebarVisibility(category: CategoryRow, visible: boolean) {
    const previousItems = items;
    const nextItems = groupSidebarCategories(
      items.map((item) => item.id === category.id ? { ...item, show_in_sidebar: visible } : item),
      visible ? category.id : undefined,
    );
    setItems(nextItems);
    setSavingVisibilityIds((current) => new Set(current).add(category.id));

    try {
      const response = await fetch(`/api/admin/categories/${category.id}/sidebar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible }),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Kategori menü ayarı kaydedilemedi.");
      toast.success(result.message || "Kategori menü ayarı kaydedildi.");
      router.refresh();
    } catch (error) {
      setItems(previousItems);
      toast.error(error instanceof Error ? error.message : "Kategori menü ayarı kaydedilemedi.");
    } finally {
      setSavingVisibilityIds((current) => {
        const next = new Set(current);
        next.delete(category.id);
        return next;
      });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="h-fit rounded-md border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold">{editingCategory ? "Kategori düzenle" : "Yeni kategori"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {editingCategory ? "Seçili kategorinin bilgilerini güncelle." : "Yeni kategori oluştur."}
            </p>
          </div>
          {editingCategory ? (
            <Button type="button" size="sm" variant="outline" className="text-xs font-bold" onClick={() => selectCategory()}>
              Yeni
            </Button>
          ) : null}
        </div>
        <CategoryForm key={editingCategory?.id ?? "new"} category={editingCategory} />
      </section>

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 p-3">
          <div>
            <h2 className="font-bold">Kategori listesi</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {items.length} kategori · Sıralamak için tutup sürükle
            </p>
          </div>
          {savingOrder ? <p className="text-xs font-semibold text-muted-foreground">Sıra kaydediliyor…</p> : null}
        </div>

        <Table className="min-w-[520px] table-fixed">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-12">
                <span className="inline-flex items-center justify-center" title="Sırala" aria-label="Sırala">
                  <IconGripDotsVerticalFillDuo18 className="size-5" />
                </span>
              </TableHead>
              <TableHead className="w-16">
                <span className="inline-flex items-center justify-center" title="İkon" aria-label="İkon">
                  <IconGridCircleListFillDuo18 className="size-5" />
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center justify-center" title="Ad" aria-label="Ad">
                  <IconTextTitleCaseFillDuo18 className="size-5" />
                </span>
              </TableHead>
              <TableHead className="w-28 text-center">Sol menü</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((category) => (
              <TableRow
                key={category.id}
                onDragOver={(event) => handleDragOver(event, category.id)}
                onDrop={handleDrop}
                className={cn(
                  "transition-colors",
                  selectedId === category.id && "bg-muted/40",
                  draggedId === category.id && "opacity-50",
                  overId === category.id && draggedId !== category.id && "bg-primary/10",
                )}
              >
                <TableCell>
                  <button
                    type="button"
                    draggable={!savingOrder && !savingVisibility}
                    disabled={savingOrder || savingVisibility}
                    onDragStart={(event) => handleDragStart(event, category.id)}
                    onDragEnd={handleDragEnd}
                    onKeyDown={(event) => handleKeyboardMove(event, category.id)}
                    className="inline-flex size-8 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing disabled:cursor-wait"
                    aria-label={`${category.name} kategorisini sırala. Ok tuşlarıyla da taşıyabilirsin.`}
                  >
                    <IconGripDotsVerticalFillDuo18 className="size-5" />
                  </button>
                </TableCell>
                <TableCell>
                  <CategoryIcon category={category} />
                </TableCell>
                <TableCell className="whitespace-normal">
                  <button type="button" onClick={() => selectCategory(category.id)} className="text-left font-semibold text-primary hover:underline">
                    {category.name}
                  </button>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{category.description || "Açıklama yok"}</p>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Switch
                      checked={Boolean(category.show_in_sidebar)}
                      disabled={savingOrder || savingVisibility}
                      onCheckedChange={(checked) => void setSidebarVisibility(category, checked)}
                      aria-label={`${category.name} kategorisini sol menüde göster`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-28 text-center font-medium text-muted-foreground">
                  Henüz kategori yok.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
