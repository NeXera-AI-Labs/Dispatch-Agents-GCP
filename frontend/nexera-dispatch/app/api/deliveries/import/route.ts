import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth-helpers';

const CAP_URL = process.env.NEXT_PUBLIC_CAP_URL!;
const ITEM_CONCURRENCY = 5;

interface SapDelivery {
  DeliveryDocument: string;
  ShipToParty?: string;
  ShippingPoint?: string;
  DeliveryDate?: string;
  ActualDeliveryRoute?: string;
  HeaderGrossWeight?: number;
  HeaderNetWeight?: number;
  HdrGoodsMvtIncompletionStatus?: string;
}

interface SapItem {
  DeliveryDocument: string;
  DeliveryDocumentItem: string;
  Material?: string;
  ActualDeliveryQuantity?: number;
  DeliveryQuantityUnit?: string;
  StorageLocation?: string;
}

async function fetchHeaders(): Promise<SapDelivery[]> {
  const res = await fetch(`${CAP_URL}/odata/v4/ewm/OutboundDeliveries?$top=100`);
  if (!res.ok) throw new Error(`SAP headers fetch failed: ${res.status}`);
  const data = await res.json();
  return (data.value ?? []) as SapDelivery[];
}

async function fetchItems(deliveryDoc: string): Promise<SapItem[]> {
  const res = await fetch(`${CAP_URL}/odata/v4/ewm/getDeliveryItems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deliveryDoc }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.value ?? data ?? []) as SapItem[];
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function POST(request: Request) {
  const caller = getTokenFromRequest(request);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const startedAt = Date.now();
  let headers: SapDelivery[];
  try {
    headers = await fetchHeaders();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  const itemLists = await mapWithConcurrency(headers, ITEM_CONCURRENCY, h =>
    fetchItems(h.DeliveryDocument).catch(() => [] as SapItem[])
  );

  const db = getDb();
  const client = await db.connect();
  let headerCount = 0;
  let itemCount = 0;
  try {
    await client.query('BEGIN');

    for (const h of headers) {
      await client.query(
        `INSERT INTO deliveries (
           tenant_id, delivery_document, ship_to_party, shipping_point,
           delivery_date, actual_delivery_route, header_gross_weight,
           header_net_weight, hdr_goods_mvt_status, raw_json, imported_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())
         ON CONFLICT (tenant_id, delivery_document) DO UPDATE SET
           ship_to_party = EXCLUDED.ship_to_party,
           shipping_point = EXCLUDED.shipping_point,
           delivery_date = EXCLUDED.delivery_date,
           actual_delivery_route = EXCLUDED.actual_delivery_route,
           header_gross_weight = EXCLUDED.header_gross_weight,
           header_net_weight = EXCLUDED.header_net_weight,
           hdr_goods_mvt_status = EXCLUDED.hdr_goods_mvt_status,
           raw_json = EXCLUDED.raw_json,
           imported_at = NOW()`,
        [
          caller.tenant_id,
          h.DeliveryDocument,
          h.ShipToParty ?? null,
          h.ShippingPoint ?? null,
          h.DeliveryDate ?? null,
          h.ActualDeliveryRoute ?? null,
          h.HeaderGrossWeight ?? null,
          h.HeaderNetWeight ?? null,
          h.HdrGoodsMvtIncompletionStatus ?? null,
          JSON.stringify(h),
        ]
      );
      headerCount++;
    }

    for (let i = 0; i < headers.length; i++) {
      const items = itemLists[i] ?? [];
      for (const it of items) {
        await client.query(
          `INSERT INTO delivery_items (
             tenant_id, delivery_document, delivery_document_item,
             material, actual_delivery_quantity, delivery_quantity_unit,
             storage_location, raw_json, imported_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW())
           ON CONFLICT (tenant_id, delivery_document, delivery_document_item) DO UPDATE SET
             material = EXCLUDED.material,
             actual_delivery_quantity = EXCLUDED.actual_delivery_quantity,
             delivery_quantity_unit = EXCLUDED.delivery_quantity_unit,
             storage_location = EXCLUDED.storage_location,
             raw_json = EXCLUDED.raw_json,
             imported_at = NOW()`,
          [
            caller.tenant_id,
            it.DeliveryDocument,
            it.DeliveryDocumentItem,
            it.Material ?? null,
            it.ActualDeliveryQuantity ?? null,
            it.DeliveryQuantityUnit ?? null,
            it.StorageLocation ?? null,
            JSON.stringify(it),
          ]
        );
        itemCount++;
      }
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.json({
    headerCount,
    itemCount,
    durationMs: Date.now() - startedAt,
  });
}
