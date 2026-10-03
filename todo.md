# KUDII — Master Product Improvement Plan

Guiding principle: **SIMPLE TO USE. POWERFUL WHEN NEEDED.**
Improve the EXISTING app. Do not rebuild. Do not fake features.
Black & white Liquid Glass identity. Light/Dark only. Mobile first.

## Stage 1 — Light/Dark theme
- [x] Replace ThemeName 'warm'|'white'|'black'|'champagne' with 'light'|'dark'
- [x] Migrate old saved themes safely (warm/white/champagne -> light, black -> dark)
- [x] Rewrite tokens.css theme blocks to black/white only
- [x] Update index.html data-theme + theme-color
- [x] Update onboarding + settings theme pickers to 2 options
- [x] Default new users to light

## Stage 2 — K logo theme switch
- [x] Make BrandMark a working Light/Dark switch in top-left
- [x] K slides left in Light, right in Dark with smooth animation
- [x] Accessible labels (aria), keyboard support
- [x] Don't break other BrandMark uses (receipt, onboarding)

## Stage 3 — Theme consistency, icons, arrows
- [x] Replace colored accents with black/white system
- [x] Theme-following select chevrons / arrows
- [x] Consistent icon usage

## Stage 4 — FULL LIQUID GLASS (major)
- [x] Strengthen glass surfaces (blur, borders, inner highlight, shadow)
- [x] Aurora backdrop black/white only
- [x] Layered depth, reflections, floating surfaces
- [x] Apply across nav, cards, modals, drawers, bottom nav, FAB

## Stage 5 — Public website Liquid Glass redesign
- [x] Rebuild marketing pages with Liquid Glass B/W identity
- [x] Update copy to simple language

## Stage 6 — Mobile layout (very high)
- [x] No overflow, centering, safe areas
- [x] Liquid Glass bottom nav
- [x] Mobile forms 16px inputs (no iOS zoom)
- [x] Modals within viewport
- [x] Test 320–1920px

## Stage 7 — Number formatting
- [x] 1,000 / 1,000,000 / 1,000.50 consistently
- [x] Never change stored values

## Stage 8 — Discounts
- [x] Percentage (0-100) + fixed (<= subtotal)
- [x] Applied correctly in totals (sale + invoice composers, store, derive)
- [x] Unify formatMoney to symbol-based grouping (₦1,000.50) for consistency
- [x] Receipt print styles -> neutral black/white
- [x] Composer form grids responsive (stack on mobile, no overflow)

## Stage 9 — Transactions replace Jobs
- [x] Create src/pages/transactions.tsx: unified feed (Sales, Payments, Refunds, Expenses, Income, Drawings, legacy Jobs)
- [x] Search + date filter + type filter; rows show Reference/Customer/Amount/Status/Type
- [x] Add 'transactions' route in App.tsx
- [x] Primary nav -> Overview, Products, Customers, Transactions, Money; Sales/Invoices/Jobs/Activity/Progress under More
- [x] Remove 'New job' from FAB (keep Job model + all calculations intact)
- [x] Keep /jobs route working (no data loss)
- [x] Verify: tsc clean, build, desktop + mobile 320-1920 overflow sweep, no regressions
- [ ] Commit + push Stage 9 to feat/master-improvements

## Stage 10 — Payments & refunds
- [ ] Payment states: Paid/Partially paid/Pending/Refunded/Cancelled
- [ ] Payment references (KUDII-xxxxx)
- [ ] Refunds create new entries

## Stage 11 — Products & inventory
- [ ] Remove SKU/barcode/scanning
- [ ] name, selling price, stock only; cost/category/min-stock/image under More
- [ ] Stock states + low stock alerts

## Stage 12 — Customers & credit
- [ ] Customer owes / credit clarity

## Stage 13 — Purchases, suppliers, expenses
- [ ] Suppliers + purchases
- [ ] Expense categories

## Stage 14 — Profit, cash flow, reports
- [ ] Profit labelled as estimate
- [ ] Money in/out/net
- [ ] Reports under More

## Stage 15 — Export & share
- [ ] CSV/PDF/JSON/Excel export
- [ ] Native OS share sheet (real)

## Stage 16 — Business profile & backup
- [ ] Business profile
- [ ] Export/import backup

## Stage 17 — Database / backend
- [ ] Real persistence layer (not localStorage for production)

## Stage 18 — Multi-device sync
- [ ] Sync architecture

## Stage 19 — Free/Premium entitlements
- [ ] Backend-enforced, centralized

## Stage 20 — Security & audit
- [ ] Security + activity history

## Stage 21 — Cross-device testing
- [ ] Test breakpoints + devices
