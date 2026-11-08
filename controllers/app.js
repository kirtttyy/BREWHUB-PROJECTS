/** SPA router — customer + cashier, same UI / localStorage. */
window.BrewPages = window.BrewPages || {}

const App = {
  current: null,
  loaded: new Set(),

  routes: [
    { match: /^stores\/?$/, key: 'stores', src: 'views/customer/stores.js', roles: ['customer'] },
    { match: /^menu\/([^/?]+)\/?$/, key: 'menu', src: 'views/customer/menu.js', roles: ['customer'], param: 'store' },
    { match: /^cart\/?$/, key: 'cart', src: 'views/customer/cart.js', roles: ['customer'] },
    { match: /^orders\/?$/, key: 'orders', src: 'views/customer/orders.js', roles: ['customer'] },
    { match: /^order\/([^/?]+)\/?$/, key: 'order', src: 'views/customer/order.js', roles: ['customer'], param: 'code' },
    { match: /^me\/?$/, key: 'me', src: 'views/customer/me.js', roles: ['customer'] },
    { match: /^cashier\/?$/, key: 'cashierHome', src: 'views/cashier/index.js', roles: ['store_owner'] },
    { match: /^cashier\/scan\/?$/, key: 'cashierScan', src: 'views/cashier/scan.js', roles: ['store_owner'] },
    { match: /^cashier\/orders\/?$/, key: 'cashierOrders', src: 'views/cashier/orders.js', roles: ['store_owner'] },
    { match: /^cashier\/products\/?$/, key: 'cashierProducts', src: 'views/cashier/products.js', roles: ['store_owner'] },
    { match: /^cashier\/settings\/?$/, key: 'cashierSettings', src: 'views/cashier/settings.js', roles: ['store_owner'] },
  ],

  parse() {
    const raw = (location.hash || '').replace(/^#\/?/, '')
    const [pathPart, query = ''] = raw.split('?')
    const path = pathPart || ''
    const queryParams = Object.fromEntries(new URLSearchParams(query))
    for (const route of this.routes) {
      const m = path.match(route.match)
      if (!m) continue
      const params = { ...queryParams }
      if (route.param && m[1]) params[route.param] = decodeURIComponent(m[1])
      return { ...route, params }
    }
    return null
  },

  loadScript(src) {
    if (this.loaded.has(src)) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const el = document.createElement('script')
      el.src = src
      el.onload = () => {
        this.loaded.add(src)
        resolve()
      }
      el.onerror = () => reject(new Error('Failed to load ' + src))
      document.body.appendChild(el)
    })
  },

  async stopCurrent() {
    if (this.current && BrewPages[this.current]?.stop) {
      try {
        await BrewPages[this.current].stop()
      } catch (_) {}
    }
    this.current = null
  },

  defaultHashFor(user) {
    if (user.role === 'store_owner') return '#/cashier'
    if (user.role === 'customer') return '#/stores'
    return null
  },

  async route() {
    await BH.init()
    const user = BH.sessionUser()
    if (!user) {
      location.href = 'login.html'
      return
    }
    if (user.role === 'admin') {
      location.href = 'admin/index.html'
      return
    }

    let hit = this.parse()
    if (!hit) {
      const fallback = this.defaultHashFor(user)
      if (fallback) {
        location.hash = fallback
        return
      }
      location.href = 'index.html'
      return
    }

    if (!hit.roles.includes(user.role)) {
      location.hash = this.defaultHashFor(user) || '#/stores'
      return
    }

    BH.routeParams = hit.params || {}
    await this.stopCurrent()
    await this.loadScript(hit.src)
    const page = BrewPages[hit.key]
    if (!page?.start) {
      document.getElementById('app').innerHTML = `<div class="page-pad container"><p class="muted">Page missing: ${hit.key}</p></div>`
      return
    }
    this.current = hit.key
    document.title = page.title || 'BrewHub'
    await page.start(hit.params || {})
  },

  async start() {
    window.addEventListener('hashchange', () => this.route())
    if (!location.hash || location.hash === '#') {
      await BH.init()
      const user = BH.sessionUser()
      if (!user) {
        location.href = 'login.html'
        return
      }
      location.hash = this.defaultHashFor(user) || '#/stores'
      return
    }
    await this.route()
  },
}

App.start()
