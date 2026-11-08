const DB_KEY = 'brewhub-html-db'
const SEED_KEY = 'brewhub-html-seed'
const SESSION_KEY = 'brewhub-html-session'
const ORDER_TTL_MS = 30 * 60 * 1000

const BH = {
  db: null,
  seed: null,

  async init() {
    // Prefer cached JSON seed so the app still boots when offline / no network.
    this.seed = this.readJson(SEED_KEY) || (await this.fetchSeed()) || this.readJson(DB_KEY)

    if (!this.seed) {
      throw new Error('Could not load BrewHub data. Open the app once while online, then it will work offline.')
    }

    // Keep a local JSON copy of the seed for offline reloads.
    localStorage.setItem(SEED_KEY, JSON.stringify(this.seed))

    const saved = this.readJson(DB_KEY)
    if (saved && saved.version === this.seed.version) {
      this.db = saved
      this.save()
      return this.db
    }

    this.db = structuredClone(this.seed)
    this.save()
    return this.db
  },

  readJson(key) {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch (_) {
      return null
    }
  },

  async fetchSeed() {
    try {
      const res = await fetch(this.dataUrl(), { cache: 'no-store' })
      if (!res.ok) return null
      return await res.json()
    } catch (_) {
      return null
    }
  },

  dataUrl() {
    const path = location.pathname.replace(/\\/g, '/')
    if (path.includes('/customer/') || path.includes('/cashier/') || path.includes('/admin/')) return '../data/db.json'
    return 'data/db.json'
  },

  save() {
    // Persist the full JSON database in localStorage (survives refresh / offline / browser close).
    const json = JSON.stringify(this.db)
    localStorage.setItem(DB_KEY, json)
  },

  exportJson() {
    const blob = new Blob([JSON.stringify(this.db, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brewhub-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  },

  apiUrl(pathname) {
    // Same origin when using node server.js; Live Server has no write API.
    return pathname
  },

  async canSaveToDbFile() {
    try {
      const res = await fetch(this.apiUrl('/api/health'), { cache: 'no-store' })
      if (!res.ok) return false
      const data = await res.json()
      return !!data.save
    } catch (_) {
      return false
    }
  },

  async saveToDbFile() {
    this.save()
    const res = await fetch(this.apiUrl('/api/save-db'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.db),
    })
    let data = null
    try { data = await res.json() } catch (_) {}
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || 'Could not save to data/db.json. Run: node server.js then open http://127.0.0.1:5501')
    }
    // Keep seed in sync so reloads match the file you just wrote.
    localStorage.setItem(SEED_KEY, JSON.stringify(this.db))
    this.seed = structuredClone(this.db)
    return data
  },

  reset() {
    this.db = structuredClone(this.seed || this.readJson(SEED_KEY))
    this.save()
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
  },

  uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
  },

  sessionUser() {
    const id = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY)
    if (!id) return null
    return this.db.users.find((u) => u.id === id) || null
  },

  normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '')
  },

  signIn(phone, password) {
    const digits = this.normalizePhone(phone)
    const user = this.db.users.find((u) => this.normalizePhone(u.phone) === digits)
    if (!user || user.password !== password) throw new Error('That phone number and password combination doesn’t match our records.')
    sessionStorage.setItem(SESSION_KEY, user.id)
    localStorage.setItem(SESSION_KEY, user.id)
    return user
  },

  registerCustomer({ firstName, lastName, address, phone, email, password }) {
    const first = String(firstName || '').trim()
    const last = String(lastName || '').trim()
    const live = String(address || '').trim()
    const phoneNum = String(phone || '').trim()
    const mail = String(email || '').trim().toLowerCase()
    const pass = String(password || '')
    const digits = this.normalizePhone(phoneNum)

    if (!first || !last) throw new Error('Please enter your first and last name.')
    if (!live) throw new Error('Please tell us where you live.')
    if (digits.length < 10) throw new Error('Please enter a valid phone number.')
    if (!mail || !mail.includes('@')) throw new Error('Please enter a valid email.')
    if (pass.length < 6) throw new Error('Password should be at least 6 characters.')
    if (this.db.users.some((u) => this.normalizePhone(u.phone) === digits)) {
      throw new Error('That phone number is already registered. Try signing in instead.')
    }
    if (this.db.users.some((u) => u.email.toLowerCase() === mail)) {
      throw new Error('That email is already registered. Try signing in instead.')
    }

    const user = {
      id: this.uid('u'),
      name: `${first} ${last}`,
      firstName: first,
      lastName: last,
      address: live,
      phone: phoneNum,
      email: mail,
      password: pass,
      role: 'customer',
    }
    this.db.users.push(user)
    this.save()
    sessionStorage.setItem(SESSION_KEY, user.id)
    localStorage.setItem(SESSION_KEY, user.id)
    return user
  },

  signOut() {
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_KEY)
  },

  homeFor(user) {
    if (user.role === 'admin') return this.path('admin/index.html')
    if (user.role === 'store_owner') return this.path('cashier/index.html')
    return this.path('customer/stores.html')
  },

  path(rel) {
    const p = location.pathname.replace(/\\/g, '/')
    if (p.includes('/customer/') || p.includes('/cashier/') || p.includes('/admin/')) {
      if (rel.startsWith('customer/') || rel.startsWith('cashier/') || rel.startsWith('admin/')) return '../' + rel
      return '../' + rel
    }
    return rel
  },

  asset(rel) {
    const p = location.pathname.replace(/\\/g, '/')
    if (p.includes('/customer/') || p.includes('/cashier/') || p.includes('/admin/')) return '../' + rel
    return rel
  },

  approvedStores() {
    return this.db.stores.filter((s) => s.status === 'approved')
  },

  storeById(id) {
    return this.db.stores.find((s) => s.id === id)
  },

  storeOfOwner(ownerId) {
    return this.db.stores.find((s) => s.ownerId === ownerId)
  },

  storesOfOwner(ownerId) {
    return this.db.stores.filter((s) => s.ownerId === ownerId)
  },

  ownsStore(ownerId, storeId) {
    return this.db.stores.some((s) => s.ownerId === ownerId && s.id === storeId)
  },

  productsOf(storeId) {
    return this.db.products.filter((p) => p.storeId === storeId)
  },

  isDrink(store, categoryId) {
    return store?.categories?.find((c) => c.id === categoryId)?.isDrink ?? false
  },

  unitPrice(product, size, addOns = []) {
    const sizeDelta = product.sizes.find((s) => s.name === size)?.priceDelta ?? 0
    const extras = addOns.reduce((sum, name) => sum + (product.addOns.find((a) => a.name === name)?.price ?? 0), 0)
    return product.price + sizeDelta + extras
  },

  trayOf(userId) {
    if (!this.db.trays[userId]) this.db.trays[userId] = []
    return this.db.trays[userId]
  },

  addToTray(userId, product, qty, note, options = {}) {
    const tray = this.trayOf(userId)
    const size = options.size ?? product.sizes[0]?.name
    const addOns = options.addOns ?? []
    const existing = tray.find(
      (l) =>
        l.productId === product.id &&
        (l.size || '') === (size || '') &&
        (l.note || '') === (note || '') &&
        [...(l.addOns || [])].sort().join('|') === [...addOns].sort().join('|')
    )
    if (existing) existing.quantity = Math.min(99, existing.quantity + qty)
    else tray.push({ id: this.uid('t'), productId: product.id, storeId: product.storeId, quantity: qty, size, addOns, note: note || '' })
    this.save()
  },

  setTrayQty(userId, lineId, qty) {
    const tray = this.trayOf(userId)
    this.db.trays[userId] =
      qty <= 0 ? tray.filter((l) => l.id !== lineId) : tray.map((l) => (l.id === lineId ? { ...l, quantity: Math.min(99, qty) } : l))
    this.save()
  },

  applyPromo(storeId, items, code) {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
    let discount = 0
    let promoLabel = ''
    const wanted = (code || '').trim().toUpperCase()
    if (wanted) {
      const promo = this.db.promos.find((p) => p.storeId === storeId && p.active && p.type === 'promo_code' && p.code === wanted)
      if (!promo) return { subtotal, discount: 0, total: subtotal, error: 'We couldn’t find that code for this shop.' }
      if (subtotal < (promo.minSpend || 0)) {
        return { subtotal, discount: 0, total: subtotal, error: `Add ₱${(promo.minSpend || 0) - subtotal} more to use this code.` }
      }
      discount = promo.discountType === 'amount' ? Math.min(subtotal, promo.amount) : Math.round((subtotal * promo.amount) / 100)
      promoLabel = promo.name
    }
    return { subtotal, discount, total: Math.max(0, subtotal - discount), promoLabel, code: wanted || undefined }
  },

  createOrdersFromTray(userId, customerName) {
    const user = this.db.users.find((u) => u.id === userId)
    const tray = this.trayOf(userId)
    if (!tray.length) throw new Error('Your tray is empty.')
    const byStore = new Map()
    for (const line of tray) {
      const product = this.db.products.find((p) => p.id === line.productId)
      const store = this.storeById(line.storeId)
      if (!product?.available) throw new Error(`${product?.name || 'An item'} just sold out.`)
      if (!store?.acceptingOrders) throw new Error(`${store?.name || 'This shop'} isn’t taking orders right now.`)
      byStore.set(line.storeId, [...(byStore.get(line.storeId) || []), { line, product, store }])
    }
    const codes = []
    const now = Date.now()
    for (const [storeId, rows] of byStore) {
      const store = rows[0].store
      const items = rows.map(({ line, product }) => {
        const addOns = line.addOns || []
        return {
          productId: product.id,
          name: product.name,
          image: product.image,
          price: this.unitPrice(product, line.size, addOns),
          quantity: line.quantity,
          note: line.note || '',
          category: product.category,
          isDrink: this.isDrink(store, product.category),
          size: line.size,
          addOns,
          points: product.points,
        }
      })
      const quote = this.applyPromo(storeId, items, rows[0].line._code)
      const code = this.nextOrderCode()
      this.db.orders.push({
        id: this.uid('o'),
        code,
        storeId,
        customerId: userId,
        customerName: customerName.trim() || user.name,
        items,
        subtotal: quote.subtotal,
        discount: quote.discount,
        promoLabel: quote.promoLabel,
        promoCode: quote.code,
        total: quote.total,
        status: 'waiting_payment',
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + ORDER_TTL_MS).toISOString(),
      })
      codes.push(code)
    }
    this.db.trays[userId] = []
    this.save()
    return codes
  },

  nextOrderCode() {
    const used = new Set(this.db.orders.map((o) => o.code))
    for (let i = 0; i < 40; i++) {
      const code = `BH-${Math.floor(1000 + Math.random() * 9000)}`
      if (!used.has(code)) return code
    }
    return `BH-${Date.now().toString().slice(-4)}`
  },

  normalizeCode(input) {
    const cleaned = String(input || '').trim().toUpperCase().replace(/^BREWHUB:/, '')
    const digits = cleaned.replace(/^BH-?/, '')
    if (/^\d{4}$/.test(digits)) return `BH-${digits}`
    return cleaned
  },

  effectiveStatus(order, now = Date.now()) {
    if (order.status === 'waiting_payment' && new Date(order.expiresAt).getTime() <= now) return 'expired'
    return order.status
  },

  findOrder(code) {
    const normalized = this.normalizeCode(code)
    return this.db.orders.find((o) => o.code === normalized)
  },

  advanceOrder(storeId, orderId, to, paymentMethod = 'cash') {
    const order = this.db.orders.find((o) => o.id === orderId && o.storeId === storeId)
    if (!order) throw new Error('We couldn’t find that order.')
    const current = this.effectiveStatus(order)
    const store = this.storeById(storeId)
    const now = new Date()
    const nowIso = now.toISOString()

    if (current === 'expired') {
      order.status = 'expired'
      this.save()
      throw new Error('This order has expired. Ask the customer to place a new one.')
    }

    if (to === 'preparing') {
      if (current !== 'waiting_payment') throw new Error('This order is already paid.')
      const paidToday = this.db.orders.filter((o) => o.storeId === storeId && o.paidAt && sameDay(new Date(o.paidAt), now))
      const ahead = this.db.orders.filter((o) => o.storeId === storeId && o.status === 'preparing').length
      const prep = store.prepMinutes || 10
      order.status = 'preparing'
      order.paidAt = nowIso
      order.paymentMethod = paymentMethod
      order.queueNumber = paidToday.length + 1
      order.estimatedReadyAt = new Date(now.getTime() + (prep + ahead * Math.ceil(prep / 2)) * 60000).toISOString()
    } else if (to === 'ready') {
      if (current !== 'preparing') throw new Error('Only preparing orders can be marked ready.')
      order.status = 'ready'
      order.readyAt = nowIso
    } else if (to === 'claimed') {
      if (current !== 'ready') throw new Error('Only ready orders can be claimed.')
      order.status = 'claimed'
      order.claimedAt = nowIso
      const loyalty = store.loyalty || {}
      if (loyalty.pointsEnabled) {
        const earned = order.items.reduce((s, i) => s + (i.points || 0) * i.quantity, 0)
        order.pointsEarned = earned
        if (earned > 0) {
          this.db.points.push({
            id: this.uid('pt'),
            customerId: order.customerId,
            storeId,
            type: 'earned',
            points: earned,
            description: `Order ${order.code}`,
          })
        }
      }
      if (loyalty.stampsEnabled) {
        const stamps = order.items.filter((i) => i.isDrink).reduce((s, i) => s + i.quantity, 0)
        order.stampsEarned = stamps
        if (stamps > 0) {
          this.db.stamps.push({
            id: this.uid('st'),
            customerId: order.customerId,
            storeId,
            type: 'earned',
            stamps,
            description: `Order ${order.code}`,
          })
        }
      }
    } else if (to === 'cancelled') {
      if (current !== 'waiting_payment') throw new Error('Paid orders can’t be cancelled here.')
      order.status = 'cancelled'
    }
    this.save()
    return order
  },

  pointsBalance(customerId, storeId) {
    return this.db.points
      .filter((p) => p.customerId === customerId && p.storeId === storeId)
      .reduce((sum, p) => sum + (p.type === 'earned' ? p.points : -p.points), 0)
  },

  stampsBalance(customerId, storeId) {
    return this.db.stamps
      .filter((s) => s.customerId === customerId && s.storeId === storeId)
      .reduce((sum, s) => sum + (s.type === 'earned' ? s.stamps : -s.stamps), 0)
  },

  setAccepting(storeId, value) {
    const store = this.storeById(storeId)
    if (store) {
      store.acceptingOrders = value
      this.save()
    }
  },

  setStoreStatus(storeId, status) {
    const store = this.storeById(storeId)
    if (!store) throw new Error('Shop not found.')
    if (!['pending', 'approved', 'suspended'].includes(status)) throw new Error('Invalid status.')
    store.status = status
    if (status !== 'approved') store.acceptingOrders = false
    this.save()
    return store
  },

  ownerName(ownerId) {
    return this.db.users.find((u) => u.id === ownerId)?.name || '—'
  },
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

window.BH = BH
