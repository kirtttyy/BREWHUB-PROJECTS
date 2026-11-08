window.BrewPages = window.BrewPages || {}

BrewPages.orders = {
  title: 'Orders · BrewHub',

  stop() {},

  async start() {
    const user = UI.requireUser(['customer'])
    if (!user) return
    const orders = BH.db.orders
      .filter((o) => o.customerId === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    document.getElementById('app').innerHTML = `
      <header class="app-top"><div class="app-top-inner">${UI.brandHtml()}</div></header>
      <main class="page-pad"><div class="container-md">
        <h1 class="font-serif" style="font-size:2rem;margin:0 0 1rem">My orders</h1>
        ${
          orders.length === 0
            ? `<div class="card" style="padding:2rem;text-align:center"><p class="font-bold">No orders yet</p><a class="btn btn-primary mt-3" href="#/stores">Order now</a></div>`
            : orders
                .map((o) => {
                  const status = BH.effectiveStatus(o)
                  const store = BH.storeById(o.storeId)
                  return `<a class="card" style="display:block;padding:1rem;margin-bottom:.75rem" href="#/order/${o.code}">
                    <div class="flex-between gap-2">
                      <div>
                        <div class="font-bold">${o.code}</div>
                        <div class="text-sm muted">${store?.name || 'Shop'} · ${UI.peso(o.total)}</div>
                      </div>
                      <span class="status-pill status-${status}">${UI.statusLabel(status)}</span>
                    </div>
                  </a>`
                })
                .join('')
        }
      </div></main>
      ${UI.customerNav('orders')}`
  },
}
