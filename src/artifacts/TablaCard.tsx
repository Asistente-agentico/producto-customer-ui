import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { IconArrowsSort, IconArrowDown, IconArrowUp, IconSearch } from '@tabler/icons-react';
import type { z } from 'zod';
import type { TablaSchema } from '@/api/types';

type Tabla = z.infer<typeof TablaSchema>;
type Fila = Record<string, unknown>;

export default function TablaCard({ artefacto }: { artefacto: Tabla }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filtro, setFiltro] = useState('');

  const columns = useMemo<ColumnDef<Fila>[]>(
    () =>
      artefacto.columnas.map((c) => ({
        id: c.id,
        accessorKey: c.id,
        header: c.label,
        cell: (info) => {
          const v = info.getValue();
          if (v === null || v === undefined) return '—';
          if (c.tipo === 'number' && typeof v === 'number') {
            return v.toLocaleString();
          }
          return String(v);
        },
      })),
    [artefacto.columnas],
  );

  const table = useReactTable({
    data: artefacto.filas,
    columns,
    state: { sorting, globalFilter: filtro },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFiltro,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: artefacto.sortable !== false ? getSortedRowModel() : undefined,
    getFilteredRowModel: artefacto.filterable ? getFilteredRowModel() : undefined,
    getPaginationRowModel: artefacto.paginate_at ? getPaginationRowModel() : undefined,
    initialState: artefacto.paginate_at
      ? { pagination: { pageSize: artefacto.paginate_at, pageIndex: 0 } }
      : undefined,
  });

  return (
    <article className="rounded-md border border-white/10 bg-white/5 p-3">
      <header className="flex items-center justify-between gap-2 mb-3">
        {artefacto.titulo ? <h3 className="text-sm font-semibold">{artefacto.titulo}</h3> : null}
        {artefacto.filterable ? (
          <label className="flex items-center gap-1 text-xs opacity-80">
            <IconSearch size={14} aria-hidden="true" />
            <input
              type="search"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar..."
              className="bg-transparent border-b border-white/20 px-1 py-0.5 text-xs focus:outline-none focus:border-white/60"
              aria-label="Filtrar tabla"
            />
          </label>
        ) : null}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="text-left font-medium opacity-70 px-2 py-1 border-b border-white/10"
                    >
                      {artefacto.sortable !== false ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 hover:opacity-100"
                          aria-label={`Ordenar por ${String(header.column.columnDef.header)}`}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? (
                            <IconArrowUp size={12} aria-hidden="true" />
                          ) : sorted === 'desc' ? (
                            <IconArrowDown size={12} aria-hidden="true" />
                          ) : (
                            <IconArrowsSort size={12} aria-hidden="true" className="opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-white/5 last:border-0">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-2 py-1 font-mono">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {artefacto.paginate_at ? (
        <footer className="flex items-center justify-between mt-2 text-xs opacity-70">
          <span>
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-2 py-1 rounded bg-white/10 disabled:opacity-40 hover:bg-white/15"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-2 py-1 rounded bg-white/10 disabled:opacity-40 hover:bg-white/15"
            >
              ›
            </button>
          </div>
        </footer>
      ) : null}
    </article>
  );
}
