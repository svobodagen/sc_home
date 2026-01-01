# Technická analýza: Native iOS crash v HodinyXScreen

## 1. Popis problému

### Symptomy
- **HodinyXScreen** padá na iOS native úrovni při provedení swipe gesta
- **HoursScreen** používá **identický** gesture kód a funguje bezchybně
- Crash je na native úrovni (SIGABRT) - nelze zachytit v JavaScript logách
- Crash nastává pouze na iOS v Expo Go, web verze funguje

### Prostředí
- Expo SDK 54.0.23
- React Native 0.81.5
- react-native-gesture-handler 2.28.0
- react-native-reanimated 4.1.1
- Testováno v Expo Go na iOS

---

## 2. Technické srovnání obou obrazovek

### HoursScreen (FUNGUJE)
```typescript
// Typ editingId
const [editingId, setEditingId] = useState<string | null>(null);

// Zdroj dat
const { workHours } = useData(); // Přímo z DataContext

// Gesture pattern
const panGesture = useCallback(() => {
  return Gesture.Pan()
    .onUpdate((event) => {
      const centerPosition = -containerWidth;
      panXRef.setValue(centerPosition + event.translationX);
    })
    .onEnd((event) => {
      const threshold = containerWidth * 0.51;
      if (event.translationX > threshold) {
        // Navigate to previous period
        animationRef.current = Animated.spring(panXRef, {
          toValue: 0,
          speed: 8,
          bounciness: 6,
          useNativeDriver: false,
        });
        // ...
      }
    });
}, [containerWidth, getPrevPeriod, getNextPeriod]);

// Struktura JSX
<FlatList
  ListHeaderComponent={
    <GestureDetector gesture={panGesture()}>
      <Pressable onLayout={...}>
        <Animated.View style={{ transform: [{ translateX: panXRef }] }}>
          {/* Carousel content */}
        </Animated.View>
      </Pressable>
    </GestureDetector>
  }
/>
```

### HodinyXScreen (PADÁ)
```typescript
// Typ editingId - ROZDÍL #1
const [editingId, setEditingId] = useState<number | null>(null);

// Zdroj dat - ROZDÍL #2
const [selectedApprenticeData, setSelectedApprenticeData] = useState<any>(null);

useFocusEffect(
  React.useCallback(() => {
    const loadMasterApprenticeData = async () => {
      if (user?.role === "Mistr") {
        const data = await AsyncStorage.getItem("masterSelectedApprenticeData");
        if (data) {
          setSelectedApprenticeData(JSON.parse(data)); // Potenciální problém!
        }
      }
    };
    loadMasterApprenticeData();
  }, [user?.role])
);

const workHours = user?.role === "Mistr" && selectedApprenticeData 
  ? selectedApprenticeData.workHours  // Data z AsyncStorage
  : userData.workHours;

// Gesture pattern - IDENTICKÝ s HoursScreen
// ... (stejný kód)
```

---

## 3. Identifikované rozdíly

| Aspekt | HoursScreen | HodinyXScreen |
|--------|-------------|---------------|
| `editingId` typ | `string \| null` | `number \| null` |
| Zdroj dat | `useData().workHours` | `AsyncStorage` snapshot |
| Data loading | Synchronní z contextu | Asynchronní z AsyncStorage |
| useFocusEffect | Ne | Ano |
| Data typ konzistence | Garantovaná | Potenciálně heterogenní |

---

## 4. Vyzkoušená řešení (všechna selhala)

### 4.1 Odstranění GestureDetector
```typescript
// Pokus: Nahrazení GestureDetector běžným View
<View>
  <Pressable>
    <Animated.View>...
```
**Výsledek:** Crash přetrvává při jiných interakcích

### 4.2 Přesná kopie HoursScreen patternu
- Zkopírován celý gesture handling kód
- Stejná struktura JSX
- Stejné Animated.Value nastavení

**Výsledek:** Crash přetrvává

### 4.3 react-native-pager-view
```typescript
import PagerView from 'react-native-pager-view';
// Nahrazení gesture carousel pomocí PagerView
```
**Výsledek:** Nekompatibilní s web platformou, crash na iOS

### 4.4 Horizontal ScrollView s pagingEnabled
```typescript
<ScrollView
  horizontal
  pagingEnabled
  showsHorizontalScrollIndicator={false}
>
  {/* Carousel pages */}
</ScrollView>
```
**Výsledek:** Crash přetrvává

### 4.5 Úplné odstranění animací
- Odstranění Animated.Value
- Statický carousel bez animací

**Výsledek:** Crash přetrvává

---

## 5. Hypotézy příčiny

### Hypotéza A: Heterogenní data z AsyncStorage
**Pravděpodobnost: VYSOKÁ**

Data uložená v AsyncStorage mohou obsahovat:
- `timestamp` jako string místo number
- Neúplné objekty (chybějící properties)
- `undefined` nebo `null` hodnoty v polích

Při výpočtu `containerWidth` nebo animační hodnoty může vzniknout `NaN`:
```typescript
// Pokud containerWidth je NaN nebo undefined
panXRef.setValue(-containerWidth); // NaN způsobí native crash
```

### Hypotéza B: Type mismatch v editingId
**Pravděpodobnost: STŘEDNÍ**

`number` vs `string` v porovnání:
```typescript
// HoursScreen
const isEditing = editingId === hour.id; // string === string ✓

// HodinyXScreen  
const isEditing = editingId === hour.id; // number === ??? 
// Pokud hour.id z AsyncStorage je string, comparison selhává
```

### Hypotéza C: useFocusEffect timing issue
**Pravděpodobnost: STŘEDNÍ**

`useFocusEffect` může způsobit race condition:
1. Komponenta se mountuje
2. Gesture handler se inicializuje s `containerWidth = 0`
3. Async data loading proběhne
4. Re-render s novými daty
5. Gesture handler má stále starou referenci

### Hypotéza D: GestureHandlerRootView conflict
**Pravděpodobnost: NÍZKÁ**

Možný konflikt s jiným GestureHandlerRootView v navigační hierarchii.

---

## 6. Diagnostické limitace

### Proč nelze zachytit crash log
1. **Expo Go na iOS** neexportuje native crash logy
2. SIGABRT/SIGSEGV se nedostanou do JS runtime
3. ErrorBoundary nezachytí native crashes
4. `console.log` před crashem se nemusí vypsat

### Jak by šlo získat více info
1. **expo run:ios** - custom dev client s přístupem k Xcode console
2. **Sentry/Crashlytics** - native crash reporting
3. **Remote debugging** - připojení debuggeru před crashem

---

## 7. Dotazy pro další AI analýzu

1. **Data Serialization:** Může `JSON.parse()` z AsyncStorage vrátit objekt s properties, které způsobí NaN při aritmetických operacích v Animated.Value?

2. **Gesture Handler Internals:** Existují známé problémy s `react-native-gesture-handler` 2.28.0 při použití s asynchronně načtenými daty?

3. **Animated.Value Edge Cases:** Jaké hodnoty způsobí native crash při `Animated.Value.setValue()`? Je to `NaN`, `Infinity`, `undefined`?

4. **Race Condition Detection:** Jak detekovat race condition mezi `useFocusEffect` a gesture handler inicializací?

5. **Type Coercion:** Může type mismatch (`number` vs `string`) v React Native způsobit native crash, nebo pouze JS-level error?

6. **Component Tree Analysis:** Ovlivňuje pozice komponenty v navigační hierarchii (tab navigator vs stack navigator) chování gesture handleru?

7. **Memory/Reference Issue:** Může `useCallback` s dependencies na async-loaded data způsobit stale closure problém vedoucí k native crash?

---

## 8. Navrhované další kroky

1. **Validace dat z AsyncStorage:**
```typescript
const normalizeWorkHours = (data: any): WorkHour[] => {
  if (!Array.isArray(data)) return [];
  return data.map(item => ({
    id: typeof item.id === 'number' ? item.id : parseInt(item.id) || 0,
    timestamp: typeof item.timestamp === 'number' ? item.timestamp : parseInt(item.timestamp) || Date.now(),
    hours: typeof item.hours === 'number' ? item.hours : parseFloat(item.hours) || 0,
    description: String(item.description || ''),
  })).filter(item => !isNaN(item.id) && !isNaN(item.timestamp));
};
```

2. **Guard pro containerWidth:**
```typescript
const safeContainerWidth = containerWidth > 0 && isFinite(containerWidth) ? containerWidth : 360;
panXRef.setValue(-safeContainerWidth);
```

3. **Změna datového zdroje:**
- Použití stejného `useData().workHours` jako HoursScreen
- Eliminace AsyncStorage jako zdroje pro gesture-enabled komponentu

4. **Build custom dev client:**
```bash
npx expo run:ios
```
Pro přístup k native crash logům v Xcode.

---

## 9. Kód k porovnání

### Kritická sekce - data loading
```typescript
// HoursScreen (funguje)
const { workHours } = useData();
// workHours je vždy konzistentní typ z TypeScript interface

// HodinyXScreen (padá)
const data = await AsyncStorage.getItem("masterSelectedApprenticeData");
const parsed = JSON.parse(data);
const workHours = parsed.workHours;
// workHours může mít nekonzistentní typy po deserializaci
```

### Kritická sekce - Animated.Value
```typescript
// Obě obrazovky
panXRef.setValue(-containerWidth + event.translationX);

// Pokud containerWidth = NaN nebo undefined:
// -NaN + number = NaN
// Animated.Value.setValue(NaN) -> NATIVE CRASH na iOS
```

---

## 10. Závěr

Nejpravděpodobnější příčina je **kombinace heterogenních dat z AsyncStorage** a **nedostatečné validace před použitím v Animated.Value**. iOS native layer netoleruje `NaN` hodnoty v animation system, zatímco web/JS engine je tolerantnější.

**Doporučené řešení:** Sjednotit datový zdroj obou obrazovek na `useData().workHours` a přidat robustní validaci pro všechna numerická data před jejich použitím v animacích.
