'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  CubeIcon,
  CurrencyDollarIcon,
  LockClosedIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { demoProducts } from '@/components/dashboard/data';
import type { Product } from '@/components/dashboard/types';
import { calculateTotals, formatMoney } from '@/components/dashboard/utils';

function freshProducts() {
  return demoProducts.map((product) => ({ ...product }));
}

export default function DemoPage() {
  const [products, setProducts] = useState<Product[]>(freshProducts);
  const [message, setMessage] = useState(
    'Experimente registrar uma venda. Nada aqui altera o painel administrativo.',
  );
  const totals = useMemo(() => calculateTotals(products), [products]);

  function simulateSale(product: Product) {
    if (!product.stock) {
      setMessage(`${product.name} está sem estoque nesta simulação.`);
      return;
    }
    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? {
              ...item,
              stock: item.stock - 1,
              weeklyOrders: item.weeklyOrders + 1,
              weeklyDelivered: item.weeklyDelivered + 1,
            }
          : item,
      ),
    );
    setMessage(`Venda simulada: 1 unidade de ${product.name}.`);
  }

  function resetDemo() {
    setProducts(freshProducts());
    setMessage('Demonstração restaurada com os dados fictícios originais.');
  }

  return (
    <main className="min-h-screen bg-[#fff7f5] text-[#2b1916] dark:bg-[#160d0b] dark:text-[#fff1ed]">
      <header className="border-b border-[#eadeda] bg-white/90 backdrop-blur dark:border-[#432a25] dark:bg-[#21120f]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <Image
              src="/sync-mobile-logo.jpeg"
              alt="Logo SYNC Mobile"
              width={44}
              height={44}
              className="size-11 rounded-xl border border-[#f1d3cc] bg-white object-contain"
              priority
            />
            <div>
              <p className="font-bold tracking-[-0.03em]">SYNC Mobile</p>
              <p className="text-xs text-[#806b66] dark:text-[#bda9a4]">
                Ambiente de demonstração
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ee4d2d] px-4 text-sm font-semibold text-white transition hover:bg-[#d73211]"
          >
            <LockClosedIcon className="size-4" />
            <span className="hidden sm:inline">Área administrativa</span>
            <span className="sm:hidden">Entrar</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-7 sm:py-10">
        <section className="rounded-3xl bg-gradient-to-br from-[#5b1f16] to-[#28120e] p-6 text-white shadow-[0_24px_70px_rgba(84,34,23,.18)] sm:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#ff9d89]">
                Dados 100% fictícios
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
                Teste o fluxo sem acessar informações reais
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
                Esta área permite conhecer os indicadores e simular vendas. As
                mudanças ficam somente nesta tela e são apagadas ao restaurar.
              </p>
            </div>
            <button
              type="button"
              onClick={resetDemo}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold transition hover:bg-white/15"
            >
              <ArrowPathIcon className="size-4" /> Restaurar demonstração
            </button>
          </div>
        </section>

        <p
          role="status"
          className="mt-5 rounded-xl border border-[#f1d3cc] bg-white px-4 py-3 text-sm font-medium text-[#765b55] dark:border-[#54342e] dark:bg-[#241512] dark:text-[#d6b8b0]"
        >
          {message}
        </p>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DemoMetric
            icon={CurrencyDollarIcon}
            label="Faturamento semanal"
            value={formatMoney(totals.revenue)}
          />
          <DemoMetric
            icon={ArrowTrendingUpIcon}
            label="Lucro estimado"
            value={formatMoney(totals.profit)}
          />
          <DemoMetric
            icon={ShoppingBagIcon}
            label="Pedidos"
            value={String(totals.orders)}
          />
          <DemoMetric
            icon={CubeIcon}
            label="Unidades em estoque"
            value={String(totals.stockUnits)}
          />
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-[#eadeda] bg-white shadow-sm dark:border-[#54342e] dark:bg-[#241512]">
          <div className="flex items-center justify-between gap-3 border-b border-[#eadeda] px-5 py-4 dark:border-[#54342e]">
            <div>
              <h2 className="text-lg font-bold">Produtos de exemplo</h2>
              <p className="text-sm text-[#806b66] dark:text-[#bda9a4]">
                Use “Simular venda” para atualizar os indicadores acima.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#fff7f5] text-xs uppercase tracking-[.08em] text-[#806b66] dark:bg-[#1b0f0d] dark:text-[#bda9a4]">
                <tr>
                  <th className="px-5 py-3">Produto</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Estoque</th>
                  <th className="px-5 py-3">Preço</th>
                  <th className="px-5 py-3">Pedidos</th>
                  <th className="px-5 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1e4e0] dark:divide-[#432a25]">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-5 py-4 font-semibold">{product.name}</td>
                    <td className="px-5 py-4 text-[#806b66] dark:text-[#bda9a4]">
                      {product.sku}
                    </td>
                    <td className="px-5 py-4">{product.stock}</td>
                    <td className="px-5 py-4">{formatMoney(product.saleCents)}</td>
                    <td className="px-5 py-4">{product.weeklyOrders}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => simulateSale(product)}
                        disabled={!product.stock}
                        className="rounded-lg bg-[#ee4d2d] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#d73211] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Simular venda
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function DemoMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CurrencyDollarIcon;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-[#eadeda] bg-white p-5 shadow-sm dark:border-[#54342e] dark:bg-[#241512]">
      <div className="grid size-10 place-items-center rounded-xl bg-[#fff0ec] text-[#d94122] dark:bg-[#542217] dark:text-[#ff8c75]">
        <Icon className="size-5" />
      </div>
      <p className="mt-4 text-sm text-[#806b66] dark:text-[#bda9a4]">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-[-0.04em]">{value}</p>
    </article>
  );
}
