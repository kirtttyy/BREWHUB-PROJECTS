window.BrewPages = window.BrewPages || {}

BrewPages.cashierOrders = {
  title: 'Orders · Cashier',

  stop() {},

  async start() {
    const user = UI.requireUser(['store_owner'])
    if (!user) return
    const stores = BH.storesOfOwner(user.id)
    const storeIds = new Set(stores.map((s) => s.id))
    const orders = BH.db.orders
      .filter((o) => storeIds.has(o.storeId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    const groups = [
      { key: 'waiting_payment', title: 'Waiting for payment' },
      { key: 'preparing', title: 'Preparing' },
      { key: 'ready', title: 'Ready to claim' },
      { key: 'done', title: 'Done / other' },
    ]

    const groupsHtml = groups
      .map((g) => {
        const list = orders.filter((o) => {
          const s = BH.effectiveStatus(o)
          if (g.key === 'done') return ['claimed', 'cancelled', 'expired'].includes(s)
          return s === g.key
        })
        if (!list.length) return ''
        return `<section class="mb-4">
          <h2 style="font-size:1rem;margin:0 0 .6rem;font-family:var(--font-sans)">${g.title}</h2>
          ${list
            .map((o) => {
              const status = BH.effectiveStatus(o)
              return `<a class="card" style="display:flex;justify-content:space-between;align-items:center;padding:1rem;margin-bottom:.55rem" href="#/cashier/scan?code=${encodeURIComponent(o.code)}">
                <div>
                  <div class="font-bold">${o.code}${o.queueNumber ? ` · #${o.queueNumber}` : ''}</div>
                  <div class="text-sm muted">${BH.storeById(o.storeId)?.name || 'Shop'} · ${o.customerName} · ${UI.peso(o.total)}</div>
                </div>
                <span class="status-pill status-${status}">${UI.statusLabel(status)}</span>
              </a>`
            })
            .join('')}
        </section>`
      })
      .join('')

    document.getElementById('app').innerHTML = `<div class="cashier-layout">${UI.cashierSidebar('orders')}<main class="cashier-main">
      <div class="cashier-top">
        <div>
          <h1 class="font-serif" style="margin:0;font-size:2rem">Orders</h1>
          <p class="muted text-sm" style="margin:.2rem 0 0">${stores.map((s) => s.name).join(' · ') || 'Your shops'}</p>
        </div>
      </div>
      ${groupsHtml || `<div class="card" style="padding:2rem;text-align:center"><p class="muted">No orders yet. When a customer gets a QR, it will show up here.</p></div>`}
    </main></div>`

    document.getElementById('signOutBtn').onclick = () => {
      BH.signOut()
      location.href = 'index.html'
    }
  },
}
