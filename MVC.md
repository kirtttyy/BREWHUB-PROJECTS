# BrewHub MVC layout

| Layer | Folder | Responsibility |
|---|---|---|
| **Model** | `models/` | `db.json` + `db.js` business rules |
| **View** | HTML pages + `css/` | Screens & styles |
| **Controller** | `controllers/` + page scripts | User actions → Model → View |
| **Utils** | `utils/ui.js` | Shared UI helpers |
| **Media** | `images/` | Uploaded store/product images |

## Roles
- **1 Admin** — approve stores, manage users
- **Store owner** — 1 account = 1 store; products for that store only
- **Customer** — register, order, QR

Seed data: admin account only. Stores/products come from registration.

## Run
```bash
node server.js
```
Open http://127.0.0.1:5501
