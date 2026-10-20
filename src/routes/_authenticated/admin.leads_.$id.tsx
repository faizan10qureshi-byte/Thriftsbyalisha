import { createFileRoute } from '@tanstack/react-router';
import { RecordDetail } from '@/components/admin/RecordDetail';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/_authenticated/admin/leads_/$id')({ head: () => pageHead('Leads details', 'Shop leads details and edits.', true), component: Page });
function Page() { const { id } = Route.useParams(); return <RecordDetail kind="leads" id={id}/>; }
