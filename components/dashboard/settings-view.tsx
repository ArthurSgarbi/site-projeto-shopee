'use client';

import {
  ComputerDesktopIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import { Switch } from '@/components/ui/switch';
import { ViewHeading } from './view-heading';

type SettingsViewProps = {
  darkMode: boolean;
  onDarkModeChange: (enabled: boolean) => void;
};

export function SettingsView({
  darkMode,
  onDarkModeChange,
}: SettingsViewProps) {
  return (
    <div className="space-y-6">
      <ViewHeading
        eyebrow="Preferências"
        title="Configurações do site"
        description="Personalize a experiência do painel neste dispositivo."
      />

      <section className="overflow-hidden rounded-2xl border border-[#dfe4da] bg-white shadow-sm dark:border-[#2b3b31] dark:bg-[#17231b]">
        <div className="border-b border-[#edf0ea] px-5 py-5 dark:border-[#2b3b31] sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#fff0ec] text-[#d94122] dark:bg-[#542217] dark:text-[#ff8c75]">
              {darkMode ? (
                <MoonIcon className="size-5" />
              ) : (
                <SunIcon className="size-5" />
              )}
            </div>
            <div>
              <h2 className="font-bold tracking-[-0.02em]">Aparência</h2>
              <p className="mt-0.5 text-sm text-[#718075] dark:text-[#9eaca2]">
                Escolha como o SYNC Mobile aparece para você.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#dfe4da] bg-[#f8f9f6] dark:border-[#35483c] dark:bg-[#101a14]">
              <MoonIcon className="size-5 text-[#ee4d2d] dark:text-[#ff8c75]" />
            </div>
            <div>
              <label htmlFor="dark-mode" className="font-semibold">
                Modo escuro
              </label>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#657168] dark:text-[#9eaca2]">
                Reduz o brilho e adapta cards, tabelas, menus e formulários para
                ambientes com pouca luz.
              </p>
              <p
                className="mt-2 text-xs font-semibold text-[#d94122] dark:text-[#ff8c75]"
                aria-live="polite"
              >
                {darkMode ? 'Tema escuro ativado' : 'Tema claro ativado'}
              </p>
            </div>
          </div>
          <Switch
            id="dark-mode"
            checked={darkMode}
            onCheckedChange={onDarkModeChange}
            aria-label="Ativar modo escuro"
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#dfe4da] bg-white p-5 shadow-sm dark:border-[#2b3b31] dark:bg-[#17231b]">
          <ComputerDesktopIcon className="size-5 text-[#ee4d2d] dark:text-[#ff8c75]" />
          <p className="mt-4 text-sm font-semibold">Preferência persistente</p>
          <p className="mt-1 text-sm leading-relaxed text-[#718075] dark:text-[#9eaca2]">
            O tema escolhido é lembrado neste navegador, mesmo depois de fechar
            o site.
          </p>
        </div>
        <div className="rounded-2xl border border-[#dfe4da] bg-white p-5 shadow-sm dark:border-[#2b3b31] dark:bg-[#17231b]">
          <div className="flex gap-2" aria-hidden="true">
            <span className="size-5 rounded-full border border-[#dfe4da] bg-white dark:border-[#506257]" />
            <span className="size-5 rounded-full bg-[#ee4d2d]" />
            <span className="size-5 rounded-full bg-[#17231b] ring-1 ring-[#394b40]" />
          </div>
          <p className="mt-4 text-sm font-semibold">Identidade preservada</p>
          <p className="mt-1 text-sm leading-relaxed text-[#718075] dark:text-[#9eaca2]">
            As cores verdes da SYNC Mobile continuam destacando ações e
            indicadores importantes.
          </p>
        </div>
      </section>
    </div>
  );
}
