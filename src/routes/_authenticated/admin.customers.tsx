import { createFileRoute } from '@tanstack/react-router';
import { Records } from '@/components/admin/Records';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/_authenticated/admin/customers')({ head: () => pageHead('Customers', 'Manage shop customers.', true), component: Page });
function Page() { return <Records kind="customers"/>; }
