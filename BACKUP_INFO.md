# RIDEN — نسخة احتياطية شاملة
**تاريخ النسخة:** 2026-07-22  
**الحالة:** ✅ جميع الإشعارات تعمل — FCM success=1 مؤكد

---

## 📱 التطبيقات الثلاثة (Expo)

### 1. تطبيق الراكب
| المعلومة | القيمة |
|----------|--------|
| الاسم | RIDEN |
| الـ slug | `riden-passenger-app` |
| EAS Project ID | `e61ec069-a95a-4dca-b555-b0c68a3aca59` |
| Expo Owner | `farah_kh` |
| المسار | `artifacts/riden-passenger-app/` |
| قناة OTA | `preview` |

### 2. تطبيق الكابتن
| المعلومة | القيمة |
|----------|--------|
| الاسم | RIDEN - Captain |
| الـ slug | `riden-captain-app` |
| EAS Project ID | `40467eb7-0a19-4b65-9ea2-0e6be243882a` |
| Expo Owner | `farah_kh` |
| المسار | `artifacts/riden-captain-app/` |
| قناة OTA | `preview` |

### 3. تطبيق الإدارة
| المعلومة | القيمة |
|----------|--------|
| الاسم | RIDEN Admin |
| الـ slug | `riden-admin-app` |
| EAS Project ID | `2e22b273-69c7-434d-8f1b-8e29d4c85c16` |
| Expo Owner | `farah_kh` |
| المسار | `artifacts/riden-admin-app/` |
| قناة OTA | `preview` |

---

## 🖥️ API Server (Railway)

| المعلومة | القيمة |
|----------|--------|
| URL | `https://riden-api-production.up.railway.app` |
| GitHub Repo | `ahmad1352733-cpu/Riden-backend` |
| Railway Project | `e916e467-180d-4769-9843-c59ff9514273` |
| Railway Service | `3891db52-40c5-4414-a29f-f4ac0d19a57b` |
| Railway Env | `627e6143-e716-437f-a205-a4843cf17882` |
| Node Version | 20 (alpine) |
| Framework | Express + Drizzle ORM + PostgreSQL |
| Firebase Project | `riden2` |

### كيفية النشر على Railway
```bash
# 1. أبنِ الكود محلياً
pnpm --filter @workspace/api-server build

# 2. ادفع لـ GitHub
git add -A && git commit -m "your message" && git push origin main

# 3. أنشر من آخر commit (مهم: ليس serviceInstanceRedeploy)
# استخدم Railway GraphQL:
# mutation { serviceInstanceDeploy(serviceId: "...", environmentId: "...", latestCommit: true) }
```

---

## 🗄️ قاعدة البيانات

| المعلومة | القيمة |
|----------|--------|
| النوع | PostgreSQL (Railway) |
| المتغير | `DATABASE_URL` (في Railway env vars) |
| ORM | Drizzle ORM |
| Schema | `lib/db/src/schema/` |

### مستخدمون للاختبار (كلمة المرور: `test123`)
| ID | Email | الدور | Token |
|----|-------|-------|-------|
| 12 | nznsbsbsbsbs@hshshssh.com | راكب | ✅ موجود |
| 13 | bshsshshsh@snsbsbsba.com | كابتن (id=5) | ✅ موجود |

---

## 🔔 نظام الإشعارات (FCM)

| المعلومة | القيمة |
|----------|--------|
| Firebase Project | `riden2` |
| طريقة الإرسال | FCM v1 HTTP API + google-auth-library |
| قناة الرحلات | `trip-updates` (AndroidImportance.MAX) |
| قناة العامة | `general` (AndroidImportance.MAX) |
| قناة الطلبات | `trip-requests` (AndroidImportance.MAX) |

### Env Vars مطلوبة على Railway
```
FIREBASE_PROJECT_ID=riden2
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@riden2.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
SESSION_SECRET=...
DATABASE_URL=postgresql://...
NODE_ENV=production
PORT=8080
```

---

## 🏗️ هيكل المشروع

```
/
├── artifacts/
│   ├── api-server/          ← Express API (Railway)
│   │   ├── src/routes/      ← trips, auth, users, captains, ...
│   │   ├── src/lib/         ← push.ts (FCM), auth.ts, helpers.ts
│   │   └── Dockerfile       ← multi-stage: builds from TypeScript source
│   ├── riden-passenger-app/ ← Expo (React Native) — تطبيق الراكب
│   ├── riden-captain-app/   ← Expo (React Native) — تطبيق الكابتن
│   ├── riden-admin-app/     ← Expo (React Native) — تطبيق الإدارة
│   ├── riden-passenger/     ← React Web — واجهة الراكب
│   ├── riden-captain/       ← React Web — واجهة الكابتن
│   └── riden-admin/         ← React Web — لوحة الإدارة
├── lib/
│   ├── db/                  ← Drizzle schema + pool
│   ├── api-zod/             ← Zod schemas مشتركة
│   └── api-client-react/    ← React Query hooks
├── Dockerfile               ← Multi-stage build من source
├── .dockerignore
└── pnpm-workspace.yaml
```

---

## ✅ الميزات المنجزة

- [x] نظام تسجيل الدخول (JWT) — راكب / كابتن / إدارة
- [x] إنشاء رحلة + اختيار 3 كباتن أقرب تلقائياً
- [x] قبول الرحلة ذري (SELECT FOR UPDATE) — منع القبول المزدوج
- [x] إشعار الراكب بعد القبول باسم الكابتن
- [x] إشعار الكباتن الآخرين بأن الرحلة أُخذت
- [x] بدء الرحلة + إشعار الراكب
- [x] Structured Logging كامل (TRIP_ACCEPT_REQUEST → TRIP_STARTED_NOTIFICATION_SEND_SUCCESS)
- [x] FCM v1 HTTP API (google-auth-library)
- [x] OTA Updates للتطبيقات الثلاثة (Expo)
- [x] Railway auto-deploy من GitHub
