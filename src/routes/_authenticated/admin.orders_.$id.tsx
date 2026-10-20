import { createFileRoute } from '@tanstack/react-router';
import { RecordDetail } from '@/components/admin/RecordDetail';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/_authenticated/admin/orders_/$id')({ head: () => pageHead('Orders details', 'Shop orders details and edits.', true), component: Page });
function Page() { const { id } = Route.useParams(); return <RecordDetail kind="orders" id={id}/>; }
