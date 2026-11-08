window.BrewPages = window.BrewPages || {}

BrewPages.cashierHome = {
  title: 'Cashier · BrewHub',
  user: null,
  store: null,

  stop() {},

  async start() {
    this.user = UI.requireUser(['store_owner'])
    if (!this.user) return
    this.store = BH.storeOfOwner(this.user.id)
    this.render()
  },

  bindOut() {
    const btn = document.getElementById('signOutBtn')
    if (btn)
      btn.onclick = () => {
        BH.signOut()
        location.href = 'index.html'
      }
  },

  render() {
    if (!this.store) {
      document.getElementById('app').innerHTML = `<div class="cashier-layout">${UI.cashierSidebar('home')}<main class="cashier-main"><div class="card" style="padding:1.25rem"><p class="font-bold">No shop linked</p><p class="muted text-sm">Register as a store first, then wait for admin approval.</p></div></main></div>`
      this.bindOut()
      return
    }

    const orders = BH.db.orders.filter((o) => o.storeId === this.store.id)
    const stats = {
      waiting: orders.filter((o) => BH.effectiveStatus(o) === 'waiting_payment').length,
      preparing: orders.filter((o) => o.status === 'preparing').length,
      ready: orders.filter((o) => o.status === 'ready').length,
      claimedToday: orders.filter(
        (o) => o.status === 'claimed' && o.claimedAt && new Date(o.claimedAt).toDateString() === new Date().toDateString()
      ).length,
    }

    document.getElementById('app').innerHTML = `<div class="cashier-layout">${UI.cashierSidebar('home')}<main class="cashier-main">
      <div class="cashier-top">
        <div>
          <h1 class="font-serif" style="margin:0;font-size:2rem">${this.store.name}</h1>
          <p class="muted text-sm" style="margin:.2rem 0 0">Store owner dashboard · status: ${this.store.status}</p>
        </div>
        <a class="btn btn-primary" href="#/cashier/scan">${UI.svg('scan')} Scan QR</a>
      </div>
      ${
        this.store.status !== 'approved'
          ? `<div class="card mb-4" style="padding:1rem">
              <div class="font-bold">Waiting for admin approval</div>
              <div class="text-sm muted">Your shop stays hidden until an admin approves it. You can still prepare products.</div>
            </div>`
          : `<div class="open-toggle ${this.store.acceptingOrders ? 'on' : 'off'} mb-4">
              <div>
                <div class="font-bold">Shop is ${this.store.acceptingOrders ? 'Open' : 'Closed'}</div>
                <div class="text-xs muted">${this.store.acceptingOrders ? 'Customers can open your shop and order.' : 'Customers see you as Closed and can’t open your shop.'}</div>
              </div>
              <button class="switch ${this.store.acceptingOrders ? 'on' : ''}" id="toggle" aria-label="Open or closed"></button>
            </div>`
      }
      <div class="stat-grid mb-4">
        <div class="stat"><div class="label">Waiting to pay</div><div class="value">${stats.waiting}</div></div>
        <div class="stat"><div class="label">Preparing</div><div class="value">${stats.preparing}</div></div>
        <div class="stat"><div class="label">Ready</div><div class="value">${stats.ready}</div></div>
        <div class="stat"><div class="label">Claimed today</div><div class="value">${stats.claimedToday}</div></div>
      </div>
      <div class="stack">
        <a class="admin-link-card" href="#/cashier/scan">
          <div>
            <div class="font-bold">Scan a customer QR</div>
            <div class="text-sm muted">Type the code if the camera isn’t available.</div>
          </div>
          <span>${UI.svg('arrow')}</span>
        </a>
        <a class="admin-link-card" href="#/cashier/products">
          <div>
            <div class="font-bold">Manage products</div>
            <div class="text-sm muted">Add menu items for ${this.store.name} only.</div>
          </div>
          <span>${UI.svg('arrow')}</span>
        </a>
      </div>
    </main></div>`

    this.bindOut()
    const toggle = document.getElementById('toggle')
    if (toggle) {
      toggle.onclick = () => {
        try {
          const next = !this.store.acceptingOrders
          BH.setAccepting(this.store.id, next)
          UI.toast(next ? 'Your shop is now Open.' : 'Your shop is now Closed.')
          this.store = BH.storeOfOwner(this.user.id)
          this.render()
        } catch (err) {
          UI.toast(err.message)
        }
      }
    }
  },
}
