import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

type LoginInput = z.input<typeof loginSchema>;
type LoginValues = z.output<typeof loginSchema>;

type AdminLoginFormProps = {
  error?: string;
  isSubmitting?: boolean;
  onSubmit: (values: LoginValues) => void;
};

export function AdminLoginForm({ error, isSubmitting = false, onSubmit }: AdminLoginFormProps) {
  const form = useForm<LoginInput, unknown, LoginValues>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(loginSchema),
  });

  return (
    <section className="auth-card" aria-labelledby="admin-login-title">
      <p className="admin-home__eyebrow">Hà Tĩnh Immersive / Admin</p>
      <h1 id="admin-login-title">Welcome back.</h1>
      <p>Sign in to edit the scene graph and prepare content for review.</p>
      <form className="editor-form" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
        <label>
          Email
          <input type="email" autoComplete="username" {...form.register('email')} />
          {form.formState.errors.email ? (
            <span className="editor-form__error">{form.formState.errors.email.message}</span>
          ) : null}
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" {...form.register('password')} />
          {form.formState.errors.password ? (
            <span className="editor-form__error">{form.formState.errors.password.message}</span>
          ) : null}
        </label>
        {error ? (
          <p className="workspace-alert workspace-alert--error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="editor-primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
