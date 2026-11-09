# Deploy BrewHub to GitHub Pages

Ikaw na may repo. Follow lang ni.

## 1. Push ang code

Ablihi ang terminal **diri sa folder** `BREWHUB PROJECTS`, then run:

```powershell
git init
git add .
git commit -m "Initial BrewHub site"
git branch -M main
git remote add origin https://github.com/IMONG-USERNAME/IMONG-REPO.git
git push -u origin main
```

Usba ang `IMONG-USERNAME/IMONG-REPO` sa imong real GitHub repo link.

### Kung naa na ang `.git` / na-link na ang remote

```powershell
git add .
git commit -m "Update BrewHub site"
git push
```

### Kung na-error ang `remote add` (kay naa na)

```powershell
git remote set-url origin https://github.com/IMONG-USERNAME/IMONG-REPO.git
git push -u origin main
```

## 2. I-on ang GitHub Pages

1. Adto sa imong repo sa GitHub
2. **Settings** → **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main**
5. Folder: **/ (root)**
6. **Save**

## 3. Ablihi ang site

Human og 1–2 minutes:

```
https://IMONG-USERNAME.github.io/IMONG-REPO/
```

## Note

- Browsing, login, order, QR: OK sa GitHub Pages
- Image upload (`server.js`): dili motrabaho sa GitHub Pages (kinahanglan lokal/server)
