const DB_KEY = 'brewhub-html-db'
const SEED_KEY = 'brewhub-html-seed'
const SESSION_KEY = 'brewhub-html-session'
const ORDER_TTL_MS = 30 * 60 * 1000

const BH = {
  db: null,
  seed: null,

  async init() {
    // Prefer fresh models/db.json so admin credentials stay correct after updates.
    const fetched = await this.fetchSeed()
    const cachedSeed = this.readJson(SEED_KEY)
    const saved = this.readJson(DB_KEY)
    this.seed = fetched || cachedSeed || saved
    if (!this.seed) {
      throw new Error('Could not load BrewHub data. Open the app once while online, then it will work offline.')
    }
    if (fetched && (!cachedSeed || (fetched.version || 0) >= (cachedSeed.version || 0))) {
      localStorage.setItem(SEED_KEY, JSON.stringify(fetched))
      this.seed = fetched
    } else {
      localStorage.setItem(SEED_KEY, JSON.stringify(this.seed))
    }

    if (saved && saved.version === this.seed.version) {
      this.db = saved
    } else {
      this.db = structuredClone(this.seed)
    }
    this.ensureSeedAdmin()
    this.save()
    return this.db
  },

  ensureSeedAdmin() {
    const seedAdmin = (this.seed?.users || []).find((u) => u.role === 'admin')
    if (!seedAdmin) return
    let admin = this.db.users.find((u) => u.role === 'admin' || u.id === seedAdmin.id)
    if (!admin) {
      this.db.users.unshift(structuredClone(seedAdmin))
      return
    }
    admin.name = seedAdmin.name
    admin.email = seedAdmin.email
    admin.password = seedAdmin.password
    admin.phone = seedAdmin.phone
    admin.role = 'admin'
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

  depthPrefix() {
    const p = location.pathname.replace(/\\/g, '/')
    const nested = p.includes('/customer/') || p.includes('/cashier/') || p.includes('/admin/')
    return nested ? '../' : ''
  },

  dataUrl() {
    return `${this.depthPrefix()}models/db.json`
  },

  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.db))
  },

  apiUrl(pathname) {
    return pathname
  },

  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Could not read that image.'))
      reader.readAsDataURL(file)
    })
  },

  async uploadImage(file, folder = 'products') {
    if (!file) return ''
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
    if (file.size > 2.5 * 1024 * 1024) throw new Error('Image must be under 2.5MB.')
    const dataUrl = await this.fileToDataUrl(file)
    try {
      const res = await fetch(this.apiUrl('/api/upload'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder,
          name: file.name,
          dataUrl,
        }),
      })
      const data = await res.json()
      if (res.ok && data?.ok && data.path) return data.path
    } catch (_) {}
    // Fallback when Live Server has no upload API: store image in local DB as data URL.
    return dataUrl
  },

  mediaUrl(src) {
    if (!src) return ''
    if (/^https?:\/\//i.test(src) || src.startsWith('data:')) return src
    return `${this.depthPrefix()}${src.replace(/^\//, '')}`
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
    let digits = String(phone || '').replace(/\D/g, '')
    // Accept +63XXXXXXXXXX → 0XXXXXXXXXX
    if (digits.startsWith('63') && digits.length === 12) digits = `0${digits.slice(2)}`
    return digits
  },

  formatPhone(phone) {
    const digits = this.normalizePhone(phone)
    if (digits.length === 11 && digits.startsWith('09')) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
    }
    return String(phone || '').trim()
  },

  isValidPhMobile(phone) {
    const digits = this.normalizePhone(phone)
    return /^09\d{9}$/.test(digits)
  },

  signIn(phone, password) {
    const digits = this.normalizePhone(phone)
    if (!this.isValidPhMobile(digits)) throw new Error('Enter a valid PH mobile number (09XXXXXXXXX).')
    const user = this.db.users.find((u) => this.normalizePhone(u.phone) === digits)
    if (!user || user.password !== password) throw new Error('That phone number and password combination doesn’t match our records.')
    sessionStorage.setItem(SESSION_KEY, user.id)
    localStorage.setItem(SESSION_KEY, user.id)
    return user
  },

  assertUniquePhone(phoneNum, exceptId = null) {
    if (!this.isValidPhMobile(phoneNum)) {
      throw new Error('Enter a valid PH mobile number (11 digits, starts with 09).')
    }
    const digits = this.normalizePhone(phoneNum)
    if (this.db.users.some((u) => u.id !== exceptId && this.normalizePhone(u.phone) === digits)) {
      throw new Error('That phone number is already registered. Try signing in instead.')
    }
  },

  registerCustomer({ firstName, lastName, address, phone, email, password }) {
    const first = String(firstName || '').trim()
    const last = String(lastName || '').trim()
    const live = String(address || '').trim()
    const phoneNum = this.formatPhone(phone)
    const mail = String(email || '').trim().toLowerCase()
    const pass = String(password || '')

    if (!first || !last) throw new Error('Please enter your first and last name.')
    if (!live) throw new Error('Please tell us where you live.')
    this.assertUniquePhone(phoneNum)
    if (pass.length < 6) throw new Error('Password should be at least 6 characters.')
    if (mail && this.db.users.some((u) => (u.email || '').toLowerCase() === mail)) {
      throw new Error('That email is already registered. Try signing in instead.')
    }

    const user = {
      id: this.uid('u'),
      name: `${first} ${last}`,
      firstName: first,
      lastName: last,
      address: live,
      phone: phoneNum,
      email: mail || '',
      password: pass,
      role: 'customer',
    }
    this.db.users.push(user)
    this.save()
    sessionStorage.setItem(SESSION_KEY, user.id)
    localStorage.setItem(SESSION_KEY, user.id)
    return user
  },

  registerStore({
    firstName,
    lastName,
    phone,
    email,
    password,
    storeName,
    address,
    area,
    description,
    openTime,
    closeTime,
    image,
  }) {
    const first = String(firstName || '').trim()
    const last = String(lastName || '').trim()
    const phoneNum = this.formatPhone(phone)
    const mail = String(email || '').trim().toLowerCase()
    const pass = String(password || '')
    const name = String(storeName || '').trim()
    const street = String(address || '').trim()
    const zone = String(area || '').trim() || street
    const about = String(description || '').trim()
    const open = String(openTime || '07:00')
    const close = String(closeTime || '21:00')
    const cover = String(image || '').trim()

    if (!first || !last) throw new Error('Please enter the owner first and last name.')
    this.assertUniquePhone(phoneNum)
    if (pass.length < 6) throw new Error('Password should be at least 6 characters.')
    if (!name) throw new Error('Shop name is required.')
    if (!street) throw new Error('Shop address is required.')
    if (!about) throw new Error('Shop description is required.')
    if (mail && this.db.users.some((u) => (u.email || '').toLowerCase() === mail)) {
      throw new Error('That email is already registered. Try signing in instead.')
    }

    const ownerId = this.uid('u')
    const storeId = this.uid('s')
    const user = {
      id: ownerId,
      name: `${first} ${last}`,
      firstName: first,
      lastName: last,
      phone: phoneNum,
      email: mail || '',
      password: pass,
      role: 'store_owner',
    }
    const store = {
      id: storeId,
      ownerId,
      name,
      description: about,
      address: street,
      area: zone,
      image: cover || '',
      openTime: open,
      closeTime: close,
      rating: 0,
      status: 'pending',
      acceptingOrders: false,
      prepMinutes: 10,
      categories: [
        { id: 'hot-coffee', name: 'Hot Coffee', isDrink: true },
        { id: 'iced-coffee', name: 'Iced Coffee', isDrink: true },
        { id: 'non-coffee', name: 'Non-Coffee', isDrink: true },
        { id: 'pastry', name: 'Pastries', isDrink: false },
      ],
      loyalty: {
        pointsEnabled: true,
        stampsEnabled: false,
        stampsRequired: 9,
        stampRewardLabel: 'Free drink of your choice',
        stampRewardMaxValue: 180,
      },
    }

    this.db.users.push(user)
    this.db.stores.push(store)
    this.save()
    // Store/cashier must sign in after register (not auto-login).
    return { user, store }
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
    const nested = p.includes('/customer/') || p.includes('/cashier/') || p.includes('/admin/')
    if (nested) return '../' + rel
    return rel
  },

  asset(rel) {
    return `${this.depthPrefix()}${String(rel || '').replace(/^\//, '')}`
  },

  approvedStores() {
    return this.db.stores.filter((s) => s.status === 'approved')
  },

  storeById(id) {
    return this.db.stores.find((s) => s.id === id)
  },

  storeOfOwner(ownerId) {
    return this.db.stores.find((s) => s.ownerId === ownerId) || null
  },

  storesOfOwner(ownerId) {
    // Rule: 1 store owner account = 1 store.
    const one = this.storeOfOwner(ownerId)
    return one ? [one] : []
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
      if (!store?.acceptingOrders || store.status !== 'approved') throw new Error(`${store?.name || 'This shop'} isn’t taking orders right now.`)
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
      if (store.status !== 'approved') throw new Error('Only approved shops can open for orders.')
      store.acceptingOrders = value
      this.save()
    }
  },

  addProduct(ownerId, storeId, input) {
    if (!this.ownsStore(ownerId, storeId)) throw new Error('You can only add products to your own shop.')
    const store = this.storeById(storeId)
    if (!store) throw new Error('Shop not found.')

    const name = String(input.name || '').trim()
    const description = String(input.description || '').trim()
    const image = String(input.image || '').trim()
    const category = String(input.category || '').trim()
    const price = Number(input.price)
    const points = Number(input.points ?? Math.max(1, Math.round(price / 10)))
    const available = input.available !== false

    if (!name) throw new Error('Product name is required.')
    if (!description) throw new Error('Description is required.')
    if (!Number.isFinite(price) || price < 0) throw new Error('Enter a valid price.')
    if (!store.categories?.some((c) => c.id === category)) throw new Error('Choose a category from your shop.')

    const sizes = Array.isArray(input.sizes)
      ? input.sizes
          .filter((s) => s && String(s.name || '').trim())
          .map((s) => ({ name: String(s.name).trim(), priceDelta: Number(s.priceDelta) || 0 }))
      : []
    const addOns = Array.isArray(input.addOns)
      ? input.addOns
          .filter((a) => a && String(a.name || '').trim())
          .map((a) => ({ name: String(a.name).trim(), price: Number(a.price) || 0 }))
      : []

    const product = {
      id: this.uid(`${storeId}-p`),
      storeId,
      name,
      description,
      price,
      category,
      image: image || '',
      available,
      sizes,
      addOns,
      points: Number.isFinite(points) && points >= 0 ? Math.round(points) : 0,
    }
    this.db.products.push(product)
    this.save()
    return product
  },

  setProductAvailable(ownerId, productId, available) {
    const product = this.db.products.find((p) => p.id === productId)
    if (!product) throw new Error('Product not found.')
    if (!this.ownsStore(ownerId, product.storeId)) throw new Error('You can only edit products in your own shop.')
    product.available = !!available
    this.save()
    return product
  },

  removeProduct(ownerId, productId) {
    const product = this.db.products.find((p) => p.id === productId)
    if (!product) throw new Error('Product not found.')
    if (!this.ownsStore(ownerId, product.storeId)) throw new Error('You can only remove products from your own shop.')
    this.db.products = this.db.products.filter((p) => p.id !== productId)
    this.save()
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
