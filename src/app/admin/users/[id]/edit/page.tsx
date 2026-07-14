import { notFound } from "next/navigation";
import Image from "next/image";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getAdminUserByProfileId } from "@/lib/db-users";
import { adminPageMetadata } from "@/lib/seo/metadata";
import { sendPasswordResetAction, updateUserAction } from "../../actions";

export const metadata = adminPageMetadata("Kullanıcıyı Düzenle");

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
};

export default async function EditAdminUserPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { notice } = await searchParams;
  const user = await getAdminUserByProfileId(id);
  if (!user) notFound();

  return (
    <div className="space-y-3">
      <AdminPageHeader title="Kullanıcıyı Düzenle" description={`${user.username} hesabının profil, rol ve hesap durumunu yönet.`}>
        {notice === "password-reset" ? <p className="mt-3 rounded-md bg-success/10 p-3 text-sm font-semibold text-success">Şifre sıfırlama e-postası gönderildi.</p> : null}
      </AdminPageHeader>

      <form action={updateUserAction} className="space-y-6 rounded-md border border-border bg-card p-4">
        <input type="hidden" name="id" value={user.id} />

        <FormSection title="İsim">
          <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
            <p className="text-sm font-bold">Kullanıcı adı</p>
            <div>
              <Input value={user.username} disabled className="h-10 max-w-xl bg-muted text-muted-foreground" />
              <p className="mt-1 text-sm text-muted-foreground">Kullanıcı adları değiştirilemez.</p>
            </div>
            <LabelInput label="Ad" name="first_name" defaultValue={user.firstName ?? ""} />
            <LabelInput label="Soyad" name="last_name" defaultValue={user.lastName ?? ""} />
            <LabelInput label="Görünen ad" name="display_name" defaultValue={user.displayName ?? ""} />
          </div>
        </FormSection>

        <FormSection title="İletişim Bilgileri">
          <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
            <LabelInput label="E-posta" name="email" type="email" defaultValue={user.email} required />
            <LabelInput label="Web sitesi" name="website" type="url" defaultValue={user.website ?? ""} />
          </div>
        </FormSection>

        <FormSection title="Hakkında">
          <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
            <p className="text-sm font-bold">Biyografi</p>
            <Textarea name="bio" defaultValue={user.bio ?? ""} rows={5} className="max-w-3xl resize-y" />
          </div>
        </FormSection>

        <FormSection title="Profil Fotoğrafı">
          <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
            <p className="text-sm font-bold">Avatar</p>
            <div className="space-y-3">
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt={user.username} width={96} height={96} className="size-24 rounded-md object-cover" />
              ) : (
                <span className="grid size-24 place-items-center rounded-md bg-muted text-2xl font-bold text-foreground">{user.username.slice(0, 2).toLocaleUpperCase("tr")}</span>
              )}
              <Input name="avatar_url" defaultValue={user.avatarUrl ?? ""} placeholder="Avatar URL" className="h-10 max-w-xl" />
            </div>
          </div>
        </FormSection>

        <FormSection title="Hesap Yönetimi">
          <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
            <p className="text-sm font-bold">Rol</p>
            <Select name="role" defaultValue={user.role}>
              <SelectTrigger className="h-10 w-full max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Üye</SelectItem>
                <SelectItem value="admin">Yönetici</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm font-bold">Durum</p>
            <Select name="status" defaultValue={user.status}>
              <SelectTrigger className="h-10 w-full max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="blocked">Engelli</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FormSection>

        <Button className="h-10 px-5 text-sm font-bold">Profili Güncelle</Button>
      </form>

      <form action={sendPasswordResetAction} className="rounded-md border border-border bg-card p-4">
        <input type="hidden" name="id" value={user.id} />
        <input type="hidden" name="email" value={user.email} />
        <h2 className="text-lg font-bold">Şifre</h2>
        <p className="mt-2 text-sm text-muted-foreground">Kullanıcıya yeni şifre belirlemesi için e-posta gönder.</p>
        <Button variant="outline" className="mt-3 h-10 px-4 text-sm font-bold">Şifre Sıfırlama E-postası Gönder</Button>
      </form>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-b border-border pb-6 last:border-b-0 last:pb-0">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function LabelInput({ label, name, type = "text", defaultValue, required = false }: { label: string; name: string; type?: string; defaultValue: string; required?: boolean }) {
  return (
    <>
      <p className="text-sm font-bold">{label}</p>
      <Input name={name} type={type} defaultValue={defaultValue} required={required} className="h-10 max-w-xl" />
    </>
  );
}
