# POS System Frontend

Point-of-sale web app for a clothing shop. Supports English and Khmer.

## Tech Stack
- React + TypeScript
- Vite
- Tailwind CSS
- Axios, react-i18next

## Features
- POS screen with color and size selection, cart, discount, and payment (Cash, KHQR, Bank transfer)
- Printable receipt
- Product list, search, and add/edit products with photo upload (admin)
- Inventory: add/remove stock and view stock history (admin)
- Sales history and void sale (admin)
- Customer management
- Dashboard with daily sales, best sellers, and low-stock list (admin)
- Employee management (admin)

## Requirements
- Node.js 20 or newer
- The StylePOS backend running on http://localhost:8000

## Installation
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## Build
```bash
npm run build
```

## Demo Accounts
| Role    | Email                 | Password |
|---------|-----------------------|----------|
| Admin   | admin@stylepos.test   | password |
| Cashier | cashier@stylepos.test | password |

## Project Structure
```
src/
  app/          routes
  features/     pages (auth, pos, products, inventory, sales, customers, dashboard, users)
  components/   shared components
  lib/          API client and helpers
  i18n/         English and Khmer text (en.json, km.json)
  index.css     colors and fonts
```

## Notes
- To change the Khmer font, edit `--font-khmer` in `src/index.css` and the font link in `index.html`.
- The dev server forwards `/api`, `/sanctum`, and `/product-images` to the backend (see `vite.config.ts`).

## Live demo (GitHub Pages)
https://mrphanun.github.io/AiPOSSystem/ — runs entirely in the browser with sample data (no backend needed).

| Role  | Email            | Password  |
|-------|------------------|-----------|
| Admin | testing@pos.com  | 123456789 |

Demo data is stored in your browser (clear site data to reset). Build it locally with `VITE_DEMO=true npm run build`.

## Full stack (SQL Server)
`database/schema.sql` creates the tables, `backend/` is the Express API (`cd backend && npm install && node seed.js && npm start`, copy `.env.example` to `.env` first).
