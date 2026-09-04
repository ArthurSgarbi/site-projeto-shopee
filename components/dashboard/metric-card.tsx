import type { ComponentType, SVGProps } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

type MetricCardProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  detail: string;
  tone: 'green' | 'red' | 'amber' | 'blue';
};

const tones = {
  green: 'bg-[#e8f3e9] text-[#2e7044]',
  red: 'bg-[#faece9] text-[#a54a41]',
  amber: 'bg-[#fff2d2] text-[#936000]',
  blue: 'bg-[#eaf0f7] text-[#315b8a]',
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-[#dfe4da] bg-white p-4 shadow-[0_8px_24px_rgba(39,54,44,.035)] sm:p-5">
      <div className="flex items-start justify-between">
        <div
          className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="size-5" />
        </div>
        <ArrowTopRightOnSquareIcon className="size-4 text-[#a5ada7]" />
      </div>
      <p className="mt-4 text-sm font-medium text-[#6d7a70]">{label}</p>
      <p className="mt-1 text-[25px] font-bold tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-xs text-[#89938c]">{detail}</p>
    </article>
  );
}
