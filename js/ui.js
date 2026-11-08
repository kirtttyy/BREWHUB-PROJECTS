const UI = {
  peso(n) {
    return `₱${Number(n || 0).toLocaleString('en-PH')}`
  },

  time12(hhmm) {
    const [h, m] = String(hhmm || '00:00').split(':').map(Number)
    const suffix = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 === 0 ? 12 : h % 12
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
  },

  toast(message) {
    let wrap = document.querySelector('.toast-wrap')
    if (!wrap) {
      wrap = document.createElement('div')
      wrap.className = 'toast-wrap'
      document.body.appendChild(wrap)
    }
    const el = document.createElement('div')
    el.className = 'toast'
    el.textContent = message
    wrap.appendChild(el)
    setTimeout(() => el.remove(), 2800)
  },

  qs(name) {
    return new URLSearchParams(location.search).get(name)
  },

  requireUser(roles) {
    const user = BH.sessionUser()
    if (!user) {
      location.href = BH.path('login.html')
      return null
    }
    if (roles && !roles.includes(user.role)) {
      location.href = BH.homeFor(user)
      return null
    }
    return user
  },

  guestOnly() {
    const user = BH.sessionUser()
    if (user) location.href = BH.homeFor(user)
  },

  svg(name) {
    const icons = {
      coffee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>',
      store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>',
      bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
      qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>',
      wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>',
      user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" x2="17" y1="12" y2="12"/></svg>',
      list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>',
      settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
      star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.9L22 10l-5 4.6L18.2 22 12 18.3 5.8 22 7 14.6 2 10l7.1-1.1L12 2z"/></svg>',
      pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
      clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    }
    return icons[name] || ''
  },

  brandHtml() {
    return `<a class="brand" href="${BH.path('index.html')}"><span class="brand-mark">${this.svg('coffee')}</span>BrewHub</a>`
  },

  customerNav(active) {
    const links = [
      { id: 'stores', href: 'customer/stores.html', icon: 'store', label: 'Shops' },
      { id: 'cart', href: 'customer/cart.html', icon: 'bag', label: 'Tray' },
      { id: 'orders', href: 'customer/orders.html', icon: 'list', label: 'Orders' },
      { id: 'me', href: 'customer/me.html', icon: 'user', label: 'Me' },
    ]
    return `<nav class="bottom-nav" aria-label="Main"><div class="dock">${links
      .map(
        (l) =>
          `<a class="dock-item ${active === l.id ? 'active' : ''}" href="${BH.path(l.href)}"><span class="dock-icon">${this.svg(l.icon)}</span><span class="dock-label">${l.label}</span></a>`
      )
      .join('')}</div></nav>`
  },

  shellSidebar({ homeHref, role, active, links }) {
    return `
      <aside class="sidebar">
        <div class="sidebar-top">
          <a class="sidebar-brand" href="${BH.path(homeHref)}">
            <span class="brand-mark">${this.svg('coffee')}</span>
            <span>
              <strong>BrewHub</strong>
              <small>${role}</small>
            </span>
          </a>
          <nav class="sidebar-nav">
            ${links
              .map(
                (l) =>
                  `<a class="sidebar-link ${active === l.id ? 'active' : ''}" href="${BH.path(l.href)}"><span class="sidebar-ico">${this.svg(l.icon)}</span><span>${l.label}</span></a>`
              )
              .join('')}
          </nav>
        </div>
        <div class="sidebar-foot">
          <button class="btn btn-outline w-full sidebar-out" id="signOutBtn" type="button">Sign out</button>
        </div>
      </aside>
      <nav class="shell-mobile-nav" aria-label="Admin">
        ${links
          .map(
            (l) =>
              `<a class="${active === l.id ? 'active' : ''}" href="${BH.path(l.href)}">${this.svg(l.icon)}<span>${l.label}</span></a>`
          )
          .join('')}
      </nav>`
  },

  cashierSidebar(active) {
    return this.shellSidebar({
      homeHref: 'cashier/index.html',
      role: 'Cashier',
      active,
      links: [
        { id: 'home', href: 'cashier/index.html', icon: 'home', label: 'Dashboard' },
        { id: 'scan', href: 'cashier/scan.html', icon: 'scan', label: 'Scan' },
        { id: 'orders', href: 'cashier/orders.html', icon: 'list', label: 'Orders' },
        { id: 'settings', href: 'cashier/settings.html', icon: 'settings', label: 'Settings' },
      ],
    })
  },

  adminSidebar(active) {
    return this.shellSidebar({
      homeHref: 'admin/index.html',
      role: 'Admin',
      active,
      links: [
        { id: 'home', href: 'admin/index.html', icon: 'home', label: 'Overview' },
        { id: 'shops', href: 'admin/shops.html', icon: 'store', label: 'Shops' },
        { id: 'users', href: 'admin/users.html', icon: 'user', label: 'Users' },
      ],
    })
  },

  statusLabel(status) {
    return (
      {
        waiting_payment: 'Waiting for payment',
        preparing: 'Preparing',
        ready: 'Ready to claim',
        claimed: 'Completed',
        cancelled: 'Cancelled',
        expired: 'Expired',
      }[status] || status
    )
  },

  makeQr(text, size = 180) {
    // Lightweight QR via external API image (works offline-free with Live Server + internet)
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`
    return `<img src="${url}" width="${size}" height="${size}" alt="Order QR code" />`
  },
}

window.UI = UI
