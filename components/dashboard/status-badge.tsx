import { Badge } from '@/components/ui/badge';

const styles: Record<string, string> = {
  Pago: 'border-[#cce4d3] bg-[#edf8f0] text-[#2e7044]',
  Pendente: 'border-[#f1d6a5] bg-[#fff8e7] text-[#936000]',
  Cancelado: 'border-[#efcac6] bg-[#fff0ee] text-[#a3433a]',
  Entregue: 'border-[#cce4d3] bg-[#edf8f0] text-[#2e7044]',
  'Em trânsito': 'border-[#cddbea] bg-[#eef4fa] text-[#315b8a]',
  Preparando: 'border-[#e2d5ef] bg-[#f6effb] text-[#76508d]',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={
        styles[status] ?? 'border-[#dfe4da] bg-[#f5f6f2] text-[#657168]'
      }
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  );
}
