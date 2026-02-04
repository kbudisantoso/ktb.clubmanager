# Konzept: Club-Rollen & Berechtigungen

## 1. Rollen-Übersicht

### Aktuelle Rollen (Umsetzung jetzt)

| Rolle | Deutsch | Beschreibung |
|-------|---------|--------------|
| **OWNER** | Vorsitzender | Volle Kontrolle, alle Berechtigungen |
| **ADMIN** | Administrator | Technische Verwaltung, Benutzerverwaltung |
| **TREASURER** | Kassenwart | Finanzverwaltung, Buchhaltung |
| **SECRETARY** | Schriftführer | Protokolle, Dokumentation |
| **MEMBER** | Mitglied | Basis-Zugriff (ersetzt VIEWER) |

### Zukünftige Rollen (nicht jetzt)

| Rolle | Deutsch | Beschreibung |
|-------|---------|--------------|
| COACH | Übungsleiter | Trainingsgruppen verwalten |
| Custom Roles | Eigene Rollen | Vereinsspezifische Rollen |

---

## 2. Mehrfach-Rollen (1:n Beziehung)

### Kernkonzept

**Ein User kann MEHRERE Rollen in einem Club haben.**

Beispiele:
- Kassenwart ist gleichzeitig technischer Admin → `[TREASURER, ADMIN]`
- Schriftführer ist gleichzeitig Vorsitzender → `[SECRETARY, OWNER]`
- Vorsitzender übernimmt alle Ämter → `[OWNER, TREASURER, SECRETARY]`

### Rollen-Kombinationen

| Kombination | Effektive Berechtigungen |
|-------------|-------------------------|
| `[MEMBER]` | Basis-Zugriff |
| `[TREASURER]` | Finanzen + Vorstand |
| `[ADMIN]` | Users + Settings |
| `[TREASURER, ADMIN]` | Finanzen + Users + Settings + Vorstand |
| `[OWNER]` | Alles (impliziert alle anderen) |

### Berechtigungs-Logik

```
Berechtigung erteilt = User hat MINDESTENS EINE Rolle die berechtigt ist
```

Beispiel: User hat `[TREASURER, ADMIN]`
- Kann Finanzen verwalten? → Ja (TREASURER)
- Kann Users verwalten? → Ja (ADMIN)
- Ist im Vorstand? → Ja (TREASURER)
- Kann Club löschen? → Nein (nur OWNER)

---

## 3. Rollen-Hierarchie & Gruppen

```
                    ┌─────────┐
                    │  OWNER  │ ← Impliziert ALLE Berechtigungen
                    └────┬────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────┴────┐    ┌─────┴─────┐   ┌─────┴─────┐
    │  ADMIN  │    │ TREASURER │   │ SECRETARY │
    └─────────┘    └───────────┘   └───────────┘
         │               │               │
         │         BOARD MEMBERS ────────┘
         │         (Vorstand)
         │
    ┌────┴────────────────┐
    │       MEMBER        │ ← Implizit für alle
    └─────────────────────┘
```

### Gruppen-Definition

| Gruppe | Rollen | Zweck |
|--------|--------|-------|
| **Board Members** | OWNER, TREASURER, SECRETARY | Vorstand - vertrauliche Dokumente |
| **User Managers** | OWNER, ADMIN | Benutzerverwaltung |
| **Finance Managers** | OWNER, TREASURER | Finanzverwaltung |
| **Settings Managers** | OWNER, ADMIN | Club-Einstellungen |

**Wichtig:** ADMIN ist KEIN Board Member (kein Vorstandseinblick)

---

## 4. Berechtigungsmatrix

### Club-Verwaltung

| Aktion | OWNER | ADMIN | TREASURER | SECRETARY | MEMBER |
|--------|:-----:|:-----:|:---------:|:---------:|:------:|
| Club-Dashboard ansehen | ✓ | ✓ | ✓ | ✓ | ✓ |
| Club-Einstellungen ändern | ✓ | ✓ | ✗ | ✗ | ✗ |
| Einladungscode verwalten | ✓ | ✓ | ✗ | ✗ | ✗ |
| Club löschen | ✓ | ✗ | ✗ | ✗ | ✗ |
| Ownership übertragen | ✓ | ✗ | ✗ | ✗ | ✗ |

### Benutzerverwaltung

| Aktion | OWNER | ADMIN | TREASURER | SECRETARY | MEMBER |
|--------|:-----:|:-----:|:---------:|:---------:|:------:|
| Mitgliederliste sehen | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mitglieder einladen | ✓ | ✓ | ✗ | ✗ | ✗ |
| Beitrittsanfragen verwalten | ✓ | ✓ | ✗ | ✗ | ✗ |
| Rollen zuweisen/entziehen | ✓ | ✓* | ✗ | ✗ | ✗ |
| Mitglieder entfernen | ✓ | ✓ | ✗ | ✗ | ✗ |

*ADMIN kann TREASURER, SECRETARY zuweisen/entziehen, aber NICHT ADMIN oder OWNER

### Finanzverwaltung

| Aktion | OWNER | ADMIN | TREASURER | SECRETARY | MEMBER |
|--------|:-----:|:-----:|:---------:|:---------:|:------:|
| Buchungen ansehen | ✓ | ✗ | ✓ | ✗ | ✗ |
| Buchungen erstellen | ✓ | ✗ | ✓ | ✗ | ✗ |
| Beiträge verwalten | ✓ | ✗ | ✓ | ✗ | ✗ |
| SEPA-Lastschriften | ✓ | ✗ | ✓ | ✗ | ✗ |
| Finanzberichte | ✓ | ✗ | ✓ | ✗ | ✗ |
| Kontenplan verwalten | ✓ | ✗ | ✓ | ✗ | ✗ |

### Protokolle & Dokumentation

| Aktion | OWNER | ADMIN | TREASURER | SECRETARY | MEMBER |
|--------|:-----:|:-----:|:---------:|:---------:|:------:|
| Vereinsinterne Protokolle lesen | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vorstandsprotokolle lesen | ✓ | ✗ | ✓ | ✓ | ✗ |
| Protokolle erstellen | ✓ | ✗ | ✗ | ✓ | ✗ |
| Protokolle bearbeiten | ✓ | ✗ | ✗ | ✓ | ✗ |

---

## 5. Technische Umsetzung

### 5.1 Schema-Änderungen (Prisma)

**Vorher (Single Role):**
```prisma
model ClubUser {
  role ClubRole
}
```

**Nachher (Multiple Roles):**
```prisma
enum ClubRole {
  /// Volle Kontrolle, alle Berechtigungen
  OWNER
  /// Technische Verwaltung, Benutzerverwaltung (keine Finanzen)
  ADMIN
  /// Finanzverwaltung, Buchhaltung (keine Benutzerverwaltung)
  TREASURER
  /// Protokolle, Dokumentation, Vorstandsmitglied
  SECRETARY
  /// Basis-Zugriff für alle Mitglieder (implizit)
  MEMBER
}

model ClubUser {
  // ... existing fields

  /// Rollen des Users im Club (1:n)
  roles ClubRole[]

  // ENTFERNT: role ClubRole
}
```

**Migration:**
1. `VIEWER` → `MEMBER` umbenennen
2. `SECRETARY` hinzufügen
3. `role` (single) → `roles[]` (array) konvertieren
4. Bestehende Rollen in Array migrieren: `role: ADMIN` → `roles: [ADMIN]`

### 5.2 Permission-Groups (Backend)

```typescript
// apps/api/src/common/permissions/club-permissions.ts

export const ClubRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  TREASURER: 'TREASURER',
  SECRETARY: 'SECRETARY',
  MEMBER: 'MEMBER',
} as const;

export type ClubRoleType = (typeof ClubRole)[keyof typeof ClubRole];

export const PERMISSION_GROUPS = {
  // Vorstand - Zugriff auf vertrauliche Dokumente
  BOARD_MEMBERS: [ClubRole.OWNER, ClubRole.TREASURER, ClubRole.SECRETARY],

  // Benutzerverwaltung
  USER_MANAGERS: [ClubRole.OWNER, ClubRole.ADMIN],

  // Finanzverwaltung
  FINANCE_MANAGERS: [ClubRole.OWNER, ClubRole.TREASURER],

  // Club-Einstellungen
  SETTINGS_MANAGERS: [ClubRole.OWNER, ClubRole.ADMIN],

  // Protokollverwaltung (erstellen/bearbeiten)
  PROTOCOL_MANAGERS: [ClubRole.OWNER, ClubRole.SECRETARY],
} as const;

/**
 * Check if user's roles include any role from the required group.
 */
export function hasPermission(
  userRoles: ClubRoleType[],
  requiredGroup: readonly ClubRoleType[]
): boolean {
  return userRoles.some((role) => requiredGroup.includes(role));
}

// Convenience functions
export function isBoardMember(roles: ClubRoleType[]): boolean {
  return hasPermission(roles, PERMISSION_GROUPS.BOARD_MEMBERS);
}

export function canManageUsers(roles: ClubRoleType[]): boolean {
  return hasPermission(roles, PERMISSION_GROUPS.USER_MANAGERS);
}

export function canManageFinances(roles: ClubRoleType[]): boolean {
  return hasPermission(roles, PERMISSION_GROUPS.FINANCE_MANAGERS);
}

export function canManageSettings(roles: ClubRoleType[]): boolean {
  return hasPermission(roles, PERMISSION_GROUPS.SETTINGS_MANAGERS);
}

export function isOwner(roles: ClubRoleType[]): boolean {
  return roles.includes(ClubRole.OWNER);
}
```

### 5.3 Frontend Permission-Hooks

```typescript
// apps/web/lib/club-permissions.ts

import { useActiveClub } from './club-store';

export const PERMISSION_GROUPS = {
  BOARD_MEMBERS: ['OWNER', 'TREASURER', 'SECRETARY'],
  USER_MANAGERS: ['OWNER', 'ADMIN'],
  FINANCE_MANAGERS: ['OWNER', 'TREASURER'],
  SETTINGS_MANAGERS: ['OWNER', 'ADMIN'],
  PROTOCOL_MANAGERS: ['OWNER', 'SECRETARY'],
} as const;

function hasPermission(userRoles: string[], requiredGroup: readonly string[]): boolean {
  return userRoles.some((role) => requiredGroup.includes(role));
}

export function useClubPermissions() {
  const activeClub = useActiveClub();
  const roles = activeClub?.roles ?? [];

  return {
    roles,
    isOwner: roles.includes('OWNER'),
    isBoardMember: hasPermission(roles, PERMISSION_GROUPS.BOARD_MEMBERS),
    canManageUsers: hasPermission(roles, PERMISSION_GROUPS.USER_MANAGERS),
    canManageFinances: hasPermission(roles, PERMISSION_GROUPS.FINANCE_MANAGERS),
    canManageSettings: hasPermission(roles, PERMISSION_GROUPS.SETTINGS_MANAGERS),
    canManageProtocols: hasPermission(roles, PERMISSION_GROUPS.PROTOCOL_MANAGERS),
  };
}

// Individual hooks for specific checks
export function useCanManageSettings(): boolean {
  const { canManageSettings } = useClubPermissions();
  return canManageSettings;
}

export function useCanManageUsers(): boolean {
  const { canManageUsers } = useClubPermissions();
  return canManageUsers;
}

export function useCanManageFinances(): boolean {
  const { canManageFinances } = useClubPermissions();
  return canManageFinances;
}

export function useIsBoardMember(): boolean {
  const { isBoardMember } = useClubPermissions();
  return isBoardMember;
}
```

### 5.4 ClubContext Anpassung

```typescript
// apps/web/lib/club-store.ts

export interface ClubContext {
  id: string;
  name: string;
  slug: string;
  roles: string[];  // GEÄNDERT: role → roles (Array)
  avatarUrl?: string;
  avatarInitials?: string;
  avatarColor?: string;
}
```

### 5.5 Guard-Decorators (Backend)

```typescript
// Bestehend: @RequireRoles() prüft auf MINDESTENS EINE passende Rolle
@RequireRoles('OWNER', 'ADMIN')  // User braucht OWNER ODER ADMIN in roles[]

// Neue Permission-Group Decorators
@RequireUserManagement()   // OWNER oder ADMIN
@RequireFinanceAccess()    // OWNER oder TREASURER
@RequireSettingsAccess()   // OWNER oder ADMIN
@RequireBoardAccess()      // OWNER, TREASURER oder SECRETARY
@RequireProtocolAccess()   // OWNER oder SECRETARY
```

---

## 6. Notwendige Änderungen

### 6.1 Datenbank

| Datei | Änderung |
|-------|----------|
| `prisma/schema.prisma` | `role` → `roles[]`, VIEWER → MEMBER, SECRETARY hinzufügen |
| Migration | `role` zu `roles[]` Array konvertieren |

### 6.2 Backend (API)

| Datei | Änderung |
|-------|----------|
| `src/common/permissions/club-permissions.ts` | **Neue Datei** mit Permission-Groups |
| `src/common/guards/club-context.guard.ts` | Array-basierte Rollen-Prüfung |
| `src/clubs/clubs.service.ts` | `role` → `roles` in allen Queries |
| `src/clubs/access-requests/access-requests.service.ts` | Rollen-Array bei Approval |
| `src/clubs/access-requests/dto/*.ts` | SECRETARY als Option, Array-Support |
| `/api/clubs/my` Endpoint | `roles[]` statt `role` zurückgeben |

### 6.3 Frontend (Web)

| Datei | Änderung |
|-------|----------|
| `lib/club-store.ts` | `role` → `roles[]` in ClubContext |
| `lib/club-permissions.ts` | **Neue Datei** mit Permission-Hooks |
| `hooks/use-clubs.ts` | `role` → `roles` beim Mapping |
| `components/layout/settings-sidebar.tsx` | `useCanManageSettings()` |
| `components/auth/user-menu.tsx` | `useCanManageSettings()` |
| Club-Dashboard Navigation | Permissions-basierte Anzeige |

### 6.4 UI-Anpassungen

| Bereich | Sichtbar für | Hook |
|---------|--------------|------|
| Vereinseinstellungen | OWNER, ADMIN | `useCanManageSettings()` |
| Benutzerverwaltung | OWNER, ADMIN | `useCanManageUsers()` |
| Finanzen/Buchhaltung | OWNER, TREASURER | `useCanManageFinances()` |
| Protokolle (intern) | Alle | - |
| Protokolle (Vorstand) | OWNER, TREASURER, SECRETARY | `useIsBoardMember()` |

---

## 7. Rollen-Vergabe

### Bei Beitrittsanfrage (Approve)

User Manager (OWNER/ADMIN) kann vergeben:
- MEMBER (immer implizit)
- TREASURER
- SECRETARY

Nur OWNER kann vergeben:
- ADMIN

**OWNER kann nie vergeben werden** (nur Transfer)

### Mehrere Rollen vergeben

**UI: Chips mit Add-Button** (erweiterbar für Custom Roles)

```
Rollen: [TREASURER ×] [ADMIN ×] [+ Rolle hinzufügen]
```

Dropdown beim Klick auf "+":
- Kassenwart (TREASURER)
- Schriftführer (SECRETARY)
- Administrator (ADMIN) ← nur wenn User selbst OWNER ist

→ Ergebnis: `roles: ['TREASURER', 'ADMIN']`

**Beitrittsanfrage:** User wählt KEINE Rolle - nur "Zugang anfordern"
**Approval/Verwaltung:** Admin weist Rollen über Chips-UI zu

### Bei direktem Beitritt (Invite Code)

Neue Mitglieder erhalten: `roles: ['MEMBER']`

### Keine Rollen = Kein Zugriff

Wenn `roles: []` (leeres Array), hat der User **keinen Zugriff** auf den Club.

**Use Case:** Nur Vorstand soll Plattform-Zugriff haben
- Normales Vereinsmitglied: `roles: []` → kein Login möglich
- Vorstandsmitglied: `roles: ['TREASURER']` → hat Zugriff

### Rollen hinzufügen/entziehen

- OWNER kann alle Rollen ändern (außer eigene OWNER-Rolle)
- ADMIN kann TREASURER, SECRETARY hinzufügen/entziehen
- ADMIN kann NICHT ADMIN oder OWNER ändern

---

## 8. Abwärtskompatibilität

### Daten-Migration

```sql
-- Migration: role (single) → roles (array)
ALTER TABLE club_users ADD COLUMN roles TEXT[];
UPDATE club_users SET roles = ARRAY[role];
ALTER TABLE club_users DROP COLUMN role;

-- VIEWER → MEMBER umbenennen
UPDATE club_users SET roles = array_replace(roles, 'VIEWER', 'MEMBER');
```

### API-Kompatibilität

Während Übergangsphase beide Felder unterstützen:
```typescript
// Response
{
  role: roles[0],  // Deprecated, für alte Clients
  roles: ['OWNER', 'ADMIN']  // Neu
}
```

---

## 9. Zusammenfassung

**Kernprinzipien:**
1. **Mehrfach-Rollen**: User kann beliebige Kombination haben
2. **OWNER** hat ALLE Berechtigungen
3. **ADMIN** = Technisch/Users, KEINE Finanzen, KEIN Vorstand
4. **TREASURER** = Finanzen, Vorstandsmitglied, KEINE Users
5. **SECRETARY** = Protokolle, Vorstandsmitglied
6. **MEMBER** = Basis (implizit für alle)

**Board Members (Vorstand):** OWNER + TREASURER + SECRETARY
- ADMIN ist bewusst NICHT im Vorstand

**Berechtigungs-Check:** User hat Berechtigung wenn MINDESTENS EINE seiner Rollen berechtigt ist
