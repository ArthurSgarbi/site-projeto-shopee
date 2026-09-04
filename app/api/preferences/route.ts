import { getRawDb } from '@/db';
import { DEFAULT_SIDEBAR_ORDER, isSidebarOrder } from '@/lib/navigation';
import { recordBody } from '@/lib/records';
import {
  authorizeRecords,
  noStore,
  recordError,
  recordFailure,
} from '@/lib/records-api';
import { readJson } from '@/lib/http-security';

export async function GET(request: Request) {
  try {
    const admin = await authorizeRecords(request);
    if (admin instanceof Response) return admin;
    const row = await getRawDb()
      .prepare('SELECT sidebar_order FROM admin_preferences WHERE admin_id = ?')
      .bind(admin.id)
      .first<{ sidebar_order: string }>();
    const order: unknown = row
      ? JSON.parse(row.sidebar_order)
      : DEFAULT_SIDEBAR_ORDER;
    return Response.json(
      { sidebarOrder: isSidebarOrder(order) ? order : DEFAULT_SIDEBAR_ORDER },
      { headers: noStore },
    );
  } catch (error) {
    return recordFailure(error);
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await authorizeRecords(request);
    if (admin instanceof Response) return admin;
    const { sidebarOrder } = recordBody(await readJson(request, 4_096));
    if (!isSidebarOrder(sidebarOrder))
      return recordError(
        'A ordem deve conter todas as abas, sem repetições.',
        400,
      );
    await getRawDb()
      .prepare(
        'INSERT INTO admin_preferences (admin_id, sidebar_order) VALUES (?, ?) ON CONFLICT(admin_id) DO UPDATE SET sidebar_order = excluded.sidebar_order',
      )
      .bind(admin.id, JSON.stringify(sidebarOrder))
      .run();
    return Response.json({ sidebarOrder }, { headers: noStore });
  } catch (error) {
    return recordFailure(error);
  }
}
