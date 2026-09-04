'use client';

import { useState } from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_SIDEBAR_ORDER,
  SECTION_LABELS,
  moveSection,
} from '@/lib/navigation';
import type { SectionKey } from './types';

export type SidebarSettingsProps = {
  order: SectionKey[];
  ready: boolean;
  busy: boolean;
  error: string;
  retry: () => void;
  save: (order: SectionKey[]) => Promise<boolean>;
};

export function SidebarSettings({
  order,
  ready,
  busy,
  error,
  retry,
  save,
}: SidebarSettingsProps) {
  const [draft, setDraft] = useState<SectionKey[] | null>(null);
  const [message, setMessage] = useState('');
  const current = draft ?? order;
  const changed = current.some((section, index) => section !== order[index]);
  function move(section: SectionKey, direction: -1 | 1) {
    const next = moveSection(current, section, direction);
    setDraft(next);
    setMessage(
      `${SECTION_LABELS[section]}: posição ${next.indexOf(section) + 1}. Salve para aplicar.`,
    );
  }
  return (
    <section className="rounded-2xl border border-[#dfe4da] bg-white p-5 shadow-sm dark:border-[#2b3b31] dark:bg-[#17231b] sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <Bars3Icon className="mt-1 size-6 shrink-0 text-[#ee4d2d]" />
        <div>
          <h2 className="font-bold">Organizar menu lateral</h2>
          <p className="mt-1 text-sm text-[#718075]">
            Use as setas para escolher a ordem das abas. A ordem salva acompanha
            sua conta no computador e no menu do celular.
          </p>
        </div>
      </div>
      {!ready && !error && (
        <p role="status" className="mb-4 text-sm">
          Carregando a ordem salva…
        </p>
      )}
      <ol className="space-y-2">
        {current.map((section, index) => (
          <li
            key={section}
            className="flex items-center gap-3 rounded-xl border border-[#eadeda] p-3 dark:border-[#54342e]"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#fff0ec] text-sm font-semibold text-[#d94122] dark:bg-[#542217] dark:text-[#ff8c75]">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold">
              {SECTION_LABELS[section]}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Mover ${SECTION_LABELS[section]} para cima`}
              disabled={!ready || busy || index === 0}
              onClick={() => move(section, -1)}
            >
              <ArrowUpIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Mover ${SECTION_LABELS[section]} para baixo`}
              disabled={!ready || busy || index === current.length - 1}
              onClick={() => move(section, 1)}
            >
              <ArrowDownIcon />
            </Button>
          </li>
        ))}
      </ol>
      {error && (
        <div
          role="alert"
          className="mt-4 text-sm text-red-600 dark:text-red-300"
        >
          <p>{error}</p>
          {!ready && (
            <Button variant="outline" onClick={retry} className="mt-2">
              Tentar novamente
            </Button>
          )}
        </div>
      )}
      <p role="status" className="mt-3 min-h-5 text-sm text-[#718075]">
        {busy
          ? 'Salvando a ordem…'
          : message || (ready ? 'Sua ordem atual está salva no banco.' : '')}
      </p>
      <div className="mt-4 flex flex-wrap justify-between gap-3">
        <Button
          variant="outline"
          disabled={!ready || busy}
          onClick={() => {
            setDraft([...DEFAULT_SIDEBAR_ORDER]);
            setMessage('Ordem padrão selecionada. Salve para aplicar.');
          }}
        >
          Restaurar ordem padrão
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!changed || busy}
            onClick={() => {
              setDraft(null);
              setMessage('Alterações descartadas.');
            }}
          >
            Descartar
          </Button>
          <Button
            className="bg-[#ee4d2d] text-white hover:bg-[#d73211]"
            disabled={!ready || !changed || busy}
            onClick={async () => {
              if (await save(current)) {
                setDraft(null);
                setMessage('Ordem do menu salva com sucesso.');
              }
            }}
          >
            {busy ? 'Salvando…' : 'Salvar ordem'}
          </Button>
        </div>
      </div>
    </section>
  );
}
