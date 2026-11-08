window.BrewPages = window.BrewPages || {}

BrewPages.me = {
  title: 'Me · BrewHub',

  stop() {},

  async start() {
    const user = UI.requireUser(['customer'])
    if (!user) return
    document.getElementById('app').innerHTML = `
      <header class="app-top"><div class="app-top-inner">${UI.brandHtml()}</div></header>
      <main class="page-pad"><div class="container-sm">
        <div class="card" style="padding:1.25rem;background:linear-gradient(135deg,var(--primary),#6b4423);color:white;border:0">
          <p class="text-sm" style="opacity:.85;margin:0">Signed in as</p>
          <h1 class="font-serif" style="margin:.2rem 0 .35rem;font-size:1.8rem">${user.name}</h1>
          <p class="text-sm" style="opacity:.85;margin:0">${user.phone || ''}${user.address ? ` · ${user.address}` : ''}</p>
        </div>
        <div class="card" style="padding:0;margin-top:1rem;overflow:hidden">
          <a href="#/orders" style="display:block;padding:1rem;border-bottom:1px solid var(--border)">My orders</a>
          <a href="#/stores" style="display:block;padding:1rem;border-bottom:1px solid var(--border)">Browse shops</a>
          <button id="out" style="display:block;width:100%;text-align:left;padding:1rem;border:0;background:transparent;color:var(--destructive);cursor:pointer;font-weight:700">Sign out</button>
        </div>
      </div></main>
      ${UI.customerNav('me')}`
    document.getElementById('out').onclick = () => {
      BH.signOut()
      location.href = 'index.html'
    }
  },
}
