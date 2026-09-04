import type { ReactNode } from 'react';

type ViewHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function ViewHeading({
  eyebrow,
  title,
  description,
  action,
}: ViewHeadingProps) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.12em] text-[#718075]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-[30px]">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[#657168]">{description}</p>
      </div>
      {action}
    </header>
  );
}
