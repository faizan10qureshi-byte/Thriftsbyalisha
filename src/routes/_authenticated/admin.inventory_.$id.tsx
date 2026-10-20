import { createFileRoute } from '@tanstack/react-router';
import { RecordDetail } from '@/components/admin/RecordDetail';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/_authenticated/admin/inventory_/$id')({ head: () => pageHead('Inventory details', 'Shop inventory details and edits.', true), component: Page });
function Page() { const { id } = Route.useParams(); return <RecordDetail kind="inventory" id={id}/>; }
