window.BrewPages = window.BrewPages || {}

BrewPages.cart = {
  title: 'Tray · BrewHub',
  user: null,
  codes: {},
  name: '',

  stop() {},

  async start() {
    this.user = UI.requireUser(['customer'])
    if (!this.user) return
    this.name = this.user.name
    this.render()
  },

  render() {
    const tray = BH.trayOf(this.user.id)
    if (!tray.length) {
      document.getElementById('app').innerHTML = `
        <header class="app-top"><div class="app-top-inner">${UI.brandHtml()}</div></header>
        <main class="page-pad"><div class="container-md">
          <h1 class="font-serif" style="font-size:2rem">Your tray</h1>
          <div class="card" style="padding:2rem;text-align:center;margin-top:1rem">
            <p class="font-bold">Nothing here yet</p>
            <p class="muted text-sm">Browse a shop and add drinks to get your QR.</p>
            <a class="btn btn-primary mt-3" href="#/stores">Find a coffee shop</a>
          </div>
        </div></main>
        ${UI.customerNav('cart')}`
      return
    }

    const storeIds = [...new Set(tray.map((l) => l.storeId))]
    let sections = ''
    for (const storeId of storeIds) {
      const store = BH.storeById(storeId)
      const lines = tray.filter((l) => l.storeId === storeId)
      const items = lines.map((l) => {
        const p = BH.db.products.find((x) => x.id === l.productId)
        return { price: BH.unitPrice(p, l.size, l.addOns || []), quantity: l.quantity, product: p, line: l }
      })
      const quote = BH.applyPromo(storeId, items, this.codes[storeId])
      sections += `<section class="card" style="padding:1rem;margin-bottom:1rem">
        <h2 style="margin:0;font-size:1.15rem;font-family:var(--font-sans)">${store.name}</h2>
        <p class="text-xs muted" style="margin:0 0 .5rem">${store.acceptingOrders ? 'Open' : 'Closed'} · ${store.address}</p>
        ${items
          .map(
            ({ product, line }) => `
          <div class="line">
            <img src="${BH.mediaUrl(product.image)}" alt="" />
            <div style="flex:1;min-width:0">
              <div class="font-bold">${product.name}</div>
              <div class="text-xs muted">${[line.size, ...(line.addOns || [])].filter(Boolean).join(' · ') || 'Standard'}</div>
              <div class="text-sm">${UI.peso(BH.unitPrice(product, line.size, line.addOns || []))}</div>
            </div>
            <div class="qty">
              <button data-id="${line.id}" data-q="${line.quantity - 1}">−</button>
              <strong>${line.quantity}</strong>
              <button data-id="${line.id}" data-q="${line.quantity + 1}">+</button>
            </div>
          </div>`
          )
          .join('')}
        <div class="field mt-3">
          <label>Promo code</label>
          <div class="flex gap-2">
            <input class="input" id="code-${storeId}" placeholder="Promo code" value="${this.codes[storeId] || ''}" />
            <button class="btn btn-outline apply-code" data-store="${storeId}">Apply</button>
          </div>
          ${quote.error ? `<p class="text-xs" style="color:var(--destructive)">${quote.error}</p>` : quote.discount ? `<p class="text-xs" style="color:#059669">${quote.promoLabel} · you save ${UI.peso(quote.discount)}</p>` : ''}
        </div>
        <div class="stack mt-3 text-sm">
          <div class="flex-between"><span class="muted">Subtotal</span><span>${UI.peso(quote.subtotal)}</span></div>
          ${quote.discount ? `<div class="flex-between"><span class="muted">Discount</span><span style="color:#059669">−${UI.peso(quote.discount)}</span></div>` : ''}
          <div class="flex-between font-bold" style="font-size:1.05rem"><span>Total</span><span>${UI.peso(quote.total)}</span></div>
        </div>
      </section>`
    }

    document.getElementById('app').innerHTML = `
      <header class="app-top"><div class="app-top-inner">${UI.brandHtml()}</div></header>
      <main class="page-pad"><div class="container-md">
        <h1 class="font-serif" style="font-size:2rem;margin:0 0 1rem">Your tray</h1>
        ${sections}
        <div class="field mb-3">
          <label>Name for your order</label>
          <input class="input" id="orderName" placeholder="Name for your order" value="${this.name}" />
        </div>
        <button class="btn btn-primary btn-lg w-full" id="checkout">Get my QR code</button>
        <p class="text-xs muted text-center mt-2">No payment yet. Show the QR to the cashier at the counter.</p>
      </div></main>
      ${UI.customerNav('cart')}`

    document.querySelectorAll('.qty button').forEach((b) =>
      b.addEventListener('click', () => {
        BH.setTrayQty(this.user.id, b.dataset.id, Number(b.dataset.q))
        this.render()
      })
    )
    document.querySelectorAll('.apply-code').forEach((b) =>
      b.addEventListener('click', () => {
        this.codes[b.dataset.store] = document.getElementById(`code-${b.dataset.store}`).value
        BH.trayOf(this.user.id)
          .filter((l) => l.storeId === b.dataset.store)
          .forEach((l) => {
            l._code = this.codes[b.dataset.store]
          })
        BH.save()
        this.render()
      })
    )
    document.getElementById('orderName').oninput = (e) => {
      this.name = e.target.value
    }
    document.getElementById('checkout').onclick = () => {
      try {
        Object.entries(this.codes).forEach(([storeId, code]) => {
          BH.trayOf(this.user.id)
            .filter((l) => l.storeId === storeId)
            .forEach((l) => {
              l._code = code
            })
        })
        BH.save()
        const created = BH.createOrdersFromTray(this.user.id, this.name)
        location.hash = `#/order/${created[0]}`
      } catch (err) {
        UI.toast(err.message)
      }
    }
  },
}
