<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Storefront writes (orders, tracking) go through server functions in src/lib/shop.functions.ts using the admin client; anonymous shoppers never write tables directly.
- Dashboard lives under src/routes/_authenticated/admin.*; access is enforced by RLS via has_role/is_staff/can_see_finance, the UI checks are cosmetic.
- Item cost prices live in item_costs (staff-only) so the public items table never exposes cost.

- One-off website and manual orders use checkout_with_delivery/checkout_shop transactions plus order inventory triggers and the active-item unique index; this keeps reservation, discount use, and delivery snapshots atomic.
- Compact admin lists use bounded database pagination; detail routes un-nest from list routes so list components need not render detail content.
- Guest chat and saved bags require server-validated hashed capabilities; guests never read or write private tables directly. Staff inbox uses scoped Realtime policies while guest chat reads through server functions.
- Team switches map to protected role rows; only authenticated owners may change roles, and self-owner removal is blocked server-side.
