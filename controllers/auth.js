/** Controller helpers for login / register pages. */
window.AuthController = {
  async login(phone, password) {
    const user = BH.signIn(phone, password)
    location.href = BH.homeFor(user)
    return user
  },

  async registerCustomer(form) {
    const user = BH.registerCustomer(form)
    location.href = BH.homeFor(user)
    return user
  },

  async registerStore(form) {
    const result = BH.registerStore(form)
    location.href = 'login.html?registered=store'
    return result
  },
}
