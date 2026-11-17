# Architecture & Deployment Notes

## 1. Monorepo Deployment on Vercel
This repository is designed to deploy as **two independent Vercel projects** linked to the same GitHub repository:

1. **API Project (`Root Directory: server`)**
   - Uses Vercel's zero-config Node backend detection via `server/server.js` (`export default app`).
   - Runs `postinstall: "prisma generate"` automatically during build.
   - Connects to Supabase PostgreSQL via **Supavisor pooled URL** (`DATABASE_URL`) with `@prisma/adapter-pg` + `@vercel/functions` (`attachDatabasePool`) and uses `DIRECT_URL` (port `5432`) for CLI migrations.
   - Handles file uploads via `multer.memoryStorage()` (capped at 4 MB under Vercel's 4.5 MB body limit) and persists objects to **Supabase Storage** buckets rather than local disk.
   - Generates trade documents (`Commercial Invoice`, `Packing List`, `Bill of Lading`, `Certificate of Origin`) via **PDFKit** buffers/streams.

2. **Frontend Project (`Root Directory: client`)**
   - Vite React SPA built into `dist/`.
   - `client/vercel.json` rewrites non-file routes to `/index.html` for React Router.
   - Sets `VITE_API_URL` to the deployed API project's URL (`https://<api-project>.vercel.app/api`).

## 2. Database Design Enhancements Over Proposal ER Diagram
The Prisma schema implements all 8 entities from Page 7 of the proposal (`users`, `customers`, `suppliers`, `products`, `transactions`, `order_items`, `documents`, `inventory_log`) plus §3.3 operational requirements:
- Nullable `supplier_id` and `customer_id` on `transactions` (import uses supplier; export uses customer).
- Trade metadata on `transactions`: `hs_code`, `origin_country`, `destination_country`, `duty_rate`, `duty_amount`, `incoterms`, `carrier`, `tracking_number`.
- `stock_batches` for FIFO and Weighted Average Cost valuation.
- `purchase_orders` / `purchase_order_items` for supplier PO approval workflows and on-time/accuracy metrics.
- `sales_orders` / `sales_order_items` for quotation-to-invoice-to-payment tracking.
- `communication_logs` for customer interaction history.
- `notifications` for automated low-stock and shipment status alerts.
- Explicit PostgreSQL indexes on all foreign key columns and lowercase `snake_case` table/column mapping.
