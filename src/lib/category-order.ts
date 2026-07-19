export function moveItemById<T extends { id: string }>(items: T[], activeId: string, targetId: string) {
  const currentIndex = items.findIndex((item) => item.id === activeId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) return items;
  return moveItem(items, currentIndex, targetIndex);
}

export function moveItem<T>(items: T[], currentIndex: number, targetIndex: number) {
  const next = [...items];
  const [moved] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function orderItemsById<T extends { id: string }>(items: T[], orderedIds: string[]) {
  const byId = new Map(items.map((item) => [item.id, item]));
  return orderedIds.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

export function groupSidebarCategories<T extends { id: string; show_in_sidebar?: boolean | null }>(
  items: T[],
  recentlyEnabledId?: string,
) {
  const visible = items.filter((item) => item.show_in_sidebar && item.id !== recentlyEnabledId);
  const recentlyEnabled = recentlyEnabledId
    ? items.find((item) => item.id === recentlyEnabledId && item.show_in_sidebar)
    : undefined;
  const hidden = items.filter((item) => !item.show_in_sidebar);

  return recentlyEnabled ? [...visible, recentlyEnabled, ...hidden] : [...visible, ...hidden];
}
