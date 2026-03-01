USER TYPES URL
┌─────────────────────────────────────────────────────────────────┐
│  http://localhost:3000/                                         │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼
MIDDLEWARE (Edge)
┌─────────────────────────────────────────────────────────────────┐
│ middleware.ts                                                    │
│  - pathname = "/"                                                │
│  - if no "/{locale}" prefix:                                     │
│      pickLocale() = cookie "locale" OR Accept-Language OR default│
│      redirect → "/de" (example)                                  │
└─────────────────────────────────────────────────────────────────┘
                │ 302 redirect
                ▼
REQUEST NOW HAS LOCALE IN PATH
┌─────────────────────────────────────────────────────────────────┐
│  http://localhost:3000/de                                        │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼
NEXT.JS ROUTING (App Router)
┌─────────────────────────────────────────────────────────────────┐
│ Matches: app/[locale]/...                                        │
│ params.locale = "de"                                             │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼
next-intl REQUEST CONFIG
┌─────────────────────────────────────────────────────────────────┐
│ i18n/request.ts                                                  │
│  - reads requestLocale (= "de")                                  │
│  - validates it (en|de|fr|it)                                    │
│  - loads messages: messages/de.json                              │
│  - makes them available to next-intl server helpers              │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼
LOCALE LAYOUT PROVIDES TRANSLATIONS TO CLIENT TREE
┌─────────────────────────────────────────────────────────────────┐
│ app/[locale]/layout.tsx                                          │
│  - setRequestLocale("de")                                        │
│  - const messages = await getMessages()  // from next-intl        │
│  - <NextIntlClientProvider locale="de" messages={messages}>       │
│      <AuthProvider>                                              │
│        <CartProvider>                                            │
│          <AppHeaderShell />                                      │
│          ...children...                                          │
│        </CartProvider>                                           │
│      </AuthProvider>                                             │
│    </NextIntlClientProvider>                                     │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼
SERVER COMPONENT FETCHES DATA (NOT TRANSLATIONS)
┌─────────────────────────────────────────────────────────────────┐
│ AppHeaderShell (server)                                          │
│  - fetchCategoryOptions(), fetchStoreOptions()                    │
│  - returns <AppHeader categories=... stores=... />                │
│                                                                  │
│ Note: It does NOT translate UI text. It only fetches data.        │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼
CLIENT COMPONENT USES MESSAGES VIA HOOK
┌─────────────────────────────────────────────────────────────────┐
│ AppHeader (client)                                               │
│  - const tHeader = useTranslations("header")                      │
│  - const locale = useLocale()  // reads current URL segment "de"  │
│                                                                  │
│  - Logo link: <Link href={`/${locale}`}>                          │
│                                                                  │
│  - UI strings come from messages/de.json:                         │
│      tHeader("title")        → "Luigi's Bike Rentals"             │
│      tHeader("subtitle")     → "Bern, Zürich, Genf"               │
│      tHeader("openNavMenu")  → "Navigationsmenü öffnen"           │
│      tHeader("noStoresConfigured") → "Noch keine Stores..."       │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼
LANGUAGE SWITCHER CHANGES URL (AND COOKIE)
┌─────────────────────────────────────────────────────────────────┐
│ LocaleSwitcher (client)                                          │
│  - pathname: "/de/products/123"                                  │
│  - user picks "FR"                                               │
│  - replaces locale segment: "/fr/products/123"                   │
│  - sets cookie: locale=fr                                        │
│  - router.push("/fr/products/123")                               │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼
RENDER AGAIN WITH NEW LOCALE
┌─────────────────────────────────────────────────────────────────┐
│ Now params.locale="fr" → messages/fr.json loaded → AppHeader      │
│ displays French strings instantly (same component, new messages). │
└─────────────────────────────────────────────────────────────────┘