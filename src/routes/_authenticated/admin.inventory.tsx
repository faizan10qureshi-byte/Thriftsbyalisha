import { createFileRoute } from '@tanstack/react-router';
import { Records } from '@/components/admin/Records';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/_authenticated/admin/inventory')({ head: () => pageHead('Inventory', 'Manage shop inventory.', true), component: Page });
function Page() { return <Records kind="inventory"/>; }
