import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createUserAction } from "../actions";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewAdminUserPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="space-y-3">
      <AdminPageHeader title="Yeni Kullanıcı Ekle" description="Üyelik hesabı oluştur, rolünü seç ve gerekirse yönetici yetkisi ver." />
      <form action={createUserAction} autoComplete="off" className="space-y-4 rounded-md border border-border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Kullanıcı adı" name="username" required autoComplete="username" />
          <Field label="E-posta" name="email" type="email" required autoComplete="email" />
          <Field label="Ad" name="first_name" autoComplete="given-name" />
          <Field label="Soyad" name="last_name" autoComplete="family-name" />
          <Field label="Görünen ad" name="display_name" autoComplete="nickname" />
          <Field label="Geçici şifre" name="password" type="password" required autoComplete="new-password" />
          <label className="block text-sm font-bold">
            Rol
            <select
              name="role"
              defaultValue="member"
              className="mt-1 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm font-normal outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="member">Üye</option>
              <option value="admin">Yönetici</option>
            </select>
          </label>
        </div>

        {error ? (
          <p role="alert" aria-live="polite" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {error}
          </p>
        ) : null}

        <Button className="h-10 px-4 text-sm font-bold">Kullanıcı Ekle</Button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm font-bold">
      <span>
        {label}
        {required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}
      </span>
      <Input
        name={name}
        type={type}
        required={required}
        aria-required={required}
        autoComplete={autoComplete}
        className="mt-1 h-10"
      />
    </label>
  );
}
