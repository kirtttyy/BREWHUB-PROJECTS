window.BrewPages = window.BrewPages || {}

BrewPages.order = {
  title: 'Order ticket · BrewHub',
  timer: null,

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  async start() {
    if (!UI.requireUser(['customer'])) return
    this.render()
    this.timer = setInterval(() => this.render(), 5000)
  },

  render() {
    const order = BH.findOrder(UI.qs('code'))
    if (!order) {
      document.getElementById('app').innerHTML = `
        <header class="app-top"><div class="app-top-inner">${UI.brandHtml()}</div></header>
        <main class="page-pad"><div class="container-sm">
          <div class="card" style="padding:1.5rem;text-align:center"><p class="font-bold">Order not found</p><a class="btn btn-primary mt-3" href="#/orders">My orders</a></div>
        </div></main>
        ${UI.customerNav('orders')}`
      return
    }
    const status = BH.effectiveStatus(order)
    if (status === 'expired' && order.status !== 'expired') {
      order.status = 'expired'
      BH.save()
    }
    const store = BH.storeById(order.storeId)
    const hint = {
      waiting_payment: 'Show this QR code to the cashier to pay and confirm your order.',
      preparing: 'Paid! Your order is being prepared ☕',
      ready: 'Your order is ready! Please claim it at the counter.',
      claimed: 'Enjoy your coffee! Thanks for ordering with us.',
      cancelled: 'This order was cancelled.',
      expired: 'This QR has expired. You can order again anytime.',
    }[status]

    document.getElementById('app').innerHTML = `
      <header class="app-top"><div class="app-top-inner">${UI.brandHtml()}</div></header>
      <main class="page-pad"><div class="container-sm">
        <div class="text-center mb-3">
          <span class="status-pill status-${status}">${UI.statusLabel(status)}</span>
          <p class="muted text-sm mt-2">${hint}</p>
        </div>
        <div class="qr-box">
          <p class="text-sm muted" style="margin:0">${store.name}</p>
          <div class="code-big">${order.code}</div>
          ${
            ['waiting_payment', 'preparing', 'ready'].includes(status)
              ? `${UI.makeQr('BREWHUB:' + order.code, 220)}<p class="text-xs muted mt-2">Show this QR to the cashier to scan</p>`
              : ''
          }
          ${order.queueNumber ? `<p class="font-bold mt-2">Queue #${order.queueNumber}</p>` : ''}
          ${
            order.estimatedReadyAt && status === 'preparing'
              ? `<p class="text-sm muted">Ready around ${new Date(order.estimatedReadyAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</p>`
              : ''
          }
        </div>
        <div class="card" style="padding:1rem;margin-top:1rem">
          <p class="font-bold mb-2">Items</p>
          ${order.items
            .map(
              (i) => `
            <div class="flex-between text-sm" style="padding:.35rem 0">
              <span>${i.quantity}× ${i.name}${i.size ? ` (${i.size})` : ''}</span>
              <span>${UI.peso(i.price * i.quantity)}</span>
            </div>`
            )
            .join('')}
          <hr style="border:none;border-top:1px solid var(--border);margin:.75rem 0" />
          <div class="flex-between text-sm"><span class="muted">Subtotal</span><span>${UI.peso(order.subtotal)}</span></div>
          ${order.discount ? `<div class="flex-between text-sm"><span class="muted">${order.promoLabel || 'Discount'}</span><span style="color:#059669">−${UI.peso(order.discount)}</span></div>` : ''}
          <div class="flex-between font-bold mt-2"><span>Total</span><span>${UI.peso(order.total)}</span></div>
        </div>
        <a class="btn btn-outline w-full mt-3" href="#/orders">Back to my orders</a>
      </div></main>
      ${UI.customerNav('orders')}`
  },
}
