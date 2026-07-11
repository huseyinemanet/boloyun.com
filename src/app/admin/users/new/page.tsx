import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUserAction } from "../actions";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewAdminUserPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="space-y-3">
      <AdminPageHeader title="Yeni Kullanıcı Ekle" description="Üyelik hesabı oluştur, rolünü seç ve gerekirse yönetici yetkisi ver.">
        {error ? <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive">Şifre en az 8 karakter olmalı.</p> : null}
      </AdminPageHeader>

      <form action={createUserAction} className="space-y-4 rounded-md border border-border bg-card p-4">
        <FormGrid>
          <Field label="Kullanıcı adı" name="username" required />
          <Field label="E-posta" name="email" type="email" required />
          <Field label="Ad" name="first_name" />
          <Field label="Soyad" name="last_name" />
          <Field label="Görünen ad" name="display_name" />
          <Field label="Geçici şifre" name="password" type="password" required />
          <label className="block text-sm font-bold">
            Rol
            <Select name="role" defaultValue="member">
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Üye</SelectItem>
                <SelectItem value="admin">Yönetici</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </FormGrid>
        <Button className="h-10 px-4 text-sm font-bold">Kullanıcı Ekle</Button>
      </form>
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <Input name={name} type={type} required={required} className="mt-1 h-10" />
    </label>
  );
}
