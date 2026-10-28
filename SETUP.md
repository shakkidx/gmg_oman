# Global Markets Gateway — Online Store

Storefront + admin panel for MEVRIO chargers, power banks and cables, with Odoo 19 stock/order sync and Thawani Pay.

## Run it on your computer

```bash
npm install
npm start
```

- Shop: http://localhost:3000
- Admin: http://localhost:3000/admin — first login `admin` / `AdminPassword123!` (you'll be asked to change it)

The database (`data/store.db`) is created automatically on first start with the 16 MEVRIO products.

## Go live checklist

1. **`.env`** — set `NODE_ENV=production`, a long random `JWT_SECRET`, and `APP_URL=https://your-domain` (Thawani sends customers back to this address after payment).
2. **Admin → Settings** — check phone, WhatsApp, email, address, delivery fees, and whether prices include VAT.
3. **Admin → Odoo sync** — enter Odoo address, database, API user and API key, warehouse ID, then switch on *Live connection* and press *Save & test connection*.
   - Every website product's **SKU must equal the product's Internal Reference in Odoo**.
   - Stock syncs automatically (default every 10 minutes). Customers never see stock numbers; they just can't order more than you have.
4. **Admin → Settings → Payments** — paste your Thawani live keys and switch on *Thawani live mode*. In the Thawani portal, set the webhook URL to `https://your-domain/api/thawani/webhook`.
5. Change the admin password.

## How orders flow

- **Cash on delivery** → order saved, stock reserved, sales order created in Odoo right away.
- **Thawani** → customer pays on Thawani's page → payment is verified with Thawani's API → order confirmed and sent to Odoo. Unpaid card orders release their stock after 45 minutes (configurable).
- If Odoo is offline, orders are retried every 5 minutes. Admin → Odoo sync shows the log.

## Adding products

Admin → Products → **Add product**: upload photos (resized automatically), name, category, price, sale price, your cost (private), SKU. Fill in *Homepage banner headline* to put the product in the animated banner on the homepage.

## Useful commands

```bash
npm test                                # pricing, stock, Odoo and Thawani tests
node scripts/seed_mevrio_products.js    # reset catalogue to the MEVRIO starter list (only if there are no orders)
node scripts/discover_odoo.js           # list companies/warehouses in your Odoo to find the IDs
```

Product photo thumbnails live in `public/thumbs/`. New uploads are already web-sized, so no extra step is needed.
