window.BrewPages = window.BrewPages || {}

BrewPages.menu = {
  title: 'Menu · BrewHub',
  user: null,
  store: null,
  category: 'all',
  selected: null,
  qty: 1,
  size: null,
  addOns: [],
  note: '',

  stop() {
    this.selected = null
  },

  async start() {
    this.user = UI.requireUser(['customer'])
    if (!this.user) return
    this.category = 'all'
    this.store = BH.storeById(UI.qs('store'))
    if (!this.store || this.store.status !== 'approved') {
      document.getElementById('app').innerHTML = `<div class="container page-pad text-center"><h1>Shop not found</h1><a class="btn btn-primary mt-3" href="#/stores">Back to shops</a></div>`
      return
    }
    this.render()
  },

  trayInfo() {
    const tray = BH.trayOf(this.user.id).filter((l) => l.storeId === this.store.id)
    const count = tray.reduce((s, l) => s + l.quantity, 0)
    const total = tray.reduce((s, l) => {
      const p = BH.db.products.find((x) => x.id === l.productId)
      return s + (p ? BH.unitPrice(p, l.size, l.addOns || []) * l.quantity : 0)
    }, 0)
    return { count, total }
  },

  render() {
    if (!this.store.acceptingOrders) {
      document.getElementById('app').innerHTML = `
        <div class="container page-pad text-center">
          <div style="position:relative;height:10rem;border-radius:1rem;overflow:hidden;margin:0 auto;max-width:28rem">
            <img src="${BH.mediaUrl(this.store.image)}" style="width:100%;height:100%;object-fit:cover;filter:grayscale(1)" />
            <div style="position:absolute;inset:0;background:rgba(0,0,0,.55);display:grid;place-items:center"><span class="badge badge-closed">Closed</span></div>
          </div>
          <h1 class="mt-4">${this.store.name} is closed right now</h1>
          <p class="muted">Usual hours: ${UI.time12(this.store.openTime)} – ${UI.time12(this.store.closeTime)}</p>
          <a class="btn btn-primary mt-3" href="#/stores">See other coffee shops</a>
        </div>
        ${UI.customerNav('stores')}`
      return
    }

    const products = BH.productsOf(this.store.id)
    const cats = this.store.categories.filter((c) => products.some((p) => p.category === c.id))
    const visible = products.filter((p) => this.category === 'all' || p.category === this.category)
    const tray = this.trayInfo()

    document.getElementById('app').innerHTML = `
      <div class="menu-hero">
        <img src="${BH.mediaUrl(this.store.image)}" alt="${this.store.name}" />
        <div class="shade"></div>
        <div class="info">
          <a class="text-sm" href="#/stores" style="color:#fff;opacity:.9">← All shops</a>
          <h1>${this.store.name}</h1>
          <div class="text-sm" style="opacity:.9">${this.store.address} · ${UI.time12(this.store.openTime)} – ${UI.time12(this.store.closeTime)}</div>
        </div>
      </div>
      <div class="container" style="padding-top:1rem;padding-bottom:6rem">
        <p class="muted text-sm">${this.store.description}</p>
        <div class="filters">
          <button class="chip ${this.category === 'all' ? 'active' : ''}" data-c="all">Everything</button>
          ${cats.map((c) => `<button class="chip ${this.category === c.id ? 'active' : ''}" data-c="${c.id}">${c.name}</button>`).join('')}
        </div>
        <div class="product-list">
          ${visible
            .map(
              (p) => `
            <div class="product" data-id="${p.id}" style="${p.available ? '' : 'opacity:.55'}">
              <img src="${BH.mediaUrl(p.image)}" alt="${p.name}" />
              <div style="display:flex;flex-direction:column;min-width:0;flex:1">
                <h3>${p.name}</h3>
                <p>${p.description}</p>
                <div class="row">
                  <span class="price">${p.sizes.length ? 'from ' : ''}${UI.peso(p.price)}</span>
                  ${p.available ? `<button class="btn btn-primary btn-sm add-btn" data-id="${p.id}">+ Add</button>` : `<span class="text-xs muted">Sold out</span>`}
                </div>
              </div>
            </div>`
            )
            .join('')}
        </div>
      </div>
      ${tray.count ? `<a class="tray-bar" href="#/cart"><span>${tray.count} ${tray.count === 1 ? 'item' : 'items'} · ${UI.peso(tray.total)}</span><span>View tray →</span></a>` : ''}
      <div id="modal"></div>
      ${UI.customerNav('stores')}`

    document.querySelectorAll('.chip').forEach((b) =>
      b.addEventListener('click', () => {
        this.category = b.dataset.c
        this.render()
      })
    )
    document.querySelectorAll('.product').forEach((el) =>
      el.addEventListener('click', (e) => {
        if (e.target.closest('.add-btn')) return
        const p = products.find((x) => x.id === el.dataset.id)
        if (p?.available) this.openProduct(p)
      })
    )
    document.querySelectorAll('.add-btn').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation()
        const p = products.find((x) => x.id === b.dataset.id)
        BH.addToTray(this.user.id, p, 1, '')
        UI.toast(`Added 1× ${p.name} to your tray`)
        this.render()
      })
    )
    this.drawModal()
  },

  openProduct(p) {
    this.selected = p
    this.qty = 1
    this.size = p.sizes[0]?.name
    this.addOns = []
    this.note = ''
    this.drawModal()
  },

  drawModal() {
    const modal = document.getElementById('modal')
    if (!modal) return
    if (!this.selected) {
      modal.innerHTML = ''
      return
    }
    const selected = this.selected
    const { qty, size, addOns, note } = this
    const unit = BH.unitPrice(selected, size, addOns)
    modal.innerHTML = `
      <div class="modal-backdrop" id="backdrop">
        <div class="modal">
          <img class="hero" src="${BH.mediaUrl(selected.image)}" alt="${selected.name}" />
          <div class="modal-body">
            <div>
              <h2 class="font-serif" style="margin:0;font-size:1.6rem">${selected.name}</h2>
              <p class="muted text-sm">${selected.description}</p>
              <p class="font-bold" style="color:var(--primary);font-size:1.15rem">${UI.peso(unit)}</p>
            </div>
            ${
              selected.sizes.length
                ? `<div><p class="font-bold mb-2">Size</p><div class="size-grid">
                ${selected.sizes
                  .map(
                    (s) => `<button type="button" class="size-opt ${size === s.name ? 'active' : ''}" data-size="${s.name}">
                  <strong>${s.name}</strong><div class="text-xs muted">${s.priceDelta > 0 ? '+' + UI.peso(s.priceDelta) : 'No extra charge'}</div>
                </button>`
                  )
                  .join('')}
              </div></div>`
                : ''
            }
            ${
              selected.addOns.length
                ? `<div><p class="font-bold mb-2">Add-ons <span class="muted font-normal">(optional)</span></p>
              <div class="flex gap-2" style="flex-wrap:wrap">
                ${selected.addOns
                  .map(
                    (a) => `<button type="button" class="addon-opt ${addOns.includes(a.name) ? 'active' : ''}" data-addon="${a.name}">
                  ${a.name} <span class="muted">+${UI.peso(a.price)}</span>
                </button>`
                  )
                  .join('')}
              </div></div>`
                : ''
            }
            <div class="flex-between">
              <span class="font-bold">How many?</span>
              <div class="qty">
                <button type="button" id="minus">−</button>
                <strong>${qty}</strong>
                <button type="button" id="plus">+</button>
              </div>
            </div>
            <div class="field">
              <label>Special requests <span class="muted">(optional)</span></label>
              <textarea class="textarea" id="note" placeholder="Special requests">${note}</textarea>
            </div>
            <button class="btn btn-primary btn-lg w-full" id="confirmAdd">Add to tray · ${UI.peso(unit * qty)}</button>
          </div>
        </div>
      </div>`

    document.getElementById('backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'backdrop') {
        this.selected = null
        this.drawModal()
      }
    })
    document.querySelectorAll('.size-opt').forEach((b) =>
      b.addEventListener('click', () => {
        this.size = b.dataset.size
        this.drawModal()
      })
    )
    document.querySelectorAll('.addon-opt').forEach((b) =>
      b.addEventListener('click', () => {
        const name = b.dataset.addon
        this.addOns = this.addOns.includes(name) ? this.addOns.filter((x) => x !== name) : [...this.addOns, name]
        this.drawModal()
      })
    )
    document.getElementById('minus').onclick = () => {
      this.qty = Math.max(1, this.qty - 1)
      this.drawModal()
    }
    document.getElementById('plus').onclick = () => {
      this.qty = Math.min(99, this.qty + 1)
      this.drawModal()
    }
    document.getElementById('note').oninput = (e) => {
      this.note = e.target.value
    }
    document.getElementById('confirmAdd').onclick = () => {
      BH.addToTray(this.user.id, selected, this.qty, this.note, { size: this.size, addOns: this.addOns })
      UI.toast(`Added ${this.qty}× ${selected.name} to your tray`)
      this.selected = null
      this.render()
    }
  },
}
