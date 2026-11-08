window.BrewPages = window.BrewPages || {}

BrewPages.cashierProducts = {
  title: 'Products · Cashier · BrewHub',
  user: null,
  STORE_KEY: 'brewhub-cashier-store',

  stop() {},

  parsePairs(raw) {
    return String(raw || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const i = part.lastIndexOf(':')
        if (i < 0) return [part, 0]
        return [part.slice(0, i).trim(), Number(part.slice(i + 1).trim()) || 0]
      })
      .filter(([name]) => name)
  },

  async start() {
    this.user = UI.requireUser(['store_owner'])
    if (!this.user) return
    this.render()
  },

  render() {
    const stores = BH.storesOfOwner(this.user.id)
    if (!stores.length) {
      document.getElementById('app').innerHTML = `<div class="cashier-layout">${UI.cashierSidebar('products')}<main class="cashier-main">
        <div class="cashier-top">
          <div>
            <h1 class="font-serif" style="margin:0;font-size:clamp(1.7rem,3vw,2.1rem)">Products</h1>
            <p class="muted text-sm" style="margin:.35rem 0 0">No shop is linked to this account yet.</p>
          </div>
        </div>
      </main></div>`
      document.getElementById('signOutBtn').onclick = () => {
        BH.signOut()
        location.href = 'index.html'
      }
      return
    }

    let storeId = UI.qs('store') || sessionStorage.getItem(this.STORE_KEY) || stores[0].id
    if (!stores.some((s) => s.id === storeId)) storeId = stores[0].id
    sessionStorage.setItem(this.STORE_KEY, storeId)
    const store = BH.storeById(storeId)
    const products = BH.productsOf(storeId).slice().sort((a, b) => a.name.localeCompare(b.name))

    document.getElementById('app').innerHTML = `<div class="cashier-layout">${UI.cashierSidebar('products')}<main class="cashier-main">
      <div class="cashier-top">
        <div>
          <h1 class="font-serif" style="margin:0;font-size:clamp(1.7rem,3vw,2.1rem)">Products</h1>
          <p class="muted text-sm" style="margin:.35rem 0 0">Add menu items for your shop. Saved under this store only.</p>
        </div>
      </div>
      ${
        stores.length > 1
          ? `<div class="field mb-4" style="max-width:22rem">
              <label for="storePick">Your shop</label>
              <select class="select" id="storePick">
                ${stores.map((s) => `<option value="${s.id}" ${s.id === storeId ? 'selected' : ''}>${s.name}${s.status !== 'approved' ? ` (${s.status})` : ''}</option>`).join('')}
              </select>
            </div>`
          : `<p class="text-sm muted mb-4">Shop: <strong>${store.name}</strong></p>`
      }
      <div class="admin-panel mb-4">
        <div class="admin-panel-head">
          <div>
            <div class="font-bold">Add product · ${store.name}</div>
            <div class="text-sm muted">Fill the required fields, then save. It goes only to this store’s menu.</div>
          </div>
        </div>
        <form id="addForm" class="stack" style="padding:1.15rem">
          <div class="flex gap-2" style="flex-wrap:wrap">
            <div class="field" style="flex:1;min-width:12rem">
              <label for="name">Product name *</label>
              <input class="input" id="name" required placeholder="e.g. Iced Latte" />
            </div>
            <div class="field" style="flex:1;min-width:10rem">
              <label for="price">Price (₱) *</label>
              <input class="input" id="price" type="number" min="0" step="1" required placeholder="150" />
            </div>
          </div>
          <div class="field">
            <label for="description">Description *</label>
            <textarea class="textarea" id="description" required placeholder="Short description customers will see"></textarea>
          </div>
          <div class="flex gap-2" style="flex-wrap:wrap">
            <div class="field" style="flex:1;min-width:12rem">
              <label for="category">Category *</label>
              <select class="select" id="category" required>
                ${store.categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="field" style="flex:1;min-width:10rem">
              <label for="points">Loyalty points</label>
              <input class="input" id="points" type="number" min="0" step="1" placeholder="Auto from price" />
            </div>
          </div>
          <div class="field">
            <label for="imageFile">Product image</label>
            <input class="input" id="imageFile" type="file" accept="image/*" />
            <p class="hint">Upload a photo (saved to images/products with node server, or local data fallback).</p>
          </div>
          <div class="field">
            <label for="sizes">Sizes (optional)</label>
            <input class="input" id="sizes" placeholder="Regular:0, Large:25" />
            <p class="hint">Format: Name:extraPrice, separated by commas. Example adds ₱25 for Large.</p>
          </div>
          <div class="field">
            <label for="addons">Add-ons (optional)</label>
            <input class="input" id="addons" placeholder="Extra shot:30, Oat milk:35" />
            <p class="hint">Format: Name:price, separated by commas.</p>
          </div>
          <label class="flex gap-2" style="align-items:center;font-weight:600">
            <input type="checkbox" id="available" checked /> Available on the menu
          </label>
          <div id="formError" class="error-box hidden"></div>
          <button class="btn btn-primary" type="submit">Add product to ${store.name}</button>
        </form>
      </div>
      <div class="admin-panel">
        <div class="admin-panel-head">
          <div>
            <div class="font-bold">Menu · ${store.name}</div>
            <div class="text-sm muted">${products.length} product${products.length === 1 ? '' : 's'} in this shop</div>
          </div>
        </div>
        ${
          products.length === 0
            ? `<p class="muted text-sm admin-empty">No products yet. Add your first item above.</p>`
            : products
                .map((p) => {
                  const cat = store.categories.find((c) => c.id === p.category)?.name || p.category
                  return `
                  <div class="admin-row" style="grid-template-columns:3.4rem 1fr auto;align-items:center">
                    <img class="admin-thumb" src="${BH.mediaUrl(p.image)}" alt="" />
                    <div>
                      <div class="font-bold">${p.name} · ${UI.peso(p.price)}</div>
                      <div class="text-sm muted">${cat}${p.sizes?.length ? ` · ${p.sizes.map((s) => s.name).join('/')}` : ''} · ${p.points || 0} pts</div>
                      <div class="text-xs muted">${p.description}</div>
                    </div>
                    <div class="admin-actions">
                      <button class="btn btn-outline btn-sm" data-toggle="${p.id}" data-on="${p.available ? '0' : '1'}">${p.available ? 'Hide' : 'Show'}</button>
                      <button class="btn btn-outline btn-sm" data-remove="${p.id}" style="color:var(--destructive)">Remove</button>
                      <span class="badge ${p.available ? 'badge-approved' : 'badge-suspended'}">${p.available ? 'Available' : 'Hidden'}</span>
                    </div>
                  </div>`
                })
                .join('')
        }
      </div>
    </main></div>`

    document.getElementById('signOutBtn').onclick = () => {
      BH.signOut()
      location.href = 'index.html'
    }

    const pick = document.getElementById('storePick')
    if (pick) {
      pick.onchange = () => {
        sessionStorage.setItem(this.STORE_KEY, pick.value)
        location.hash = `#/cashier/products?store=${encodeURIComponent(pick.value)}`
      }
    }

    document.getElementById('addForm').onsubmit = async (e) => {
      e.preventDefault()
      const error = document.getElementById('formError')
      const btn = e.target.querySelector('button[type=submit]')
      error.classList.add('hidden')
      btn.disabled = true
      try {
        const file = document.getElementById('imageFile').files[0]
        const image = file ? await BH.uploadImage(file, 'products') : ''
        BH.addProduct(this.user.id, storeId, {
          name: document.getElementById('name').value,
          description: document.getElementById('description').value,
          price: document.getElementById('price').value,
          category: document.getElementById('category').value,
          image,
          points: document.getElementById('points').value === '' ? undefined : document.getElementById('points').value,
          available: document.getElementById('available').checked,
          sizes: this.parsePairs(document.getElementById('sizes').value).map(([name, priceDelta]) => ({ name, priceDelta })),
          addOns: this.parsePairs(document.getElementById('addons').value).map(([name, price]) => ({ name, price })),
        })
        UI.toast(`Added to ${store.name}`)
        this.render()
      } catch (err) {
        error.textContent = err.message
        error.classList.remove('hidden')
        btn.disabled = false
      }
    }

    document.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.onclick = () => {
        try {
          BH.setProductAvailable(this.user.id, btn.dataset.toggle, btn.dataset.on === '1')
          UI.toast(btn.dataset.on === '1' ? 'Product is available.' : 'Product hidden from menu.')
          this.render()
        } catch (err) {
          UI.toast(err.message)
        }
      }
    })
    document.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.onclick = () => {
        if (!confirm('Remove this product from your shop menu?')) return
        try {
          BH.removeProduct(this.user.id, btn.dataset.remove)
          UI.toast('Product removed.')
          this.render()
        } catch (err) {
          UI.toast(err.message)
        }
      }
    })
  },
}
