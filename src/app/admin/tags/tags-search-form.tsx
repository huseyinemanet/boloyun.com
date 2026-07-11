"use client";

import { useRouter } from "next/navigation";
import { type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TagsSearchForm({ query }: { query: string }) {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQuery = String(formData.get("q") ?? "").trim();

    router.push(nextQuery ? `/admin/tags?q=${encodeURIComponent(nextQuery)}` : "/admin/tags");
  }

  return (
    <form className="flex gap-2" onSubmit={handleSubmit}>
      <Input name="q" defaultValue={query} placeholder="Etiket ara..." autoComplete="off" />
      <Button type="submit" variant="outline">Ara</Button>
    </form>
  );
}
