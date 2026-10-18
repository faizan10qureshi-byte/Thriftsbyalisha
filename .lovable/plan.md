# Shop operations and live chat

## Keep the current shop
Shopify was not connected. Add the requested Shopify-style features to the existing Lovable Cloud shop, keeping current products, orders, and public pages.

## Sales tools
- Create named collections and assign items to them; shoppers can browse by collection.
- Reserve an available item immediately when an order is placed. Website and manual sales use the same protection, so competing purchases cannot both succeed. Failed orders must not leave partial sales behind.
- Add owner-managed discount codes with clear validity, amount, and usage limits; validate discounts when placing orders.
- Track consented, identifiable unfinished bags with last activity and purchased/recovered states. Do not label anonymous browsing as an identifiable customer or add automatic messages.
- Add manual orders for Instagram DMs and WhatsApp, using existing items and customers, with Advance Paid and delivery details.
- Add editable customer tags and a simple sales-insights view covering sales, order counts, average sale, popular collections, and unfinished bags.

## Breathing room and plain language
- Inventory, Leads, Orders, and Customers show essential columns, search, relevant filters, and pagination.
- Each record opens a dedicated detail page for editing, notes, and history available in the existing data.
- Overview lists show only the latest five entries and a View all link.
- Use Bazaar Haul, Advance Paid, and Mark as Sold consistently; place short explanations beneath unclear fields.

## Teams & Permissions
- Replace Settings in navigation with Teams & Permissions.
- Show members with on/off controls for shop work, finance, and owner access, mapping to existing protected roles.
- Explain what each access option permits; preserve safeguards against removing your own owner access.
- Enforce access on stored data and actions, not just by hiding buttons.

## Live chat
- Add a storefront chat bubble with a short customer contact form and message thread.
- Opening a conversation with a message creates one Website Chat lead; later messages reuse that conversation and lead.
- Add a realtime team inbox with unread indicators, conversation selection, replies, and canned replies for measurements and other common questions.
- Keep conversations private: visitors can access only their own conversation; permitted team members can access the inbox.
- Show sending, empty, disconnected, and error states without losing typed messages.

## Technical approach
- Use additive database changes with explicit grants and row-level access policies, preserving current records.
- Put atomic reservation and order creation in a database transaction called through existing server functions; include manual orders and discount usage in that boundary.
- Use server-validated conversation credentials for anonymous chat and narrowly scoped realtime access; never expose customer conversations publicly.
- Use existing TanStack routes, UI controls, styling tokens, and query cache patterns; add unique page metadata for new and existing content routes.
- Record architectural rules in AGENTS.md and keep the task list current.

## Verification
- Add and run focused tests for competing item purchases, discount limits, permission controls, the five-entry overview limit, and one-lead-per-chat behavior.
- Check real saved data through the website and signed-in admin screens, including manual order creation, detail edits, permission changes, and chat replies.
- Check compact and wide screens, loading/error states, and current preview errors before completion.

## Not included
No Shopify connection, product migration, automatic abandoned-cart outreach, or publishing. Real payment and contact details still need to come from you.