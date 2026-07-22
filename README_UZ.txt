BUVAYDA IBRAT MEBEL — PROFESSIONAL SAYT

FAYLLAR
- index.html — mijozlar ko‘radigan sayt
- admin.html — admin panel
- styles.css — barcha dizayn
- firebase-config.js — Firebase ulanishi
- app.js — katalog va buyurtma funksiyalari
- admin.js — admin mahsulot boshqaruvi
- firestore.rules — Firestore xavfsizlik qoidalari
- logo.png — logotipni shu nomda qo‘shing

1. GITHUB
Barcha fayllarni repository root qismiga yuklang. Hech qanday css yoki js papkasi kerak emas.

2. FIREBASE AUTHENTICATION
Firebase Console → Authentication → Sign-in method → Email/Password → Enable.
Users bo‘limida admin email va parolini yarating.

3. FIRESTORE
Firebase Console → Firestore Database → Rules.
firestore.rules ichidagi kodni joylashtiring va Publish bosing.

4. AUTHORIZED DOMAINS
Firebase Console → Authentication → Settings → Authorized domains.
Cloudflare domenini qo‘shing, masalan:
buvayda-ibrat-mebel.pages.dev

5. ADMIN
https://SIZNING-DOMENINGIZ/admin.html

6. CLOUDFLARE PAGES
Framework preset: None
Build command: bo‘sh
Build output directory: .
Root directory: bo‘sh

ESLATMA
Firebase web API key brauzer ilovasida ko‘rinishi normal. Xavfsizlikni Authentication va Firestore Rules ta’minlaydi.
