import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { BotProtectionFields } from "@/components/security/bot-protection-fields";
import { ValidatedAuthForm, ValidatedInput } from "../validated-auth-form";

type LoginFormProps = {
  next: string;
  challenge: boolean;
  hasServerFieldError: boolean;
};

export function LoginForm({ next, challenge, hasServerFieldError }: LoginFormProps) {
  const errorDescription = hasServerFieldError ? "login-form-error" : undefined;

  return (
    <ValidatedAuthForm
      action="/auth/signin"
      className="mt-4"
    >
      <BotProtectionFields challenge={challenge} action="login" />
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="login-email">E-posta</FieldLabel>
          <ValidatedInput id="login-email" name="email" type="email" autoComplete="email" required serverInvalid={hasServerFieldError} aria-describedby={errorDescription} />
        </Field>
        <Field>
          <FieldLabel htmlFor="login-password">Şifre</FieldLabel>
          <ValidatedInput id="login-password" name="password" type="password" autoComplete="current-password" required serverInvalid={hasServerFieldError} aria-describedby={errorDescription} />
        </Field>
        <Field>
          <Button className="h-10 w-full px-4 text-sm font-black">Giriş Yap</Button>
        </Field>
      </FieldGroup>
    </ValidatedAuthForm>
  );
}
