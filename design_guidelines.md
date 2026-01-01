# Design Guidelines: Craft Apprentice Learning Platform

## Target Audience
Teenagers aged 14-18 learning craft trades. Design must embrace **modern social media aesthetics** (TikTok/Instagram vibes) with vibrant gradients, playful animations, and energetic colors to make documenting work feel fun and shareable.

## Architecture Decisions

### Authentication
**Required** - Two user types: Apprentices and Masters
- Apple Sign-In (required for iOS)
- Google Sign-In for Android
- Email/password fallback
- **Registration Flow:**
  - Role selection screen with large gradient cards (Apprentice vs Master)
  - Profile setup: Name, age/experience, craft specialty, avatar selection
  - Avatar picker with 8 vibrant, illustrated options per role
- **Profile Screen:**
  - Editable avatar and display name
  - Stats cards with gradient backgrounds (hours logged, projects, achievements)
  - Settings, log out, delete account (Settings > Account)

### Navigation
**Tab Navigation** (5 tabs for apprentices, 4 for masters)

**Apprentice:**
1. Home, 2. Projects, 3. Create (center FAB), 4. Hours, 5. Learn

**Master:**
1. Home, 2. Materials, 3. Add (center FAB), 4. Apprentices

Profile accessible via header avatar button.

### Screen Specifications

#### Apprentice Screens

**1. Home Dashboard**
- Purpose: Motivational overview with gamified stats
- Transparent header, avatar button (right), notification bell (left)
- ScrollView with pull-to-refresh
- Content: Gradient hero card (weekly progress with animated circular progress), horizontal scrolling achievement badges, recent projects grid (2 columns), streak counter with fire icon
- Safe area: Top = headerHeight + Spacing.xl, Bottom = tabBarHeight + Spacing.xl

**2. Projects Portfolio**
- Purpose: Instagram-style project showcase
- Standard header "Portfolio", filter icon (right)
- Masonry grid (2 columns), each card has gradient overlay on image
- Cards show: Photo, title, date badge, category tag
- Tap navigates to Project Detail (modal)
- Safe area: Top = Spacing.xl, Bottom = tabBarHeight + Spacing.xl

**3. Add Project (Modal)**
- Purpose: Create new project entry
- Custom header: "New Project", Cancel (left), Save (right)
- ScrollView form with gradient photo upload area (multi-select)
- Components: Photo grid, title input, description textarea, category pills, date picker
- Submit in header
- Safe area: Top = Spacing.xl, Bottom = insets.bottom + Spacing.xl

**4. Project Detail (Modal)**
- Purpose: Full project view
- Transparent header, back (left), edit menu (right)
- ScrollView: Full-width photo carousel, gradient info cards, tags, related materials
- Safe area: Top = headerHeight + Spacing.xl, Bottom = insets.bottom + Spacing.xl

**5. Hours Tracker**
- Purpose: Log and visualize work time
- Standard header "My Hours", calendar icon (right)
- Layout: Gradient summary card (circular progress for weekly goal), list of entries below
- Floating gradient action button (bottom right): shadowOffset {0,2}, opacity 0.10, radius 2
- Safe area: Top = Spacing.xl, Bottom = tabBarHeight + Spacing.xl + 72

**6. Log Hours (Modal)**
- Purpose: Quick time entry
- Custom header: "Log Hours", Cancel (left), Save (right)
- Non-scrolling form: Date picker, hour stepper (with gradient increment buttons), activity input
- Safe area: Top = Spacing.xl, Bottom = insets.bottom + Spacing.xl

**7. Learn/Materials**
- Purpose: Access master's resources
- Standard header "Materials", search bar
- FlatList of gradient-accented document cards
- Cards: Icon, title, date, download button
- Empty state: Colorful illustration
- Safe area: Top = Spacing.xl, Bottom = tabBarHeight + Spacing.xl

#### Master Screens

**1. Home Dashboard**
- Purpose: Apprentice overview
- Standard header, avatar (right)
- ScrollView: Apprentice grid cards (gradient backgrounds), pending approvals, activity feed
- Safe area: Top = Spacing.xl, Bottom = tabBarHeight + Spacing.xl

**2. Materials Manager**
- Purpose: Resource library
- Standard header "Materials", add (right)
- List with floating gradient FAB
- Safe area: Top = Spacing.xl, Bottom = tabBarHeight + Spacing.xl + 72

**3. Apprentices List**
- Purpose: Student management
- Standard header "My Apprentices"
- Grid of gradient cards: Avatar, name, stats
- Tap navigates to detail
- Safe area: Top = Spacing.xl, Bottom = tabBarHeight + Spacing.xl

**4. Apprentice Detail (Stack)**
- Purpose: Individual progress review
- Standard header with apprentice name
- ScrollView with segmented tabs: Projects, Hours, Stats
- Safe area: Top = Spacing.xl, Bottom = insets.bottom + Spacing.xl

## Design System

### Color Palette
**Vibrant TikTok/Instagram Aesthetic**

**Primary Gradients:**
- Sunset: #FF6B9D → #FFA07A (pink to peach)
- Ocean: #667EEA → #64B5F6 (purple to blue)
- Energy: #F97316 → #FBBF24 (orange to yellow)
- Mint: #10B981 → #34D399 (green to light green)
- Twilight: #8B5CF6 → #D946EF (violet to magenta)

**Solid Colors:**
- Primary: Vibrant Purple (#8B5CF6)
- Secondary: Electric Turquoise (#06B6D4)
- Accent Pink: #F472B6
- Success: Fresh Green (#10B981)
- Warning: Sunny Yellow (#FBBF24)
- Error: Coral Red (#F87171)

**Neutrals:**
- Background: Soft White (#FAFAFA)
- Surface: Pure White (#FFFFFF)
- Text Primary: Dark Slate (#0F172A)
- Text Secondary: Cool Gray (#64748B)
- Border: Light Gray (#E2E8F0)

### Typography
System fonts (SF Pro for iOS, Roboto for Android)

- Display: Bold, 28-32pt - Hero sections
- Title: Semibold, 20-24pt - Card headers
- Body: Regular, 16pt - Content
- Caption: Medium, 14pt - Metadata
- Label: Medium, 12pt - Tags, badges

### Visual Design

**Gradient Usage:**
- Apply to hero cards, primary buttons, achievement badges, progress bars
- Use 45-degree angle for consistency
- Animate gradient on achievement unlock

**Components:**
- Cards: 16pt rounded corners, gradient borders or backgrounds, subtle shadow
- Primary Buttons: Gradient fill, white text, 12pt radius, scale 0.95 on press
- Secondary Buttons: Transparent with gradient border, 12pt radius
- FAB: Gradient fill, 56pt diameter, white icon, shadow {0,2}, opacity 0.10, radius 2
- Input Fields: White background, 12pt radius, gradient focus border
- Badges: Pill-shaped, gradient backgrounds, white text
- Progress Bars: Gradient fill, animated

**Icons:**
- Feather icons from @expo/vector-icons
- 24pt in UI, 32pt in headers
- Never use emojis

**Gamification:**
- Achievement badges with metallic gradient effects
- Animated celebrations (confetti, pulse) on milestones
- Streak counters with fire gradient
- Progress circles with gradient strokes
- Level-up animations

**Touch Feedback:**
- All touchables: opacity 0.8 on press
- Buttons: scale transform
- Success actions: green checkmark animation
- Loading: gradient skeleton screens

### Critical Assets

Generate vibrant, modern illustrations:

**1. Avatars (8 per role):**
- Apprentice: Diverse young characters with trendy style (headphones, caps, modern safety gear)
- Master: Experienced crafters with contemporary tools
- Style: Bold outlines, flat colors with subtle gradients, Gen Z aesthetic

**2. Achievement Badges (10):**
- First Project, 10/25/50/100 Hours, Weekly Streak, Month Complete, 10 Projects, Master Star, Portfolio Pride
- Style: Circular with metallic gradients (bronze→silver→gold), gem-like effects, glow

**3. Empty States (3):**
- No projects: Young apprentice with tool, vibrant colors
- No materials: Master with resources, energetic pose
- No hours: Playful clock character
- Style: Colorful, Instagram-filter aesthetic

**4. Onboarding (3):**
- Document your journey, Track progress, Learn from masters
- Style: Gradient backgrounds, bold illustrations, modern vibe

All assets should feel like premium social media content - shareable, colorful, and energizing.

### Accessibility
- Touch targets: 44pt minimum
- Contrast: 4.5:1 for text (test against gradient midpoints)
- Dynamic type support
- VoiceOver labels on all interactive elements
- Focus indicators with gradient accents