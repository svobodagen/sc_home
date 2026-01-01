# Overview

This is a React Native mobile application built with Expo, designed as a learning platform for craft apprentices ("Svobodné cechy" - Free Guilds). The app connects apprentices (učedníci) with master craftspeople (mistři) to track work hours, manage projects, earn achievements, and facilitate communication. The app features a modern, social media-inspired aesthetic targeting teenagers aged 14-18.

The application supports multiple user roles (Apprentice, Master, Admin, Guest) with role-specific features and navigation structures. Data is stored locally using AsyncStorage, with no backend server currently implemented.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework:** React Native with Expo SDK 54
- **Navigation:** React Navigation v7 with native stack and bottom tabs
- **UI Library:** Custom component library with themed design system
- **Animations:** React Native Reanimated 4.1 for smooth, performant animations
- **Gesture Handling:** React Native Gesture Handler for swipe interactions and touch responses
- **State Management:** React Context API for global state (Auth, Data, Master contexts)

**Design System:**
- Theme-based color system with light/dark mode support
- Consistent spacing, typography, and border radius constants
- Custom themed components (ThemedText, ThemedView) that automatically adapt to theme
- Gradient and vibrant color palette inspired by social media (TikTok/Instagram aesthetic)

**Key Architectural Decisions:**
- **Component Composition:** Highly reusable components (Card, Button, StatCard, ProjectCard, etc.) for consistent UI
- **Screen-level Containers:** Custom scroll view wrappers (ScreenScrollView, ScreenKeyboardAwareScrollView) that handle safe area insets and keyboard avoidance automatically
- **Animation Strategy:** Spring-based animations with shared values for interactive feedback on pressable elements
- **Platform-Specific Handling:** Conditional rendering for web vs. native (e.g., KeyboardAwareScrollView fallback)

## Data Architecture

**Cloud-First Strategy:** Supabase PostgreSQL as the primary data persistence layer (NO local storage)
- All data stored directly in Supabase cloud
- Real-time synchronization between frontend and database
- Direct Supabase API calls from frontend (no backend server)

**Database Tables & Models:**
- **users** - Authentication & user profiles: `{ id, email, name, role, password, timestamp }`
- **projects** - Apprentice projects: `{ id, user_id, title, description, category, image, photos[], created_at, updated_at }`
- **work_hours** - Logged work hours: `{ id, user_id, project_id, hours, description, created_at }`
- **certificates** - Achievements/badges: `{ id, user_id, title, category, points, locked, requirement, earned_at, created_at }`
- **tasks** - Master-assigned tasks: `{ id, apprentice_id, master_id, project_id, title, description, due_date, completed, created_at, updated_at }`
- **comments** - Comments on projects: `{ id, project_id, user_id, text, created_at }`
- **master_apprentices** - Master-apprentice relationships: `{ id, master_id, apprentice_id, apprentice_name, created_at }`
- **apprentice_goals** - Personal goals per apprentice: `{ user_id, work_goal_week, study_goal_week, work_goal_month, study_goal_month, work_goal_year, study_goal_year, created_at, updated_at }`

**Context Providers:**
- **AuthContext:** Manages user authentication, login/logout, user registration, admin functions
- **DataContext:** Manages apprentice data (projects, hours, badges), provides data manipulation methods
- **MasterContext:** Manages master-apprentice relationships for master users

**Data Access Patterns:**
- All data operations go through context providers
- Automatic persistence to AsyncStorage on data mutations
- Data loading on context initialization and user login

## Navigation Architecture

**Root Navigator (Stack):**
- Conditionally renders AuthNavigator (if not logged in) or Main tab navigation (if logged in)
- Modal screens: Profile, ProjectDetail, ApprenticeDetail

**Tab Navigation:**
- **Apprentice Tabs:** Dashboard, Projects, Hours, Badges, Masters
- **Master Tabs:** Dashboard, Materials, Apprentices
- **Admin Tabs:** Dashboard, Admin panel

**Navigation Features:**
- Header blur effects on iOS
- Transparent headers with safe area handling
- Gesture-based navigation with swipe-back support
- Custom header titles with logo integration

## Authentication & Authorization

**Authentication Mechanism:**
- Local authentication using AsyncStorage (no backend)
- Password-based login with email validation
- Pre-seeded admin account (`svoboda.gen@email.cz` / `asdfgh`)

**Authorization Strategy:**
- Role-based UI rendering (different tab sets per role)
- Admin functions: view all users, delete users, reset user data
- Master functions: manage apprentices, view apprentice details, assign tasks
- Apprentice functions: track hours, manage projects, earn badges

**Security Considerations:**
- Passwords stored in plain text in AsyncStorage (acceptable for prototype, not production)
- No token-based authentication
- No server-side validation

# External Dependencies

## Core Framework
- **Expo SDK 54.0.23:** Cross-platform development framework with native module access
- **React 19.1.0 & React Native 0.81.5:** UI framework and mobile runtime
- **React Navigation 7.x:** Navigation library for tab and stack navigation

## UI & Animations
- **React Native Reanimated 4.1.1:** High-performance animation library
- **React Native Gesture Handler 2.28.0:** Touch and gesture system
- **Expo Linear Gradient 15.0.7:** Gradient rendering for visual effects
- **Expo Blur 15.0.7:** Blur effects for headers and UI elements
- **@expo/vector-icons 15.0.2:** Icon library (Feather icons primary)

## Device Features
- **Expo Image Picker 17.0.8:** Camera and gallery access for project photos
- **Expo Haptics 15.0.7:** Haptic feedback for interactions
- **React Native Keyboard Controller 1.18.5:** Advanced keyboard management

## Storage & State
- **AsyncStorage 2.2.0:** Local key-value storage for all app data
- **React Native Safe Area Context 5.6.0:** Safe area inset management

## Development Tools
- **TypeScript 5.x:** Type safety and developer experience
- **ESLint 9.25.0 with Expo config:** Code quality and formatting
- **Prettier 10.1.8:** Code formatting
- **Babel Module Resolver:** Path aliasing (`@/` imports)

## Platform-Specific
- **Expo Web Browser 15.0.9:** In-app browser for OAuth flows (future use)
- **Expo Splash Screen 31.0.10:** Native splash screen management
- **React Native Screens 4.16.0:** Native screen optimization

## Third-Party Services
- **googleapis 148.0.0:** Google API client (included but not actively used in current implementation)

**Note:** The app currently has no backend server. All data is stored locally. Future implementation may require:
- Backend API for data synchronization
- Database (potentially Postgres with Drizzle ORM based on codebase patterns)
- OAuth providers (Apple Sign-In for iOS, Google Sign-In for Android as per design guidelines)
- Cloud storage for project images