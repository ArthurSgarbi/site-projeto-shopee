'use client';

import {
  SubmitEvent,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  CheckIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AdsView } from '@/components/dashboard/ads-view';
import { emptyProductDraft, demoProducts } from '@/components/dashboard/data';
import { DeliveriesView } from '@/components/dashboard/deliveries-view';
import { OrdersView } from '@/components/dashboard/orders-view';
import { OverviewView } from '@/components/dashboard/overview-view';
import { ProductsView } from '@/components/dashboard/products-view';
import { RestocksView } from '@/components/dashboard/restocks-view';
import { SettingsView } from '@/components/dashboard/settings-view';
import {
  DashboardSidebar,
  MobileNavigation,
} from '@/components/dashboard/sidebar';
import type {
  Product,
  ProductDraft,
  SectionKey,
} from '@/components/dashboard/types';
import { calculateTotals } from '@/components/dashboard/utils';
import {
  AuthLoading,
  LoginView,
  type AuthenticatedAdmin,
} from '@/components/auth/login-view';

const STORAGE_KEY = 'sync-mobile-products-v2';
const LEGACY_STORAGE_KEY = 'estoque-pro-products';
const THEME_KEY = 'sync-mobile-theme';
const THEME_EVENT = 'sync-mobile-theme-change';

const sectionLabels: Record<SectionKey, string> = {
  overview: 'Visão geral',
  products: 'Produtos',
  orders: 'Pedidos',
  deliveries: 'Entregas',
  restocks: 'Reposições',
  ads: 'Anúncios',
  settings: 'Configurações',
};

function subscribeToTheme(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

function getThemeSnapshot() {
  return document.documentElement.classList.contains('dark');
}

function getServerThemeSnapshot() {
  return false;
}

function updateDarkMode(enabled: boolean) {
  document.documentElement.classList.toggle('dark', enabled);
  document.documentElement.style.colorScheme = enabled ? 'dark' : 'light';
  window.localStorage.setItem(THEME_KEY, enabled ? 'dark' : 'light');
  window.dispatchEvent(new Event(THEME_EVENT));
}

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    weeklyAdSpendCents: product.weeklyAdSpendCents ?? 0,
    weeklyAdRevenueCents: product.weeklyAdRevenueCents ?? 0,
  };
}

async function persistProduct(product: Product, method: 'POST' | 'PUT') {
  const response = await fetch('/api/products', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(
      response.status,
      payload?.error ?? 'Não foi possível salvar o produto.',
    );
  }
  return (await response.json()) as Product;
}

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export default function Home() {
  const [authStatus, setAuthStatus] = useState<
    'loading' | 'authenticated' | 'unauthenticated'
  >('loading');
  const [admin, setAdmin] = useState<AuthenticatedAdmin | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [usingLocalStorage, setUsingLocalStorage] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyProductDraft);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const darkMode = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const totals = useMemo(() => calculateTotals(products), [products]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    fetch('/api/auth/session', { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as {
          authenticated?: boolean;
          admin?: AuthenticatedAdmin;
        };
        if (!mounted) return;
        if (response.ok && payload.authenticated && payload.admin) {
          setAdmin(payload.admin);
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unauthenticated');
        }
      })
      .catch(() => {
        if (mounted) setAuthStatus('unauthenticated');
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    fetch('/api/products')
      .then((response) => {
        if (!response.ok)
          throw new ApiError(response.status, 'Banco de dados indisponível');
        return response.json() as Promise<Product[]>;
      })
      .then(async (data) => {
        if (data.length) {
          setProducts(data.map(normalizeProduct));
          setUsingLocalStorage(false);
          return;
        }

        const cached =
          window.localStorage.getItem(STORAGE_KEY) ??
          window.localStorage.getItem(LEGACY_STORAGE_KEY);
        let productsToImport = demoProducts;
        if (cached) {
          try {
            productsToImport = (JSON.parse(cached) as Product[]).map(
              normalizeProduct,
            );
          } catch {
            productsToImport = demoProducts;
          }
        }

        const importResponse = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productsToImport),
        });
        if (!importResponse.ok)
          throw new Error('Não foi possível migrar os dados locais');
        const imported = (await importResponse.json()) as Product[];
        setProducts(imported.map(normalizeProduct));
        setUsingLocalStorage(false);
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          setAdmin(null);
          setAuthStatus('unauthenticated');
          return;
        }
        const saved =
          window.localStorage.getItem(STORAGE_KEY) ??
          window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved) {
          try {
            setProducts((JSON.parse(saved) as Product[]).map(normalizeProduct));
          } catch {
            setProducts(demoProducts);
          }
        }
        setUsingLocalStorage(true);
      });
  }, [authStatus]);

  useEffect(() => {
    if (authStatus === 'authenticated' && usingLocalStorage)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [authStatus, products, usingLocalStorage]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registration = context.registerTool(
      {
        name: 'create_inventory_product',
        title: 'Adicionar produto ao estoque',
        description:
          'Cadastra um produto no SYNC Mobile e atualiza os indicadores visíveis.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            sku: { type: 'string' },
            stock: { type: 'number', minimum: 0 },
            costCents: { type: 'number', minimum: 0 },
            saleCents: { type: 'number', minimum: 0 },
          },
          required: ['name', 'sku', 'stock', 'costCents', 'saleCents'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input: unknown) {
          if (!input || typeof input !== 'object')
            throw new Error('Dados do produto são obrigatórios.');
          const values = input as Record<string, unknown>;
          if (
            typeof values.name !== 'string' ||
            !values.name.trim() ||
            typeof values.sku !== 'string' ||
            !values.sku.trim()
          )
            throw new Error('Nome e SKU são obrigatórios.');
          const product: Product = {
            ...emptyProductDraft,
            id: Date.now(),
            name: values.name.trim(),
            sku: values.sku.trim().toUpperCase(),
            stock: Math.max(0, Number(values.stock) || 0),
            costCents: Math.max(0, Number(values.costCents) || 0),
            saleCents: Math.max(0, Number(values.saleCents) || 0),
          };
          const saved = usingLocalStorage
            ? product
            : await persistProduct(product, 'POST');
          setProducts((current) => [saved, ...current]);
          setNotice('Produto adicionado ao estoque.');
          return { id: saved.id, sku: saved.sku, status: 'created' };
        },
      },
      { signal: lifecycle.signal },
    );
    void Promise.resolve(registration).catch(() => undefined);
    return () => lifecycle.abort();
  }, [authStatus, usingLocalStorage]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAdmin(null);
    setAuthStatus('unauthenticated');
    setProducts(demoProducts);
    setDialogOpen(false);
  }

  function selectSection(section: SectionKey) {
    setActiveSection(section);
    setMobileMenuOpen(false);
  }

  function openCreate() {
    setEditingId(null);
    setDraft(emptyProductDraft);
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    const { id, ...values } = product;
    setEditingId(id);
    setDraft(values);
    setDialogOpen(true);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.sku.trim()) return;
    setSaving(true);
    const product = { ...draft, id: editingId ?? Date.now() };
    try {
      const saved = usingLocalStorage
        ? product
        : await persistProduct(product, editingId ? 'PUT' : 'POST');
      setProducts((current) =>
        editingId
          ? current.map((item) => (item.id === editingId ? saved : item))
          : [saved, ...current],
      );
      setDialogOpen(false);
      setNotice(
        editingId ? 'Produto atualizado.' : 'Produto adicionado ao estoque.',
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAdmin(null);
        setAuthStatus('unauthenticated');
      } else {
        setNotice(
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar o produto agora.',
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Excluir “${product.name}” do catálogo?`)) return;
    const previous = products;
    setProducts((current) => current.filter((item) => item.id !== product.id));
    if (!usingLocalStorage) {
      try {
        const response = await fetch(`/api/products?id=${product.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new ApiError(
            response.status,
            payload?.error ?? 'Falha ao excluir.',
          );
        }
      } catch (error) {
        setProducts(previous);
        if (error instanceof ApiError && error.status === 401) {
          setAdmin(null);
          setAuthStatus('unauthenticated');
        } else {
          setNotice(
            error instanceof Error
              ? error.message
              : 'Não foi possível excluir o produto.',
          );
        }
        return;
      }
    }
    setNotice('Produto excluído do catálogo.');
  }

  async function requestPurchase(product: Product) {
    const suggested = Math.max(product.minStock * 3 - product.stock, 20);
    const updated = { ...product, incoming: product.incoming + suggested };
    setProducts((current) =>
      current.map((item) => (item.id === product.id ? updated : item)),
    );
    if (!usingLocalStorage) {
      try {
        await persistProduct(updated, 'PUT');
      } catch (error) {
        setProducts((current) =>
          current.map((item) => (item.id === product.id ? product : item)),
        );
        if (error instanceof ApiError && error.status === 401) {
          setAdmin(null);
          setAuthStatus('unauthenticated');
        } else {
          setNotice(
            error instanceof Error
              ? error.message
              : 'Não foi possível solicitar a compra.',
          );
        }
        return;
      }
    }
    setNotice(`Compra de ${suggested} unidades solicitada.`);
  }

  if (authStatus === 'loading') return <AuthLoading />;
  if (authStatus === 'unauthenticated')
    return (
      <LoginView
        onAuthenticated={(nextAdmin) => {
          setAdmin(nextAdmin);
          setAuthStatus('authenticated');
        }}
      />
    );

  return (
    <main className="dashboard-theme min-h-screen bg-[#fff7f5] text-[#2b1916] dark:bg-[#160d0b] dark:text-[#fff1ed]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <DashboardSidebar
          activeSection={activeSection}
          onSelect={selectSection}
        />
        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#eadeda] bg-[#fff7f5]/90 px-4 backdrop-blur-md dark:border-[#432a25] dark:bg-[#160d0b]/90 sm:px-7 xl:px-10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="grid size-10 place-items-center rounded-xl border border-[#d9dfd4] bg-white dark:border-[#35483c] dark:bg-[#17231b] lg:hidden"
                onClick={() => setMobileMenuOpen((current) => !current)}
                aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="size-5" />
                ) : (
                  <Bars3Icon className="size-5" />
                )}
              </button>
              <div>
                <p className="text-xs font-medium text-[#728078]">
                  PAINEL ADMINISTRATIVO
                </p>
                <h1 className="text-lg font-bold tracking-[-0.025em] sm:text-xl">
                  {sectionLabels[activeSection]}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden max-w-[220px] truncate rounded-xl border border-[#eadeda] bg-white px-3 py-2 text-xs font-semibold text-[#765b55] dark:border-[#54342e] dark:bg-[#241512] dark:text-[#d6b8b0] md:block">
                {admin?.email}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="grid size-10 place-items-center rounded-xl border border-[#eadeda] bg-white text-[#765b55] transition hover:border-[#ffc7bb] hover:bg-[#fff0ec] hover:text-[#d94122] dark:border-[#54342e] dark:bg-[#241512] dark:text-[#d6b8b0] dark:hover:border-[#8c4c3e] dark:hover:bg-[#542217] dark:hover:text-[#ff8c75]"
                aria-label="Sair do painel"
                title="Sair"
              >
                <ArrowRightStartOnRectangleIcon className="size-5" />
              </button>
              <Button
                onClick={openCreate}
                className="h-10 rounded-xl bg-[#ee4d2d] px-4 text-white shadow-sm hover:bg-[#d73211]"
              >
                <PlusIcon />
                <span className="hidden sm:inline">Adicionar produto</span>
                <span className="sm:hidden">Produto</span>
              </Button>
            </div>
          </header>

          {mobileMenuOpen ? (
            <div className="border-b border-[#dfe4da] bg-[#eef1e9] p-4 dark:border-[#2b3b31] dark:bg-[#131f18] lg:hidden">
              <MobileNavigation
                activeSection={activeSection}
                onSelect={selectSection}
              />
            </div>
          ) : null}

          <div className="px-4 py-6 sm:px-7 xl:px-10 xl:py-8">
            {activeSection === 'overview' ? (
              <OverviewView
                products={products}
                totals={totals}
                usingLocalStorage={usingLocalStorage}
                onOpenProduct={openEdit}
              />
            ) : null}
            {activeSection === 'products' ? (
              <ProductsView
                products={products}
                onCreate={openCreate}
                onEdit={openEdit}
                onDelete={deleteProduct}
              />
            ) : null}
            {activeSection === 'orders' ? <OrdersView /> : null}
            {activeSection === 'deliveries' ? <DeliveriesView /> : null}
            {activeSection === 'restocks' ? (
              <RestocksView
                products={products}
                onRequestPurchase={requestPurchase}
              />
            ) : null}
            {activeSection === 'ads' ? <AdsView onAction={setNotice} /> : null}
            {activeSection === 'settings' ? (
              <SettingsView
                darkMode={darkMode}
                onDarkModeChange={updateDarkMode}
              />
            ) : null}
          </div>
        </section>
      </div>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        draft={draft}
        setDraft={setDraft}
        editing={editingId !== null}
        saving={saving}
        onSubmit={handleSubmit}
      />
      {notice ? (
        <output
          className="fixed bottom-5 left-1/2 z-[80] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl bg-[#a92e17] px-4 py-3 text-sm font-medium text-white shadow-xl"
          aria-live="polite"
        >
          <CheckIcon className="size-4 shrink-0 text-[#ffd0c7]" />
          {notice}
        </output>
      ) : null}
    </main>
  );
}

type ProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ProductDraft;
  setDraft: (draft: ProductDraft) => void;
  editing: boolean;
  saving: boolean;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
};

function ProductDialog({
  open,
  onOpenChange,
  draft,
  setDraft,
  editing,
  saving,
  onSubmit,
}: ProductDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-[-0.03em]">
            {editing ? 'Editar produto' : 'Adicionar produto'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados da operação. Os indicadores serão recalculados
            automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do produto" className="sm:col-span-2">
            <Input
              required
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="Ex.: Kit Organizador"
            />
          </Field>
          <Field label="SKU / código">
            <Input
              required
              value={draft.sku}
              onChange={(event) =>
                setDraft({ ...draft, sku: event.target.value.toUpperCase() })
              }
              placeholder="ORG-001"
            />
          </Field>
          <Field label="Categoria">
            <Input
              value={draft.category}
              onChange={(event) =>
                setDraft({ ...draft, category: event.target.value })
              }
              placeholder="Casa & Organização"
            />
          </Field>
          <NumberField
            label="Quantidade em estoque"
            value={draft.stock}
            onChange={(value) => setDraft({ ...draft, stock: value })}
          />
          <NumberField
            label="Estoque mínimo"
            value={draft.minStock}
            onChange={(value) => setDraft({ ...draft, minStock: value })}
          />
          <MoneyField
            label="Custo por unidade"
            value={draft.costCents}
            onChange={(value) => setDraft({ ...draft, costCents: value })}
          />
          <MoneyField
            label="Preço de venda"
            value={draft.saleCents}
            onChange={(value) => setDraft({ ...draft, saleCents: value })}
          />
          <NumberField
            label="Pedidos na semana"
            value={draft.weeklyOrders}
            onChange={(value) => setDraft({ ...draft, weeklyOrders: value })}
          />
          <NumberField
            label="Entregas na semana"
            value={draft.weeklyDelivered}
            onChange={(value) => setDraft({ ...draft, weeklyDelivered: value })}
          />
          <NumberField
            label="Unidades a caminho"
            value={draft.incoming}
            onChange={(value) => setDraft({ ...draft, incoming: value })}
          />
          <MoneyField
            label="Taxas da semana"
            value={draft.weeklyExpensesCents}
            onChange={(value) =>
              setDraft({ ...draft, weeklyExpensesCents: value })
            }
          />
          <MoneyField
            label="Custo com anúncios"
            value={draft.weeklyAdSpendCents}
            onChange={(value) =>
              setDraft({ ...draft, weeklyAdSpendCents: value })
            }
          />
          <MoneyField
            label="Vendas geradas por anúncios"
            value={draft.weeklyAdRevenueCents}
            onChange={(value) =>
              setDraft({ ...draft, weeklyAdRevenueCents: value })
            }
          />
          <DialogFooter className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#ee4d2d] text-white hover:bg-[#d73211]"
            >
              {saving
                ? 'Salvando…'
                : editing
                  ? 'Salvar alterações'
                  : 'Adicionar produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-medium ${className}`}>
      {label}
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min="0"
        value={value}
        onChange={(event) =>
          onChange(Math.max(0, Number(event.target.value) || 0))
        }
      />
    </Field>
  );
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#768179]">
          R$
        </span>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={value / 100}
          onChange={(event) =>
            onChange(Math.round((Number(event.target.value) || 0) * 100))
          }
          className="pl-10"
        />
      </div>
    </Field>
  );
}
