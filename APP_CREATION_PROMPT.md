# Komplexní Prompt pro Vytvoření Aplikace "Svobodné cechy"

## PŘEHLED PROJEKTU

Vytvoř React Native mobilní aplikaci "Svobodné cechy" - platformu pro vzdělávání řemeslníků a spojení učedníků (věk 14-18 let) s mistři. Aplikace má role-based přístup (Apprentice, Master, Admin, Guest) a používá Supabase PostgreSQL jako cloud databázi. Design inspirován TikTokem/Instagramem s moderním iOS liquid glass designem.

**CRITICAL REQUIREMENTS:**
1. Master's interface MUSÍ být identické apprentice's rozhraní - když mistr vybere učedníka, vidí jeho data se STEJNÝM UI
2. Mistři mohou MANUÁLNĚ aktivovat/deaktivovat certifikáty kliknutím na tlačítko
3. ŽÁDNÉ EMOJIS - pouze ikony z @expo/vector-icons (Feather, MaterialCommunityIcons)
4. Veškerá data se ukládají do Supabase (cloud-first, bez localStorage mimo session)

---

## TECHNOLOGICKÝ STACK

### Framework & Runtime
- **Expo SDK 54.0.23** - Cross-platform development
- **React 19.1.0 + React Native 0.81.5** - UI framework
- **React Navigation 7.x** - Tab a stack navigation
- **TypeScript 5.x** - Type safety

### UI & Animations
- **React Native Reanimated 4.1.1** - High-performance animations
- **React Native Gesture Handler 2.28.0** - Swipe & touch gestures
- **Expo Linear Gradient 15.0.7** - Gradient backgrounds
- **Expo Blur 15.0.7** - Blur effects na headerech
- **@expo/vector-icons 15.0.2** - Feather ikony (primary)
- **MaterialCommunityIcons** - Pro speciální ikony (srdíčka, atd.)

### Storage & Backend
- **Supabase (@supabase/supabase-js)** - PostgreSQL cloud databáze + real-time
- **@react-native-async-storage/async-storage** - Local session storage

### Device Features
- **expo-image-picker 17.0.8** - Fotos od kamery/galerie
- **expo-haptics 15.0.7** - Haptic feedback

### Development
- **ESLint + Prettier** - Code quality
- **Babel Module Resolver** - Path aliasing (@/ imports)

---

## DATABASE SCHEMA (Supabase PostgreSQL)

### Tabulka: users
```sql
id: UUID (PRIMARY KEY)
email: VARCHAR (UNIQUE)
name: VARCHAR
role: ENUM ('Apprentice', 'Master', 'Admin', 'Guest')
password_hash: VARCHAR
avatar_url: TEXT (nullable)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### Tabulka: projects
```sql
id: UUID (PRIMARY KEY)
user_id: UUID (FOREIGN KEY → users)
title: VARCHAR
description: TEXT
category: VARCHAR ('Dřevářství', 'Kovářství', 'Kuchařství', 'Stavebnictví', 'Další')
image: TEXT (nullable)
photos: INTEGER (počet fotek)
is_liked: BOOLEAN (default false)
master_comment: TEXT (nullable)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### Tabulka: work_hours
```sql
id: UUID (PRIMARY KEY)
user_id: UUID (FOREIGN KEY → users)
project_id: UUID (FOREIGN KEY → projects, nullable)
hours: DECIMAL(5,2)
description: VARCHAR ('Práce' | 'Studium')
created_at: TIMESTAMP
```

### Tabulka: certificates
```sql
id: UUID (PRIMARY KEY)
user_id: UUID (FOREIGN KEY → users)
title: VARCHAR
category: VARCHAR ('Badge' | 'Certificate')
points: INTEGER
locked: BOOLEAN (default true)
requirement: VARCHAR
earned_at: TIMESTAMP (nullable)
created_at: TIMESTAMP
```

### Tabulka: certificate_templates
```sql
id: UUID (PRIMARY KEY)
title: VARCHAR
category: VARCHAR ('Badge' | 'Certificate')
points: INTEGER
description: TEXT (nullable)
created_at: TIMESTAMP
```

### Tabulka: certificate_unlock_rules
```sql
id: UUID (PRIMARY KEY)
template_id: UUID (FOREIGN KEY → certificate_templates)
rule_type: ENUM ('AUTO', 'MANUAL')
condition_type: VARCHAR ('WORK_HOURS', 'PROJECTS') - pro AUTO rules
condition_value: INTEGER - pro AUTO rules
created_at: TIMESTAMP
```

### Tabulka: master_apprentices
```sql
id: UUID (PRIMARY KEY)
master_id: UUID (FOREIGN KEY → users)
apprentice_id: UUID (FOREIGN KEY → users)
apprentice_name: VARCHAR
created_at: TIMESTAMP
```

### Tabulka: tasks
```sql
id: UUID (PRIMARY KEY)
apprentice_id: UUID (FOREIGN KEY → users)
master_id: UUID (FOREIGN KEY → users)
project_id: UUID (FOREIGN KEY → projects, nullable)
title: VARCHAR
description: TEXT (nullable)
due_date: TIMESTAMP (nullable)
completed: BOOLEAN (default false)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### Tabulka: comments
```sql
id: UUID (PRIMARY KEY)
project_id: UUID (FOREIGN KEY → projects)
user_id: UUID (FOREIGN KEY → users)
text: TEXT
created_at: TIMESTAMP
```

---

## NAVIGAČNÍ STRUKTURA

### Root Navigation (Stack)
- **AuthNavigator** (pokud NOT logged in)
  - LoginScreen
  - RegisterScreen
  - ForgotPasswordScreen

- **Main Tabs Navigation** (pokud logged in) - s role-based routing
  - **APPRENTICE TABS:**
    - DashboardScreen (úkol tab home)
    - ProjectsScreen (všechny projekty)
    - HoursScreen (zaznamenané hodiny)
    - BadgesScreen (certifikáty + odznaky)
    - MastersScreen (seznam mých misterů)

  - **MASTER TABS:**
    - MasterDashboardScreen (totéž jako apprentice dashboard, ale pro vybraného učedníka)
    - MasterMaterialsScreen (školící materiály)
    - MasterApprenticesScreen (seznam mých učedníků + výběr)
    - MasterBadgesScreen (správa certifikátů pro vybraného učedníka)

  - **ADMIN TABS:**
    - AdminDashboardScreen
    - AdminPanelScreen (správa uživatelů, smazání, reset)

### Modal Screens (Stack.Group screenOptions={{ presentation: 'modal' }})
- ProfileScreen
- ProjectDetailScreen (carousel s gesturami pro swiping)
- ApprenticeDetailScreen

---

## FEATURES - DETAILNÍ POPIS

### 1. AUTHENTICATION
- Login/Register s email + heslem
- Role-based access control (Apprentice/Master/Admin/Guest)
- Pre-seeded admin: svoboda.gen@email.cz / asdfgh
- Session management přes AuthContext

### 2. APPRENTICE FEATURES

#### Dashboard
- Profil button (top-left corner s ikonou @expo/vector-icons Feather)
- **Stat Cards:** Celkem hodin (clock icon), Projekty (folder icon)
- **Týdenní cíl:**
  - Práce: progress bar + procenta + aktuální/cíl hodiny
  - Studium: progress bar + procenta + aktuální/cíl hodiny
- **Poslední 3 projekty** - ProjectCard komponenta s:
  - Obrázek projektu nebo placeholder (gradient dle kategorie)
  - Nadpis + srdíčko (pokud je `is_liked = true`)
  - Datum (formátované "1. prosince 2025" z `created_at`)
  - Kategorie badge
  - Master comment preview (pokud existuje `master_comment`)
- **Odznaky & Certifikáty** - horizontální scroll s:
  - Ikona Award (@expo/vector-icons Feather)
  - Nadpis certifikátu
  - Klik = modal s detaily (jméno, kategorie, body, "✓ Odemčeno")

#### Projects Screen
- FlatList všech projektů učedníka
- **SwipeableProjectCard** s gesturami:
  - **Left swipe** = like (💜 srdíčko) - toggles `is_liked` v DB
  - **Right swipe** = comment (💬 message-circle) - opens comment modal
  - Icons viditelné během small swipe gestures (purple #8b5cf6 na transparent bg)
- Long press = edit project
- Create button (FAB nebo top button)

#### Hours Screen
- Tabulka/List zaznamenanych hodin
- Filtry: Všechny / Práce / Studium
- Možnost přidat nový záznam

#### Badges Screen
- Grid/List všech dostupných certifikátů
- Locked = šedé, vysvětlující text "Potřebuješ X hodin" apod.
- Unlocked = barevný badge s "✓ Odemčeno"

#### Masters Screen
- Seznam mých přiřazených misterů
- Může jich mít více
- Klik = profil mistra / view his feedback

### 3. MASTER FEATURES

#### Master's Interface - MUSÍ BÝT TOTOŽNÉ S APPRENTICE
- Mistr vybere učedníka z seznamu (MasterApprenticesScreen)
- Po výběru se DATA ukládá do AsyncStorage ("masterSelectedApprenticeData")
- Všechny screeny (Dashboard, Projects, Hours, Badges) se renderují se STEJNÝM UI
- Data zobrazená = data vybraného učedníka, nikoliv mistra

#### Master Dashboard (Identický s Apprentice)
- Zobrazuje data vybraného učedníka
- Stat cards (Celkem hodin, Projekty)
- Týdenní cíl (práce/studium)
- Poslední 3 projekty s heart icon a master comment

#### Master Materials Screen
- Seznam školících materiálů
- Může nahrávat/spravovat materiály

#### Master Apprentices Screen
- FlatList všech přiřazených učedníků
- **Tlačítko na každém učedníkovi = vybrat**
- Po výběru se přepne na MasterDashboard s jeho daty

#### Master Badges Screen
- **CRITICAL: Mistři mohou MANUÁLNĚ aktivovat/deaktivovat certifikáty**
- Zobrazit seznam certifikátů vybraného učedníka
- **TOGGLE BUTTON** na každém certifikátu:
  - Pokud `locked = true` → tlačítko "Odemknout" (zeleně) → klik = set `locked = false` + set `earned_at = NOW()`
  - Pokud `locked = false` → tlačítko "Zamknout" (červeně) → klik = set `locked = true` + set `earned_at = NULL`
- Toto se synchronizuje přes Supabase v real-time

#### Master Projects Screen
- Zobrazit projekty vybraného učedníka
- **Master Comment Feature:**
  - Long press na projekt = modal s text input
  - Zpráva se uloží do `master_comment` field v tabulce projects
  - Zobrazí se v ProjectCard jako preview s message-circle ikonou
  - Projekty se mohou označit srdíčkem (like) = toggle `is_liked`

### 4. ADMIN FEATURES

#### Admin Dashboard
- Přehled počtu uživatelů, projektů, atd.

#### Admin Panel
- Tabulka všech uživatelů
- Možnost smazat uživatele
- Možnost resetovat data uživatele

### 5. GLOBAL FEATURES

#### Project Detail Screen
- **Carousel s gestury pro swipování** (Pan gesture)
- Navigace vlevo/vpravo mezi projekty
- Prvek: "1 / 5" ukazující aktuální pozici
- Zobrazit:
  - Obrázek projektu (nebo placeholder)
  - Nadpis + srdíčko (pokud `is_liked = true`)
  - Datum (z `created_at`)
  - Kategorie + briefcase ikona
  - Počet fotek + image ikona
  - Popis projektu (v colored box s border)
  - Master comment (pokud existuje, v colored box)
  - Navigation hint at bottom (pozice v carouselu)

---

## DESIGN GUIDELINES

### Colors (theme.ts)
```typescript
Light Theme:
  primary: #8b5cf6 (Vibrant Purple)
  secondary: #ec4899 (Pink)
  background: #ffffff
  backgroundRoot: #f9f9f9
  text: #1a1a1a
  textSecondary: #666666
  border: #e0e0e0
  
  // Craft Categories
  craftWood: #d97706 (Orange)
  craftMetal: #6366f1 (Indigo)
  craftCulinary: #f43f5e (Rose)
  craftConstruction: #0891b2 (Cyan)
```

### Typography
- **h1:** fontSize 32, fontWeight 700
- **h2:** fontSize 28, fontWeight 700
- **h3:** fontSize 24, fontWeight 600
- **h4:** fontSize 20, fontWeight 600
- **body:** fontSize 16, fontWeight 400
- **small:** fontSize 14, fontWeight 400
- **caption:** fontSize 12, fontWeight 400

### Spacing
- xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32

### Border Radius
- xs: 8, sm: 12, md: 16, lg: 20, full: 9999

### Layout Rules
- **Safe Area Insets:** Vždy use `useSafeAreaInsets()` nebo helper components
  - ScreenScrollView - pro scrollable screeny
  - ScreenFlatList - pro list screeny
  - ScreenKeyboardAwareScrollView - pro screeny s inputs
- **Transparent Header:** padding top = headerHeight
- **Tab Bar:** padding bottom = tabBarHeight + Spacing.xl
- Header NIKDY nevytvářej inside screen - použij `screenOptions` v navigatoru
- Main screen (Dashboard) MUSÍ mít unique header s app logem/jménem

### Components to Create
1. **Card.tsx** - Reusable card s elevation (backgroundColor, není shadow)
2. **ProjectCard.tsx** - Project preview s image, title, date, category, heart, comment preview
3. **SwipeableProjectCard.tsx** - Projekt s left/right swipe gestury
4. **StatCard.tsx** - Stat s ikonou, labelem, hodnotou
5. **ProgressBar.tsx** - Horizontal progress indikátor
6. **AchievementBadge.tsx** - Badge/Certificate card
7. **ThemedText.tsx** - Text s theme colors
8. **ThemedView.tsx** - View s theme background
9. **ErrorBoundary.tsx** - App crash handler (import { reloadAppAsync } z expo)
10. **ScreenScrollView.tsx** - ScrollView s safe area + insets
11. **ScreenFlatList.tsx** - FlatList s safe area
12. **ScreenKeyboardAwareScrollView.tsx** - Keyboard-aware scroll

### Icons
- Primary: Feather icons (@expo/vector-icons)
- Heart: MaterialCommunityIcons "heart" (#FF3B30 red)
- Message: Feather "message-circle"
- Calendar: Feather "calendar"
- Briefcase: Feather "briefcase"
- Image: Feather "image"
- Clock: Feather "clock"
- Folder: Feather "folder"
- Award: Feather "award"
- User: Feather "user"

---

## STATE MANAGEMENT (Context API)

### AuthContext
- **State:** user (id, email, role), loading, error
- **Functions:**
  - login(email, password)
  - register(email, name, password, role)
  - logout()
  - getUser()

### DataContext
- **State:** userData (projects[], workHours[], certificates[], totalHours, etc.)
- **Functions:**
  - getProjects(userId)
  - createProject(userId, data)
  - updateProject(id, data)
  - deleteProject(id)
  - getWorkHours(userId)
  - addWorkHours(userId, hours, description)
  - getCertificates(userId)
  - unlockCertificate(userId, certId) → set locked=false, earned_at=NOW()
  - lockCertificate(userId, certId) → set locked=true, earned_at=NULL
  - toggleProjectLike(projectId) → toggle is_liked
  - updateMasterComment(projectId, comment) → set master_comment

### MasterContext
- **State:** selectedApprentice, masterApprentices[]
- **Functions:**
  - selectApprentice(apprenticeId)
  - getMyApprentices(masterId)
  - addApprentice(masterId, apprenticeId)

---

## API INTEGRATION (Supabase)

### Key API Functions (services/api.ts)
```typescript
// Auth
export const api = {
  // Users
  getUser(userId): User
  createUser(email, name, password, role): User
  updateUser(userId, data): User
  
  // Projects
  getProjects(userId): Project[]
  createProject(userId, title, description, category, image): Project
  updateProject(projectId, data): Project
  deleteProject(projectId): boolean
  toggleProjectLike(projectId): Project
  updateMasterComment(projectId, comment): Project
  
  // Work Hours
  getWorkHours(userId): WorkHour[]
  addWorkHours(userId, hours, description): WorkHour
  
  // Certificates
  getCertificateTemplates(): CertificateTemplate[]
  getCertificates(userId): Certificate[]
  unlockCertificate(userId, templateId): Certificate
  lockCertificate(userId, certId): Certificate
  getCertificateUnlockRules(templateId): UnlockRule[]
  
  // Master-Apprentice
  getMasterApprentices(masterId): MasterApprentice[]
  addApprentice(masterId, apprenticeId, name): MasterApprentice
  
  // Tasks
  getTasks(userId): Task[]
  createTask(data): Task
}
```

---

## SPECIFICKÉ DETAILY IMPLEMENTACE

### ProjectDetailScreen - Carousel Animation
- Use `Animated.View` s `Pan` gesture
- `panXRef` tracks X position
- Container width = 3x (prev, current, next)
- Swipe left → next project, swipe right → prev project
- Spring animation s bounce effect

### SwipeableProjectCard - Gesture Handling
- Use `Gesture.Pan()` pro left/right swipe
- Left swipe (< -50px) = toggle like
- Right swipe (> 50px) = show comment modal
- Purple heart/message icons na edges
- Use `scheduleOnRN()` pro state updates v gesturách

### Certificate Unlock Logic
- **AUTO Certificates:** Odemknou se automaticky pokud je splněna podmínka
  - WORK_HOURS rule: Pokud totalHours >= condition_value → unlock
  - PROJECTS rule: Pokud totalProjects >= condition_value → unlock
- **MANUAL Certificates:** Mistr musí kliknout tlačítko pro unlock
  - Master vybere certifikát a klikne "Odemknout"
  - Backend set `locked = false` a `earned_at = NOW()`

### Master Viewing Apprentice Data
1. Master otevře MasterApprenticesScreen
2. Vybere učedníka (tlačítko na jeho kartě)
3. System uloží do AsyncStorage: `"masterSelectedApprenticeData": { ...apprenticeData }`
4. Dashboard se re-rendeuje s daty učedníka (STEJNÉ UI)
5. Všechny operace (like, comment, certificate unlock) se aplikují na data učedníka

### Navigation Flow for Master
```
MasterApprenticesScreen (list)
  → Klik na učedníka
  → useFocusEffect loaduje jeho data
  → DashboardScreen se renderuje s `selectedApprenticeData`
  → MasterProjectsScreen, MasterBadgesScreen, atd. - všechny vidí jeho data
```

---

## SPECIFICKÉ POŽADAVKY NA UI

### Header Design
- Main screen (Dashboard) = unique header s app icon/logo
- Ostatní screeny = title + možnost back button
- Transparent headers s blur effect na iOS (expo-blur)
- **IMPORTANT:** Header se vytváří v `screenOptions`, ne inside screen

### Safe Area Handling
- Vždy use helper components nebo `useSafeAreaInsets` hook
- Tab bar positioned absolutely - paddingBottom = tabBarHeight + Spacing.xl
- Transparent header - paddingTop = headerHeight + Spacing.xl
- FABs/floating elements - manual insets management

### List Performance
- Use FlatList (ne array.map) pro dlouhé listy
- Recommended item height pro optimization
- Keyboard awareness - vždy wrap inputs v KeyboardAwareScrollView

### Error Handling
- ErrorBoundary MUSÍ obalovat celou app
- On crash: zobrazit elegant fallback screen
- Button "Restartovat" + custom message relevantní pro context
- Import `reloadAppAsync` z expo (NENÍ reloadAsync z expo-updates!)

### Dark Mode Support
- Theme context se automaticky přizpůsobí system preferences
- Veškeré barvy z theme objektu (ne hardcoded)
- Light/dark palette v constants/theme.ts

---

## ENTRY POINT & APP.JSON CONFIG

### app.json
```json
{
  "name": "Svobodné cechy",
  "slug": "svobodne-cechy",
  "version": "1.0.0",
  "orientation": "portrait",
  "icon": "./assets/icon.png",
  "splash": {
    "image": "./assets/splash.png"
  },
  "ios": {
    "bundleIdentifier": "com.svobodnecechy.app"
  },
  "android": {
    "package": "com.svobodnecechy.app"
  }
}
```

### App.tsx Entry Point
- ErrorBoundary wrapper kolem všeho
- AuthProvider → DataProvider → MasterProvider
- RootNavigator (conditionally AuthNavigator nebo MainTabs)

---

## TESTING & DEPLOYMENT

- Test na mobile screen sizes (402x874)
- Testuj na physical device přes Expo Go (QR scan)
- Web version se bude lišit od native - mej fallback UI
- No localStorage - všechno do Supabase
- Žádné mock/fake data v production paths

---

## POZNÁMKY NA KONEC

- EMOJIS = ZAKÁZÁNO, používej jenom @expo/vector-icons
- Master UI = IDENTICKÉ apprentice UI (critical!)
- Certificate unlock = MANUÁLNÍ tlačítka pro mistra
- Real data z Supabase, žádné async storage mimo session
- Gesture animations s Reanimated na UI thread
- KeyboardAwareScrollView pro všechny inputs
- Safe area insets na každém screenu
- Custom ErrorBoundary s reloadAppAsync
- No hardcoded colors - všechno z theme

Vše by mělo běžet bez dalších instrukcí. Pokud něco není jasné, vrať se k tomuto promptu. Aplikace by měla být komplexní, produkční-ready a identická originálu.