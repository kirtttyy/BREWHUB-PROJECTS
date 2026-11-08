window.BrewPages = window.BrewPages || {}

BrewPages.cashierSettings = {
  title: 'Settings · Cashier',
  user: null,
  store: null,

  stop() {},

  async start() {
    this.user = UI.requireUser(['store_owner'])
    if (!this.user) return
    this.store = BH.storeOfOwner(this.user.id)
    this.render()
  },

  render() {
    if (!this.store) {
      document.getElementById('app').innerHTML = `<div class="cashier-layout">${UI.cashierSidebar('settings')}<main class="cashier-main"><div class="card" style="padding:1.25rem"><p class="muted">No shop linked to this account.</p></div></main></div>`
    } else {
      document.getElementById('app').innerHTML = `<div class="cashier-layout">${UI.cashierSidebar('settings')}<main class="cashier-main">
        <div class="cashier-top">
          <div>
            <h1 class="font-serif" style="margin:0;font-size:2rem">Shop settings</h1>
            <p class="muted text-sm" style="margin:.2rem 0 0">Status: ${this.store.status}</p>
          </div>
        </div>
        ${
          this.store.status === 'approved'
            ? `<div class="open-toggle ${this.store.acceptingOrders ? 'on' : 'off'} mb-4">
                <div>
                  <div class="font-bold">Your shop is ${this.store.acceptingOrders ? 'Open' : 'Closed'}</div>
                  <div class="text-xs muted">${
                    this.store.acceptingOrders
                      ? 'Customers can see your shop and order. Switch off when you close.'
                      : 'Customers see your shop as Closed and can’t open it or order.'
                  }</div>
                </div>
                <button class="switch ${this.store.acceptingOrders ? 'on' : ''}" id="toggle"></button>
              </div>`
            : `<div class="card mb-4" style="padding:1rem">
                <div class="font-bold">Waiting for admin approval</div>
                <div class="text-sm muted">You can manage products while pending. Open/Closed unlocks after approval.</div>
              </div>`
        }
        <div class="card" style="padding:1.2rem">
          <div class="stack">
            <div class="field"><label>Shop name</label><input class="input" value="${this.store.name}" disabled /></div>
            <div class="field"><label>Street address</label><input class="input" value="${this.store.address}" disabled /></div>
            <div class="field"><label>Area</label><input class="input" value="${this.store.area}" disabled /></div>
            <div class="flex gap-2">
              <div class="field" style="flex:1"><label>Opens at</label><input class="input" value="${this.store.openTime}" disabled /></div>
              <div class="field" style="flex:1"><label>Closes at</label><input class="input" value="${this.store.closeTime}" disabled /></div>
            </div>
          </div>
        </div>
      </main></div>`

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
    }

    document.getElementById('signOutBtn').onclick = () => {
      BH.signOut()
      location.href = 'index.html'
    }
  },
}
