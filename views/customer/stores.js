window.BrewPages = window.BrewPages || {}

BrewPages.stores = {
  title: 'Shops · BrewHub',
  openOnly: false,
  user: null,

  stop() {},

  async start() {
    this.user = UI.requireUser(['customer'])
    if (!this.user) return
    this.render()
  },

  render() {
    let shops = BH.approvedStores().sort(
      (a, b) => Number(b.acceptingOrders) - Number(a.acceptingOrders) || b.rating - a.rating
    )
    if (this.openOnly) shops = shops.filter((s) => s.acceptingOrders)

    document.getElementById('app').innerHTML = `
      <header class="app-top">
        <div class="app-top-inner">
          ${UI.brandHtml()}
          <div style="margin-left:auto" class="text-sm muted">Hi, ${this.user.name.split(' ')[0]}</div>
        </div>
      </header>
      <main class="page-pad">
        <div class="container">
          <h1 class="font-serif" style="font-size:2rem;margin:0 0 .35rem">Coffee shops</h1>
          <p class="muted mb-3">Order ahead, then pay at the counter.</p>
          <div class="filters" id="filters">
            <button class="chip ${!this.openOnly ? 'active' : ''}" data-f="all">All shops</button>
            <button class="chip ${this.openOnly ? 'active' : ''}" data-f="open">Open now</button>
          </div>
          <div class="shop-grid">${shops.map((s) => this.shopCard(s)).join('') || '<p class="muted">No shops available yet.</p>'}</div>
        </div>
      </main>
      ${UI.customerNav('stores')}`

        document.querySelectorAll('#filters .chip').forEach((b) =>
      b.addEventListener('click', () => {
        this.openOnly = b.dataset.f === 'open'
        this.render()
      })
    )
    document.querySelectorAll('.shop-desc-more').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const desc = btn.previousElementSibling
        const open = desc.classList.toggle('is-open')
        btn.textContent = open ? 'See less' : 'See more'
      })
    )
  },

  shopCard(s) {
    const open = s.acceptingOrders
    const count = BH.productsOf(s.id).length
    const desc = String(s.description || '').trim()
    const long = desc.length > 90
    return `
      <${open ? 'a' : 'div'} class="shop-card ${open ? 'open' : 'closed'}" ${open ? `href="#/menu/${s.id}"` : ''}>
        <div class="cover">
          <img src="${BH.mediaUrl(s.image)}" alt="${s.name}" />
          ${open
            ? `<span class="badge badge-open" style="position:absolute;left:.75rem;top:.75rem">● Open</span>`
            : `<div class="closed-overlay"><strong>Closed</strong><span class="text-xs">Unavailable right now</span></div>`}
        </div>
        <div class="shop-body">
          <div class="flex-between"><h3>${s.name}</h3>
            ${s.rating ? `<span class="text-sm font-bold" style="color:#d97706">★ ${s.rating.toFixed(1)}</span>` : ''}
          </div>
          <p class="shop-desc">${desc}</p>
          ${long ? `<button type="button" class="shop-desc-more">See more</button>` : ''}
          <div class="shop-meta">
            <span>${s.address}</span>
            <span>${UI.time12(s.openTime)} – ${UI.time12(s.closeTime)}</span>
          </div>
          <div class="shop-foot">
            <span class="muted">${count} items</span>
            <span class="cta">${open ? 'See menu →' : `Opens at ${UI.time12(s.openTime)}`}</span>
          </div>
        </div>
      </${open ? 'a' : 'div'}>`
  },
}
