import { useDeferredValue, useState } from 'react';
import {
  CubeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Product } from './types';
import { formatMoney, stockState } from './utils';
import { ViewHeading } from './view-heading';

type ProductsViewProps = {
  products: Product[];
  onCreate: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export function ProductsView({
  products,
  onCreate,
  onEdit,
  onDelete,
}: ProductsViewProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const deferredQuery = useDeferredValue(query.toLocaleLowerCase('pt-BR'));
  const filteredProducts = products.filter((product) => {
    const matchesQuery =
      product.name.toLocaleLowerCase('pt-BR').includes(deferredQuery) ||
      product.sku.toLocaleLowerCase('pt-BR').includes(deferredQuery);
    return (
      matchesQuery && (filter === 'all' || product.stock <= product.minStock)
    );
  });

  return (
    <>
      <ViewHeading
        eyebrow="Catálogo"
        title="Produtos"
        description="Consulte preços e quantidades, encontre itens rapidamente e mantenha o catálogo atualizado."
        action={
          <Button
            onClick={onCreate}
            className="h-10 rounded-xl bg-[#245c3b] px-4 text-white hover:bg-[#19472c]"
          >
            <PlusIcon className="size-4" />
            Adicionar produto
          </Button>
        }
      />
      <section className="overflow-hidden rounded-2xl border border-[#dfe4da] bg-white shadow-[0_10px_30px_rgba(39,54,44,.04)]">
        <div className="flex flex-col gap-4 border-b border-[#e5e9e1] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex gap-2">
            <Filter active={filter === 'all'} onClick={() => setFilter('all')}>
              Todos ({products.length})
            </Filter>
            <Filter active={filter === 'low'} onClick={() => setFilter('low')}>
              Estoque baixo (
              {
                products.filter((product) => product.stock <= product.minStock)
                  .length
              }
              )
            </Filter>
          </div>
          <div className="relative block sm:w-72">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7b877f]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar nome ou SKU"
              aria-label="Buscar produtos por nome ou SKU"
              className="h-10 rounded-xl border-[#dbe1d7] bg-[#f8f9f6] pl-9"
            />
          </div>
        </div>
        {filteredProducts.length ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f8f9f6] hover:bg-[#f8f9f6]">
                <TableHead className="min-w-[270px] pl-5">Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque atual</TableHead>
                <TableHead className="pr-5 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product, index) => {
                const state = stockState(product);
                const thumbnailColors = [
                  'bg-[#e7efe7] text-[#2e7044]',
                  'bg-[#fff2d2] text-[#936000]',
                  'bg-[#eaf0f7] text-[#315b8a]',
                ];
                return (
                  <TableRow
                    key={product.id}
                    className="h-[78px] border-[#edf0ea]"
                  >
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid size-11 shrink-0 place-items-center rounded-xl ${thumbnailColors[index % thumbnailColors.length]}`}
                          aria-hidden="true"
                        >
                          <CubeIcon className="size-6" />
                        </div>
                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="mt-1 text-xs text-[#7b867f]">
                            {product.category}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#657168]">
                      {product.sku}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">
                        {formatMoney(product.saleCents)}
                      </p>
                      <p className="text-xs text-[#89938c]">
                        Custo {formatMoney(product.costCents)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold">{product.stock} un.</p>
                      <Badge
                        variant="outline"
                        className={
                          state === 'Saudável'
                            ? 'mt-1 border-[#cce4d3] bg-[#edf8f0] text-[#2e7044]'
                            : 'mt-1 border-[#f1d6a5] bg-[#fff8e7] text-[#936000]'
                        }
                      >
                        {state}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(product)}
                        >
                          <PencilSquareIcon />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#a64a42] hover:bg-[#fff0ee] hover:text-[#8e3028]"
                          onClick={() => onDelete(product)}
                        >
                          <TrashIcon />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <MagnifyingGlassIcon className="mx-auto size-8 text-[#8a958d]" />
              <p className="mt-3 font-semibold">Nenhum produto encontrado</p>
              <p className="mt-1 text-sm text-[#748078]">
                Tente outro termo ou remova o filtro.
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function Filter({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-[#244f36] text-white' : 'bg-[#f0f3ed] text-[#5f6c63] hover:bg-[#e4e9e1]'}`}
    >
      {children}
    </button>
  );
}
