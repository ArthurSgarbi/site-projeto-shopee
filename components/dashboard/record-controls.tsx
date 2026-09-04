'use client';

import { Button } from '@/components/ui/button';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export const recordDialogClass =
  'max-h-[90dvh] overflow-y-auto border border-[#eadeda] bg-[#fff7f5] text-[#2b1916] dark:border-[#54342e] dark:bg-[#241512] dark:text-[#fff1ed] sm:max-w-xl';

export function RecordActions({
  label,
  disabled,
  onEdit,
  onDelete,
}: {
  label: string;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        disabled={disabled}
        onClick={onEdit}
        aria-label={`Editar ${label}`}
      >
        <PencilSquareIcon />
        Editar
      </Button>
      <Button
        variant="outline"
        disabled={disabled}
        onClick={onDelete}
        aria-label={`Excluir ${label}`}
        className="text-red-600 dark:text-red-300"
      >
        <TrashIcon />
        Excluir
      </Button>
    </div>
  );
}

export function RecordsState({
  loading,
  error,
  empty,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string;
  empty: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (loading)
    return (
      <p
        role="status"
        className="rounded-xl border border-[#dfe4da] bg-white p-5 text-sm"
      >
        Carregando registros salvos…
      </p>
    );
  if (error)
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-300 p-5 text-sm"
      >
        <p>{error}</p>
        <Button variant="outline" onClick={onRetry} className="mt-3">
          Tentar novamente
        </Button>
      </div>
    );
  if (empty)
    return (
      <div className="rounded-2xl border border-dashed border-[#dfe4da] bg-white p-8 text-center text-sm">
        {children}
      </div>
    );
  return null;
}

export function DeleteRecordDialog({
  label,
  description,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  label: string | null;
  description: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <AlertDialog
      open={label !== null}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <AlertDialogContent className={recordDialogClass}>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            {description} Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Excluindo…' : 'Confirmar exclusão'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function formatRecordDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

export function todayDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}
