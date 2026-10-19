import { createFileRoute } from '@tanstack/react-router';
import { Records } from '@/components/admin/Records';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/_authenticated/admin/orders')({ head: () => pageHead('Orders', 'Manage shop orders.', true), component: Page });
function Page() { return <Records kind="orders"/>; }
