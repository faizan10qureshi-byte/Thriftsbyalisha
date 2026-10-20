import { createFileRoute } from '@tanstack/react-router';
import { RecordDetail } from '@/components/admin/RecordDetail';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/_authenticated/admin/customers_/$id')({ head: () => pageHead('Customers details', 'Shop customers details and edits.', true), component: Page });
function Page() { const { id } = Route.useParams(); return <RecordDetail kind="customers" id={id}/>; }
