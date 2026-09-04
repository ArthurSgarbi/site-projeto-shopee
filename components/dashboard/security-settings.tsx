'use client';

import { SubmitEvent, useState } from 'react';
import { KeyIcon } from '@heroicons/react/24/outline';

export function SecuritySettings() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setMessage('');
    const form = new FormData(formElement);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.get('currentPassword'),
          newPassword: form.get('newPassword'),
          confirmPassword: form.get('confirmPassword'),
        }),
      });
      const result = (await response.json()) as {
        changed?: boolean;
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? 'Não foi possível trocar a senha.');
      formElement.reset();
      setMessage('Senha alterada. Você será direcionado ao login.');
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível trocar a senha.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl border border-[#dfe4da] bg-white p-5 shadow-sm dark:border-[#2b3b31] dark:bg-[#17231b] sm:p-6">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-[#fff0ec] text-[#d94122] dark:bg-[#542217] dark:text-[#ff8c75]">
          <KeyIcon className="size-5" />
        </div>
        <div>
          <h2 className="font-bold">Segurança da conta</h2>
          <p className="text-sm text-[#718075] dark:text-[#9eaca2]">
            Trocar a senha encerra todas as sessões abertas.
          </p>
        </div>
      </div>
      <form className="mt-5 grid max-w-xl gap-4" onSubmit={submit}>
        <label className="grid gap-1.5 text-sm font-semibold">
          Senha atual
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            required
            className="rounded-xl border bg-transparent px-3 py-2.5 dark:border-[#35483c]"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          Nova senha
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            className="rounded-xl border bg-transparent px-3 py-2.5 dark:border-[#35483c]"
          />
          <span className="font-normal text-[#718075]">
            Use pelo menos 12 caracteres e uma senha exclusiva.
          </span>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          Confirme a nova senha
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            className="rounded-xl border bg-transparent px-3 py-2.5 dark:border-[#35483c]"
          />
        </label>
        <button
          disabled={busy}
          className="w-fit rounded-xl bg-[#ee4d2d] px-5 py-2.5 font-bold text-white disabled:opacity-60"
        >
          {busy ? 'Alterando…' : 'Alterar senha'}
        </button>
        <p
          aria-live="polite"
          className="text-sm font-semibold text-[#d94122] dark:text-[#ff8c75]"
        >
          {message}
        </p>
      </form>
    </section>
  );
}
