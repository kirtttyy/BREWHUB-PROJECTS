window.BrewPages = window.BrewPages || {}

BrewPages.cashierScan = {
  title: 'Scan · BrewHub',
  user: null,
  current: null,
  scanner: null,
  lastScan: '',
  scanLock: false,

  async stop() {
    await this.stopCamera()
  },

  async start() {
    this.user = UI.requireUser(['store_owner'])
    if (!this.user) return
    this.current = null

    document.getElementById('app').innerHTML = `<div class="cashier-layout">${UI.cashierSidebar('scan')}
      <main class="cashier-main">
        <div class="cashier-top">
          <div>
            <h1 class="font-serif" style="margin:0;font-size:clamp(1.7rem,3vw,2.1rem)">Scan QR</h1>
            <p class="muted text-sm" style="margin:.35rem 0 0">Scan the customer’s order QR, or type the code.</p>
          </div>
        </div>
        <div class="scan-panel mb-4">
          <div class="scan-camera" id="reader"></div>
          <div class="flex gap-2 mt-3" style="flex-wrap:wrap">
            <button class="btn btn-primary" id="startCam" type="button">Start camera</button>
            <button class="btn btn-outline" id="stopCam" type="button">Stop camera</button>
          </div>
          <p class="text-xs muted mt-2" id="camHint">Allow camera access to scan the QR from the customer’s order screen.</p>
          <hr style="border:none;border-top:1px solid var(--border);margin:1.1rem 0" />
          <div class="field">
            <label for="code">Order code</label>
            <input class="input" id="code" placeholder="BH-4821 or BREWHUB:BH-4821" autocomplete="off" />
          </div>
          <div class="flex gap-2 mt-3">
            <button class="btn btn-primary" id="lookup" type="button">Find order</button>
            <button class="btn btn-outline" id="clear" type="button">Clear</button>
          </div>
        </div>
        <div id="result"></div>
      </main>
    </div>`

    document.getElementById('signOutBtn').onclick = async () => {
      await this.stopCamera()
      BH.signOut()
      location.href = 'index.html'
    }
    document.getElementById('startCam').innerHTML = `${UI.svg('scan')} Start camera`
    document.getElementById('startCam').onclick = () => this.startCamera()
    document.getElementById('stopCam').onclick = () => this.stopCamera()
    document.getElementById('lookup').onclick = () => this.lookup(document.getElementById('code').value)
    document.getElementById('clear').onclick = () => {
      document.getElementById('code').value = ''
      document.getElementById('result').innerHTML = ''
      this.current = null
    }
    document.getElementById('code').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.lookup(document.getElementById('code').value)
    })

    const preset = UI.qs('code')
    if (preset) {
      document.getElementById('code').value = preset
      this.lookup(preset)
    } else {
      this.startCamera()
    }
  },

  async startCamera() {
    const hint = document.getElementById('camHint')
    if (!window.Html5Qrcode) {
      hint.textContent = 'Scanner library didn’t load. Use the order code box below.'
      return
    }
    try {
      await this.stopCamera()
      this.scanner = new Html5Qrcode('reader')
      await this.scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => this.onScanSuccess(decoded),
        () => {}
      )
      hint.textContent = 'Point the camera at the customer’s order QR.'
    } catch (_) {
      hint.textContent = 'Camera unavailable. Type the order code instead (e.g. BH-4821).'
      UI.toast('Couldn’t open the camera. You can still type the code.')
    }
  },

  async stopCamera() {
    if (!this.scanner) return
    try {
      await this.scanner.stop()
    } catch (_) {}
    try {
      await this.scanner.clear()
    } catch (_) {}
    this.scanner = null
  },

  async onScanSuccess(decoded) {
    const code = String(decoded || '').trim()
    if (!code || this.scanLock) return
    if (code === this.lastScan) return
    this.lastScan = code
    this.scanLock = true
    document.getElementById('code').value = code
    this.lookup(code)
    UI.toast('QR scanned')
    setTimeout(() => {
      this.scanLock = false
    }, 1500)
  },

  lookup(raw) {
    const order = BH.findOrder(raw)
    if (!order) {
      document.getElementById('result').innerHTML = `<div class="order-panel error-box">We couldn’t find that order code.</div>`
      return
    }
    if (!BH.ownsStore(this.user.id, order.storeId)) {
      document.getElementById('result').innerHTML = `<div class="order-panel error-box">That order belongs to another shop.</div>`
      return
    }
    this.current = order
    this.drawOrder()
  },

  drawOrder() {
    const order = BH.db.orders.find((o) => o.id === this.current.id)
    if (!order) return
    const status = BH.effectiveStatus(order)
    const shop = BH.storeById(order.storeId)

    document.getElementById('result').innerHTML = `
      <div class="order-panel">
        <div class="flex-between mb-3">
          <div>
            <div class="code-big" style="font-size:1.4rem;margin:0">${order.code}</div>
            <div class="text-sm muted">${order.customerName} · ${shop?.name || 'Shop'}</div>
          </div>
          <span class="status-pill status-${status}">${UI.statusLabel(status)}</span>
        </div>
        ${order.queueNumber ? `<p class="badge badge-soft mb-2">Queue #${order.queueNumber}</p>` : ''}
        ${order.items
          .map(
            (i) => `
          <div class="flex-between text-sm" style="padding:.35rem 0;border-bottom:1px solid var(--border)">
            <span>${i.quantity}× ${i.name}${i.size ? ` · ${i.size}` : ''}${i.addOns?.length ? ` · ${i.addOns.join(', ')}` : ''}</span>
            <span>${UI.peso(i.price * i.quantity)}</span>
          </div>`
          )
          .join('')}
        <div class="flex-between font-bold mt-3"><span>Total due</span><span>${UI.peso(order.total)}</span></div>
        ${order.discount ? `<p class="text-xs muted">Includes ${UI.peso(order.discount)} discount (${order.promoLabel || 'promo'})</p>` : ''}
        <div class="flex gap-2 mt-4" style="flex-wrap:wrap">
          ${
            status === 'waiting_payment'
              ? `<button class="btn btn-primary" data-to="preparing" data-pay="cash">Mark paid · Cash</button>
                 <button class="btn btn-outline" data-to="preparing" data-pay="gcash">Mark paid · GCash</button>
                 <button class="btn btn-ghost" data-to="cancelled" style="color:var(--destructive)">Cancel</button>`
              : ''
          }
          ${status === 'preparing' ? `<button class="btn btn-primary" data-to="ready">Mark ready</button>` : ''}
          ${status === 'ready' ? `<button class="btn btn-primary" data-to="claimed">Mark claimed</button>` : ''}
        </div>
      </div>`

    document.querySelectorAll('#result [data-to]').forEach((b) =>
      b.addEventListener('click', () => {
        try {
          BH.advanceOrder(order.storeId, order.id, b.dataset.to, b.dataset.pay || 'cash')
          UI.toast(
            b.dataset.to === 'preparing'
              ? 'Paid! Order is preparing.'
              : b.dataset.to === 'ready'
                ? 'Order is ready.'
                : b.dataset.to === 'claimed'
                  ? 'Order claimed.'
                  : 'Order cancelled.'
          )
          this.drawOrder()
        } catch (err) {
          UI.toast(err.message)
          this.drawOrder()
        }
      })
    )
  },
}
