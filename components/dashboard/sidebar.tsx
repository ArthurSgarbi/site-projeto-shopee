import type { ComponentType, SVGProps } from 'react';
import Image from 'next/image';
import {
  ArrowDownTrayIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  CubeIcon,
  MegaphoneIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import type { SectionKey } from './types';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const navigation: Array<{ id: SectionKey; label: string; icon: Icon }> = [
  { id: 'overview', label: 'Visão geral', icon: ChartBarSquareIcon },
  { id: 'products', label: 'Produtos', icon: CubeIcon },
  { id: 'orders', label: 'Pedidos', icon: ShoppingBagIcon },
  { id: 'deliveries', label: 'Entregas', icon: TruckIcon },
  { id: 'restocks', label: 'Reposições', icon: ArrowDownTrayIcon },
  { id: 'ads', label: 'Anúncios', icon: MegaphoneIcon },
  { id: 'settings', label: 'Configurações', icon: Cog6ToothIcon },
];

type NavigationProps = {
  activeSection: SectionKey;
  onSelect: (section: SectionKey) => void;
};

function NavigationItems({ activeSection, onSelect }: NavigationProps) {
  return navigation.map(({ id, label, icon: IconComponent }) => {
    const active = activeSection === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => onSelect(id)}
        aria-current={active ? 'page' : undefined}
        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
          active
            ? 'bg-[#ffe1da] text-[#b63219] shadow-[inset_3px_0_0_#ee4d2d] dark:bg-[#542217] dark:text-[#ffd9d1] dark:shadow-[inset_3px_0_0_#ff795f]'
            : 'text-[#667269] hover:bg-white/75 hover:text-[#263229] dark:text-[#9eaca2] dark:hover:bg-white/5 dark:hover:text-white'
        }`}
      >
        <IconComponent
          className={`size-[19px] ${active ? 'stroke-[2.2]' : 'stroke-[1.7]'}`}
        />
        {label}
      </button>
    );
  });
}

export function DashboardSidebar({ activeSection, onSelect }: NavigationProps) {
  return (
    <aside className="hidden w-[236px] shrink-0 border-r border-[#eadeda] bg-[#fff0ec] px-5 py-6 dark:border-[#432a25] dark:bg-[#21120f] lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-2">
        <div className="size-12 overflow-hidden rounded-xl border border-[#d8dfd1] bg-white shadow-[0_8px_24px_rgba(36,92,59,.14)]">
          <Image
            src="/sync-mobile-logo.jpeg"
            alt="Logo SYNC Mobile"
            width={48}
            height={48}
            className="h-full w-full object-contain"
            priority
          />
        </div>
        <div>
          <p className="text-[17px] font-bold tracking-[-0.03em]">
            SYNC Mobile
          </p>
          <p className="text-xs text-[#718075]">Sua loja em sincronia</p>
        </div>
      </div>

      <nav className="mt-9 space-y-1" aria-label="Navegação principal">
        <NavigationItems activeSection={activeSection} onSelect={onSelect} />
      </nav>

      <div className="mt-auto rounded-2xl border border-[#d8dfd1] bg-white/70 p-4 dark:border-[#304238] dark:bg-white/5">
        <div className="mb-3 grid size-8 place-items-center rounded-lg bg-[#fff0c9] text-[#936000]">
          <SparklesIcon className="size-4" />
        </div>
        <p className="text-sm font-semibold">Dica da semana</p>
        <p className="mt-1 text-xs leading-relaxed text-[#667269]">
          Reponha os itens em alerta antes de ativar uma Oferta Relâmpago na
          Shopee.
        </p>
      </div>
    </aside>
  );
}

export function MobileNavigation({ activeSection, onSelect }: NavigationProps) {
  return (
    <nav className="grid grid-cols-2 gap-2" aria-label="Navegação móvel">
      <NavigationItems activeSection={activeSection} onSelect={onSelect} />
    </nav>
  );
}
