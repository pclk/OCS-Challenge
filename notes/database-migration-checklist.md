# Database Migration Checklist

This document lists all data currently stored outside the database that should be migrated to the database.

## 1. **Reports (User Reports/Issues)** ⚠️ HIGH PRIORITY
**Current Location:** In-memory array in `app/api/auth/report-existing/route.ts`
**Issue:** 
- Data is lost on server restart
- Limited to 100 reports (older reports are deleted)
- No persistence across deployments
- Cannot query or filter efficiently

**Fields to Store:**
- `id` (String, unique)
- `name` (String)
- `wing` (String)
- `password` (String, hashed) - Optional
- `type` (Enum: 'ACCOUNT_CONFLICT' | 'NEW_ACCOUNT_REQUEST')
- `email` (String, optional)
- `phone` (String, optional)
- `notes` (Text, optional)
- `createdAt` (DateTime)
- `resolvedAt` (DateTime, optional)
- `resolvedBy` (String, optional) - Admin who resolved it
- `status` (Enum: 'PENDING' | 'RESOLVED' | 'DISMISSED')

**Migration Steps:**
1. Create `Report` model in Prisma schema
2. Create migration
3. Update `app/api/auth/report-existing/route.ts` to use database
4. Update `app/api/admin/reports/route.ts` to query database directly
5. Migrate existing in-memory reports (if any) before deployment

---

## 2. **Wings Data** ✅ PARTIALLY MIGRATED
**Current Location:** CSV file at `data/wings.csv` + Database table `wings`
**Status:** Already in database, but loaded from CSV on initialization
**Recommendation:** 
- Keep CSV as seed data for initial setup
- All runtime operations should use database
- ✅ Already properly stored in database

---

## 3. **Exercises Data** ✅ PARTIALLY MIGRATED
**Current Location:** CSV file at `data/exercise.csv` + Database table `exercises`
**Status:** Already in database, but loaded from CSV on initialization
**Recommendation:**
- Keep CSV as seed data for initial setup
- All runtime operations should use database
- ✅ Already properly stored in database

---

## 4. **Personnel/Name-Rank Mappings** ✅ ALREADY IN DATABASE
**Current Location:** CSV file at `data/personnel.csv` + Database table `name_rank_mappings`
**Status:** Already stored in database
**Recommendation:**
- Keep CSV as seed data for initial setup
- ✅ Already properly stored in database

---

## 5. **Admin Passwords** ⚠️ CONSIDER MIGRATION
**Current Location:** Environment variables in `lib/auth.ts`
**Current Implementation:**
- `OCS_ADMIN_PASSWORD` - Single OCS admin password
- `WING_ADMIN_PASSWORD` - Single wing admin password
- Individual wing passwords: `ALPHA_WING_PASSWORD`, `CHARLIE_WING_PASSWORD`, etc.

**Considerations:**
- **Option A (Keep in Env):** More secure, but harder to manage/rotate
- **Option B (Database):** Easier to manage, but must be properly hashed

**If Migrating to Database:**
- Create `AdminAccount` model:
  - `id` (Int)
  - `username` (String, unique, optional)
  - `passwordHash` (String) - Hashed password
  - `adminLevel` (Enum: 'OCS' | 'WING')
  - `wing` (String, optional) - For wing admins
  - `isActive` (Boolean)
  - `createdAt` (DateTime)
  - `lastLoginAt` (DateTime, optional)
  - `createdBy` (Int, optional) - Admin who created this account

**Recommendation:** 
- For production, consider migrating to database for:
  - Multiple admin accounts per level
  - Password rotation
  - Audit trail of admin access
  - Easier management

---

## 6. **Session Tokens** ✅ APPROPRIATE (Client-side)
**Current Location:** localStorage (client-side)
**Status:** ✅ This is appropriate - session tokens should be client-side
**Note:** Token validation happens server-side, which is correct

---

## Summary

### Must Migrate (High Priority):
1. **Reports** - Currently in-memory, will be lost on restart

### Consider Migrating (Medium Priority):
2. **Admin Passwords** - For better management and multiple admin accounts

### Already Properly Stored:
- ✅ Wings (in database)
- ✅ Exercises (in database)
- ✅ Personnel/Name-Rank Mappings (in database)
- ✅ Users (in database)
- ✅ Scores (in database)
- ✅ Account Actions (in database)

### Appropriate to Keep Outside Database:
- ✅ Session tokens (localStorage - client-side)
- ✅ CSV files (seed data only)

---

## Migration Priority Order

1. **Reports** - Critical: Data loss on restart
2. **Admin Passwords** - Important: Better security and management

