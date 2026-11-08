# BrewHub MVC layout

| Layer | Where | Responsibility |
|---|---|---|
| **Model** | `models/db.js` + `db.json` | Data + business rules (localStorage) |
| **View** | `views/customer/*.js`, `views/cashier/*.js` | Builds screens into `#app` |
| **Controller** | `controllers/app.js` (SPA router) + page modules | Routes + user actions → Model → View |
| **Pages** | `app.html` (customer + cashier SPA), `admin/*.html`, `index.html`, login/register | Entry shells |
| **Utils** | `utils/ui.js` | Shared UI helpers (nav, toast, QR) |
| **Media** | `images/` | Uploaded store/product images |

## App entry (SPA)
```
app.html#/stores              customer shops
app.html#/menu/:storeId
app.html#/cart
app.html#/orders
app.html#/order/:code
app.html#/me
app.html#/cashier             store owner dashboard
app.html#/cashier/scan
app.html#/cashier/orders
app.html#/cashier/products
app.html#/cashier/settings
```

Same UI and localStorage keys as before. Login redirects via `BH.homeFor()`.

## Roles
- **1 Admin** — approve stores, manage users (`admin/`)
- **Store owner** — 1 account = 1 store
- **Customer** — register, order, QR

## Run
```bash
node server.js
```
Open http://127.0.0.1:5501
