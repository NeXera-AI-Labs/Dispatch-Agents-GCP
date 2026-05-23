'use client';
import { useParams } from 'next/navigation';
import { DispatchSplitView } from '@/components/dispatch-split-view';

export default function DeliveryDetailPage() {
  const params = useParams();
  const deliveryId = params?.deliveryId as string;
  return <DispatchSplitView initialDeliveryId={deliveryId} />;
}
