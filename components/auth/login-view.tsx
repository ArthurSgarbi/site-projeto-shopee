'use client';

import { SubmitEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

export type AuthenticatedAdmin = {
  id: number;
  email: string;
  role: string;
};

type LoginViewProps = {
  onAuthenticated: (admin: AuthenticatedAdmin) => void;
};

export function LoginView({ onAuthenticated }: LoginViewProps) {
  const [step, setStep] = useState<'credentials' | 'code'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendAfter, setResendAfter] = useState(0);

  useEffect(() => {
    if (resendAfter <= 0) return;
    const timer = window.setTimeout(
      () => setResendAfter(resendAfter - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendAfter]);

  async function requestCode() {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as {
        challengeId?: string;
        maskedEmail?: string;
        error?: string;
        retryAfterSeconds?: number;
      };
      if (!response.ok || !payload.challengeId || !payload.maskedEmail) {
        setError(payload.error ?? 'Confira seus dados e tente novamente.');
        if (payload.retryAfterSeconds)
          setResendAfter(payload.retryAfterSeconds);
        return;
      }
      setChallengeId(payload.challengeId);
      setMaskedEmail(payload.maskedEmail);
      setPassword('');
      setCode('');
      setResendAfter(60);
      setStep('code');
    } catch {
      setError('Não foi possível enviar o código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (!challengeId || resendAfter > 0) return;
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      });
      const payload = (await response.json()) as {
        challengeId?: string;
        maskedEmail?: string;
        error?: string;
        retryAfterSeconds?: number;
      };
      if (!response.ok || !payload.challengeId) {
        setError(payload.error ?? 'Não foi possível reenviar o código.');
        if (payload.retryAfterSeconds)
          setResendAfter(payload.retryAfterSeconds);
        return;
      }
      setChallengeId(payload.challengeId);
      setMaskedEmail(payload.maskedEmail ?? maskedEmail);
      setCode('');
      setResendAfter(60);
    } catch {
      setError('Não foi possível reenviar o código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, code }),
      });
      const payload = (await response.json()) as {
        admin?: AuthenticatedAdmin;
        error?: string;
      };
      if (!response.ok || !payload.admin) {
        setError(payload.error ?? 'Código inválido.');
        return;
      }
      onAuthenticated(payload.admin);
    } catch {
      setError('Não foi possível validar o código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#fff7f5] px-4 py-8 text-[#2b1916] dark:bg-[#160d0b] dark:text-[#fff1ed] sm:px-6">
      <section className="w-full max-w-[430px] rounded-3xl border border-[#eadeda] bg-white p-6 shadow-[0_24px_80px_rgba(148,49,27,.12)] dark:border-[#54342e] dark:bg-[#241512] sm:p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 size-20 overflow-hidden rounded-2xl border border-[#f1d3cc] bg-white shadow-[0_10px_28px_rgba(238,77,45,.16)] dark:border-[#694037]">
            <Image
              src="/sync-mobile-logo.jpeg"
              alt="Logo SYNC Mobile"
              width={80}
              height={80}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#ee4d2d] dark:text-[#ff8c75]">
            Área restrita
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.04em]">
            {step === 'credentials'
              ? 'Acesse o SYNC Mobile'
              : 'Confirme seu acesso'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#718075] dark:text-[#bda9a4]">
            {step === 'credentials' ? (
              'Entre com suas credenciais de administrador para gerenciar sua operação.'
            ) : (
              <>
                Digite o código de 6 dígitos enviado para{' '}
                <strong className="font-semibold text-[#4e3028] dark:text-[#f1c7bd]">
                  {maskedEmail}
                </strong>
                .
              </>
            )}
          </p>
        </div>

        {step === 'credentials' ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void requestCode();
            }}
            className="grid gap-5"
          >
            <label
              className="grid gap-2 text-sm font-semibold"
              htmlFor="admin-email"
            >
              E-mail
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                className="h-11 rounded-xl border-[#eadeda] bg-[#fffaf9] dark:border-[#54342e] dark:bg-[#1b0f0d]"
              />
            </label>

            <label
              className="grid gap-2 text-sm font-semibold"
              htmlFor="admin-password"
            >
              Senha
              <span className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite sua senha"
                  className="h-11 rounded-xl border-[#eadeda] bg-[#fffaf9] pr-11 dark:border-[#54342e] dark:bg-[#1b0f0d]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#9a7770] transition hover:bg-[#fff0ec] hover:text-[#d94122] dark:hover:bg-[#542217] dark:hover:text-[#ff8c75]"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="size-5" />
                  ) : (
                    <EyeIcon className="size-5" />
                  )}
                </button>
              </span>
            </label>

            {error ? (
              <p
                className="rounded-xl border border-[#efcac6] bg-[#fff0ee] px-3 py-2.5 text-sm font-medium text-[#a3433a] dark:border-[#6d3b35] dark:bg-[#3b211f] dark:text-[#ffaaa0]"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 rounded-xl bg-[#ee4d2d] font-semibold text-white shadow-sm hover:bg-[#d73211]"
            >
              <LockClosedIcon />
              {loading ? 'Enviando código…' : 'Continuar e receber código'}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="grid gap-5">
            <div className="grid gap-2 text-sm font-semibold">
              <p id="login-code-label">Código de verificação</p>
              <InputOTP
                aria-labelledby="login-code-label"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(value) =>
                  setCode(value.replace(/\D/g, '').slice(0, 6))
                }
                containerClassName="justify-center"
              >
                <InputOTPGroup className="gap-2">
                  {Array.from({ length: 6 }, (_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="size-12 rounded-xl border bg-[#fffaf9] text-xl font-bold dark:border-[#54342e] dark:bg-[#1b0f0d]"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error ? (
              <p
                className="rounded-xl border border-[#efcac6] bg-[#fff0ee] px-3 py-2.5 text-sm font-medium text-[#a3433a] dark:border-[#6d3b35] dark:bg-[#3b211f] dark:text-[#ffaaa0]"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={loading || code.length !== 6}
              className="mt-1 h-11 rounded-xl bg-[#ee4d2d] font-semibold text-white shadow-sm hover:bg-[#d73211]"
            >
              <LockClosedIcon />
              {loading ? 'Verificando código…' : 'Confirmar e entrar'}
            </Button>
            <div className="flex items-center justify-between text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setChallengeId('');
                  setCode('');
                  setError('');
                  setResendAfter(0);
                }}
                className="text-[#9a7770] transition hover:text-[#d94122] dark:hover:text-[#ff8c75]"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void resendCode()}
                disabled={loading || resendAfter > 0}
                className="text-[#d94122] transition hover:text-[#a92e17] disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#ff8c75] dark:hover:text-[#ffae9d]"
              >
                {resendAfter > 0
                  ? `Reenviar em ${resendAfter}s`
                  : 'Reenviar código'}
              </button>
            </div>
          </form>
        )}

        <p className="mt-7 text-center text-xs leading-relaxed text-[#9a7770] dark:text-[#9d8680]">
          Acesso protegido por sessão segura. Não compartilhe suas credenciais.
        </p>
      </section>
    </main>
  );
}

export function AuthLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fff7f5] text-[#ee4d2d] dark:bg-[#160d0b] dark:text-[#ff8c75]">
      <div className="grid place-items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-[#ffc7bb] border-t-[#ee4d2d] dark:border-[#6d3b35] dark:border-t-[#ff8c75]" />
        <span className="text-sm font-medium">Carregando seu painel…</span>
      </div>
    </main>
  );
}
