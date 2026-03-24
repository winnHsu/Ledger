
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  getDocs, 
  writeBatch, 
  runTransaction,
  deleteDoc,
  deleteField,
  limit,
  Timestamp,
  DocumentReference,
  arrayUnion,
  arrayRemove,
  where,
  orderBy
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { deleteUser } from "firebase/auth";
import { MOCK_USERS } from "./mockData";

// --- HELPERS (Time Truth) ---

// Single source of truth for Local ISO Date Strings (YYYY-MM-DD)
export const toLocalISOString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getTodayStr = () => {
    return toLocalISOString(new Date());
};

export const getWeekRange = (year: number, weekNum: number) => {
    const jan1 = new Date(year, 0, 1);
    const dayOfWeekJan1 = jan1.getDay(); // 0(Sun)..6(Sat)
    
    // End of Week 1 (First Saturday)
    // If Jan 1 is Sat(6), offset is 0.
    // If Jan 1 is Sun(0), offset is 6.
    const offsetToSat = 6 - dayOfWeekJan1;
    const endOfWeek1 = new Date(jan1);
    endOfWeek1.setDate(jan1.getDate() + offsetToSat);
    
    if (weekNum === 1) {
        return { start: jan1, end: endOfWeek1 };
    }
    
    // Week > 1
    // Start = EndOfWeek1 + 1 (First Sunday) + (weekNum - 2) weeks
    const start = new Date(endOfWeek1);
    start.setDate(start.getDate() + 1 + (weekNum - 2) * 7);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    // Cap at Dec 31
    const dec31 = new Date(year, 11, 31);
    if (end > dec31) {
        // This is the last week, clamp it
        return { start, end: dec31 };
    }
    
    return { start, end };
};

export const getWeekParams = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const d = new Date(date);
    d.setHours(0,0,0,0);
    
    // Calculate Week Number based on strict Year Boundaries
    // Week 1: Jan 1 to First Saturday
    // Week 2+: Sunday to Saturday
    
    const jan1 = new Date(year, 0, 1);
    const dayOfWeekJan1 = jan1.getDay();
    
    // Date of first Saturday (End of Week 1)
    const firstSat = new Date(jan1);
    firstSat.setDate(jan1.getDate() + (6 - dayOfWeekJan1));
    
    let weekNum = 1;
    
    if (d > firstSat) {
        // Calculate days passed since the end of Week 1
        // Treat First Sunday (firstSat + 1) as Day 0 of the rest of the year
        const firstSun = new Date(firstSat);
        firstSun.setDate(firstSat.getDate() + 1);
        
        const diffTime = d.getTime() - firstSun.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        weekNum = 2 + Math.floor(diffDays / 7);
    }

    const { start: weekStart } = getWeekRange(year, weekNum);
    const startOfWeekStr = toLocalISOString(weekStart);

    return {
        year: year.toString(),
        weekId: `week${weekNum}`,
        startOfWeekStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase() // sun, mon, tue...
    };
};

// Canonicalize name
export const getCanonicalName = (name: string): string => {
    return name.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, ''); 
};

// --- TYPES ---

export interface FirestoreHabit {
  name: string;
  canonicalName: string;
  time?: number;
  status: 'active' | 'archived';
  activeFrom: string;
  inactiveFrom: string | null;
  sortOrder: number;
  createdAt: any;
}

export interface LeaderboardEntry {
    id: string;
    userName: string;
    motto: string;
    dayStreak: number;
}

// --- CORE ACTIONS ---

export const checkUserHasHabits = async (userId: string): Promise<boolean> => {
    const habitsRef = collection(db, `users/${userId}/habits`);
    const q = query(habitsRef, limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
};

// 1. Toggle Habit (Writes to Year/Week/DayArray + lastPercent)
export const toggleHabitCompletion = async (
  userId: string, 
  habitId: string, 
  dateStr: string,
  activeHabitsCount: number
) => {
  const parts = dateStr.split('-');
  const yearNum = parseInt(parts[0]);
  const localDate = new Date(yearNum, parseInt(parts[1])-1, parseInt(parts[2]));
  
  const { year, weekId, dayName } = getWeekParams(localDate);
  
  // Calculate days in this specific week (handle partial weeks at year boundaries)
  const weekNum = parseInt(weekId.replace('week', ''));
  const { start, end } = getWeekRange(yearNum, weekNum);
  const daysInWeek = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
  
  // Path: users/{uid}/{year}/{weekId}
  const weekRef = doc(db, `users/${userId}/${year}/${weekId}`);

  await runTransaction(db, async (transaction) => {
    const weekSnap = await transaction.get(weekRef);
    let data = weekSnap.exists() ? weekSnap.data() : {};
    
    // Determine new checks for the specific day
    let currentDayHabits = data[dayName] || [];
    const exists = currentDayHabits.includes(habitId);
    
    if (exists) {
        currentDayHabits = currentDayHabits.filter((id: string) => id !== habitId);
    } else {
        currentDayHabits = [...currentDayHabits, habitId];
    }
    
    const updates: any = {
        [dayName]: currentDayHabits,
        updatedAt: serverTimestamp()
    };
    
    // Recalculate Total Checks in Week for lastPercent
    let totalChecks = currentDayHabits.length;
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    days.forEach(d => {
        if (d !== dayName && Array.isArray(data[d])) {
            totalChecks += data[d].length;
        }
    });
    
    const totalPossible = daysInWeek * activeHabitsCount;
    const percent = totalPossible > 0 ? (totalChecks / totalPossible) * 100 : 0;
    
    updates['lastPercent'] = percent;

    if (!weekSnap.exists()) {
        transaction.set(weekRef, updates);
    } else {
        transaction.update(weekRef, updates);
    }
  });

  // Recalculate streak after toggling
  return await updateAppStreak(userId, true, dateStr);
};

// 2. Create Habit
export const createHabit = async (userId: string, name: string, time?: number) => {
    const canon = getCanonicalName(name);
    if (!canon) throw new Error("Invalid habit name.");

    const habitsRef = collection(db, `users/${userId}/habits`);
    const indexRef = doc(db, `users/${userId}/habitNameIndex`, canon);

    await runTransaction(db, async (transaction) => {
        const indexSnap = await transaction.get(indexRef);
        if (indexSnap.exists()) throw new Error(`Habit "${name}" already exists.`);

        const snapshot = await getDocs(query(habitsRef)); 
        const activeCount = snapshot.docs.filter(d => d.data().status === 'active').length;
        if (activeCount >= 15) throw new Error("Max 15 active habits allowed.");

        const count = snapshot.size;
        const newHabitRef = doc(habitsRef);
        const todayStr = getTodayStr();

        transaction.set(indexRef, {
            habitId: newHabitRef.id,
            createdAt: serverTimestamp()
        });

        const newHabitData: any = {
            name,
            canonicalName: canon,
            status: 'active',
            activeFrom: todayStr,
            inactiveFrom: null,
            sortOrder: count,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        if (time !== undefined) {
            newHabitData.time = time;
        }

        transaction.set(newHabitRef, newHabitData);
    });
};

// 3. Update Habit Details (Name & Time)
export const updateHabitDetails = async (userId: string, habitId: string, updates: { name?: string, time?: number }) => {
    const habitRef = doc(db, `users/${userId}/habits`, habitId);

    await runTransaction(db, async (transaction) => {
        const habitSnap = await transaction.get(habitRef);
        if (!habitSnap.exists()) throw new Error("Habit not found.");

        const data = habitSnap.data() as FirestoreHabit;
        const updatePayload: any = { updatedAt: serverTimestamp() };

        // Handle Time Update
        if (updates.time !== undefined) {
            updatePayload.time = updates.time;
        }

        // Handle Name Update
        if (updates.name && updates.name !== data.name) {
            const newName = updates.name;
            const newCanon = getCanonicalName(newName);
            if (!newCanon) throw new Error("Invalid habit name.");

            const oldCanon = data.canonicalName;

            if (oldCanon !== newCanon) {
                const newIndexRef = doc(db, `users/${userId}/habitNameIndex`, newCanon);
                const newIndexSnap = await transaction.get(newIndexRef);
                
                if (newIndexSnap.exists()) throw new Error(`Habit "${newName}" already exists.`);

                transaction.delete(doc(db, `users/${userId}/habitNameIndex`, oldCanon));
                transaction.set(newIndexRef, { habitId, createdAt: serverTimestamp() });
                
                updatePayload.name = newName;
                updatePayload.canonicalName = newCanon;
            } else {
                // Same canonical name (e.g. case change), just update display name
                updatePayload.name = newName;
            }
        }

        if (Object.keys(updatePayload).length > 1) { // 1 because updatedAt is always there
             transaction.update(habitRef, updatePayload);
        }
    });
};

// 4. Archive Habit
export const archiveHabit = async (userId: string, habitId: string) => {
    const ref = doc(db, `users/${userId}/habits`, habitId);
    await updateDoc(ref, { 
        status: 'archived',
        inactiveFrom: getTodayStr(),
        updatedAt: serverTimestamp()
    });
};

// 5. Restore Habit
export const restoreUserHabit = async (userId: string, habitId: string) => {
    const habitsRef = collection(db, `users/${userId}/habits`);
    
    await runTransaction(db, async (transaction) => {
        const snapshot = await getDocs(query(habitsRef)); 
        const activeCount = snapshot.docs.filter(d => d.data().status === 'active').length;
        if (activeCount >= 15) throw new Error("Max 15 active habits allowed.");

        const habitRef = doc(db, `users/${userId}/habits`, habitId);
        const habitSnap = await transaction.get(habitRef);
        
        if (!habitSnap.exists()) throw new Error("Habit not found.");
        
        transaction.update(habitRef, {
            status: 'active',
            inactiveFrom: null,
            updatedAt: serverTimestamp()
        });
    });
};

// 6. Delete Habit (Hard Delete)
export const deleteUserHabit = async (userId: string, habitId: string) => {
    const habitRef = doc(db, `users/${userId}/habits`, habitId);
    
    await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(habitRef);
        if (!snapshot.exists()) throw new Error("Habit not found.");
        
        const data = snapshot.data();
        const canon = data.canonicalName;
        
        // Delete the index so name can be reused
        if (canon) {
            const indexRef = doc(db, `users/${userId}/habitNameIndex`, canon);
            transaction.delete(indexRef);
        }
        
        // Delete the habit document
        transaction.delete(habitRef);
    });
};

// 7. Reorder
export const reorderUserHabits = async (userId: string, orderedHabits: { id: string }[]) => {
    const batch = writeBatch(db);
    orderedHabits.forEach((h, index) => {
        const ref = doc(db, `users/${userId}/habits`, h.id);
        batch.update(ref, { sortOrder: index });
    });
    await batch.commit();
};

// 8. Commit Onboarding (Updated)
export const commitOnboarding = async (
    userId: string, 
    habitNames: string[],
    email: string
) => {
    const userRef = doc(db, 'users', userId);
    const todayStr = getTodayStr();
    const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Init current week
    const parts = todayStr.split('-');
    const localDate = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    const { year, weekId } = getWeekParams(localDate);
    
    const weekRef = doc(db, `users/${userId}/${year}/${weekId}`);

    await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists() && userSnap.data().isOnboarded) return;

        const uniqueNames = new Set<string>();
        const processedHabits: { name: string, canon: string, ref: DocumentReference, indexRef: DocumentReference }[] = [];

        for (const name of habitNames) {
            const canon = getCanonicalName(name);
            if (!canon || uniqueNames.has(canon)) continue;
            uniqueNames.add(canon);
            
            const habitRef = doc(collection(db, `users/${userId}/habits`));
            const indexRef = doc(db, `users/${userId}/habitNameIndex`, canon);
            processedHabits.push({ name, canon, ref: habitRef, indexRef });
        }

        transaction.set(userRef, {
            isOnboarded: true,
            theme: 'dark',
            userName: email, // Default to email
            motto: null,
            isAdmin: false,
            // New Fields
            alertTimes: null,
            isRanked: true, // Default to true
            isActive: true,
            deleteTime: null,
            dayStreak: 1, // Start with 1 day streak on onboarding
            lastLogTime: serverTimestamp(),
            timeZone: systemTimeZone,
            
            createdAt: userSnap.exists() ? userSnap.data().createdAt : serverTimestamp(),
            onboardedAt: serverTimestamp()
        }, { merge: true });

        // Initialize Week Doc
        transaction.set(weekRef, {
            updatedAt: serverTimestamp()
        }, { merge: true });

        processedHabits.forEach((h, index) => {
            transaction.set(h.indexRef, { habitId: h.ref.id, createdAt: serverTimestamp() });
            transaction.set(h.ref, {
                name: h.name,
                canonicalName: h.canon,
                status: 'active',
                activeFrom: todayStr,
                inactiveFrom: null,
                sortOrder: index,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        });
    });
};

// 9. Update User Profile
export const updateUserProfile = async (
    userId: string, 
    data: { 
        userName?: string; 
        motto?: string; 
        alertTimes?: string[] | null;
        isRanked?: boolean;
        isActive?: boolean;
        deleteTime?: string | null;
    }
) => {
    const ref = doc(db, 'users', userId);
    await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp()
    });
};

// 10. Update App Streak (Run on App Load or Toggle)
export const updateAppStreak = async (userId: string, isFromToggle: boolean = false, toggledDateStr?: string): Promise<{ streak: number, showedAnimation: boolean } | null> => {
    const userRef = doc(db, 'users', userId);
    
    // 1. Get System Time Zone
    const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // 2. Dates for comparison
    const today = new Date();
    const todayStr = toLocalISOString(today);

    try {
        // Calculate the streak by reading the week documents.
        let streak = 0;
        let currentDate = new Date(today);
        currentDate.setHours(0,0,0,0);
        
        let currentYear = currentDate.getFullYear();
        let yearDocs: Record<string, any> = {};
        
        const loadYear = async (year: number) => {
            const snap = await getDocs(collection(db, `users/${userId}/${year}`));
            const docs: Record<string, any> = {};
            snap.forEach(d => {
                docs[d.id] = d.data();
            });
            return docs;
        };
        
        yearDocs = await loadYear(currentYear);
        
        const hasLogsOnDate = async (date: Date) => {
            const year = date.getFullYear();
            if (year !== currentYear) {
                currentYear = year;
                yearDocs = await loadYear(currentYear);
            }
            const { weekId, dayName } = getWeekParams(date);
            const weekData = yearDocs[weekId];
            if (!weekData) return false;
            const dayHabits = weekData[dayName];
            return Array.isArray(dayHabits) && dayHabits.length > 0;
        };
        
        let mostRecentLoggedDate = new Date(currentDate);
        let foundLog = false;
        
        // Scan backwards to find the most recent logged day (cap at 365 days to prevent infinite loops)
        for (let i = 0; i < 365; i++) {
            const hasLog = await hasLogsOnDate(mostRecentLoggedDate);
            if (hasLog) {
                foundLog = true;
                break;
            }
            mostRecentLoggedDate.setDate(mostRecentLoggedDate.getDate() - 1);
        }
        
        if (foundLog) {
            streak = 1;
            let checkDate = new Date(mostRecentLoggedDate);
            while (true) {
                checkDate.setDate(checkDate.getDate() - 1);
                const logs = await hasLogsOnDate(checkDate);
                if (logs) {
                    streak++;
                } else {
                    break;
                }
            }
        } else {
            streak = 0;
        }

        const result = await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) return null;

            const data = userSnap.data();
            const currentStreak = typeof data.dayStreak === 'number' ? data.dayStreak : 0;
            const storedTimeZone = data.timeZone;
            
            // Check for TimeZone change
            const isTimeZoneDifferent = storedTimeZone !== systemTimeZone;

            const updates: any = {};
            
            if (isTimeZoneDifferent) {
                updates.timeZone = systemTimeZone;
            }

            let showedAnimation = false;

            // If this update comes from toggling a habit, and the streak increased, show animation
            if (isFromToggle && streak > currentStreak && streak > 0) {
                // Only show animation if the toggled date is today or yesterday
                const yesterdayStr = toLocalISOString(new Date(today.getTime() - 86400000));
                if (toggledDateStr === todayStr || toggledDateStr === yesterdayStr) {
                    showedAnimation = true;
                }
            }

            if (streak !== currentStreak || isTimeZoneDifferent) {
                updates.dayStreak = streak;
                updates.lastLogTime = serverTimestamp();
                transaction.update(userRef, updates);
            }

            return { streak, showedAnimation };
        });
        return result;
    } catch (e) {
        console.error("Streak update error:", e);
        return null;
    }
};

// 11. Delete User
export const deleteUserAccount = async (userId: string) => {
    const years = [new Date().getFullYear(), new Date().getFullYear() - 1];
    const subColls = ['habits', 'habitNameIndex'];
    
    // Clean Habits
    for (const col of subColls) {
        const snap = await getDocs(collection(db, `users/${userId}/${col}`));
        const batch = writeBatch(db);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }

    // Clean Weeks
    for (const y of years) {
         const snap = await getDocs(collection(db, `users/${userId}/${y}`));
         const batch = writeBatch(db);
         snap.forEach(d => batch.delete(d.ref));
         await batch.commit();
    }
    
    await deleteDoc(doc(db, 'users', userId));
    if (auth.currentUser) await deleteUser(auth.currentUser);
};

// 12. Get Leaderboard (With Mocks)
export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
    try {
        const usersRef = collection(db, 'users');
        const q = query(
            usersRef, 
            where('isRanked', '==', true), 
            orderBy('dayStreak', 'desc'), 
            limit(50) // FETCH TOP 50 REAL USERS
        );
        
        const snapshot = await getDocs(q);
        const realUsers = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                userName: data.userName || 'Anonymous',
                motto: data.motto || '',
                dayStreak: data.dayStreak || 0
            };
        });

        // Determine max streak from real users
        // If empty, max is 0.
        const maxRealStreak = realUsers.length > 0 ? realUsers[0].dayStreak : 0;
        
        let combined = [...realUsers];

        // Only generate mocks if the range 2 to max-1 is valid (requires max >= 3)
        // If user has streak 3: range 2-2. Mock has 2.
        if (maxRealStreak > 2) {
            const maxMock = maxRealStreak - 1;
            const minMock = 2;
            
            // Map the imported JSON to leaderboard entries
            const mocks: LeaderboardEntry[] = MOCK_USERS.map((m: any, i: number) => ({
                id: `mock_${i}`,
                userName: m.name,
                motto: m.motto,
                // Random streak between minMock and maxMock (inclusive)
                dayStreak: Math.floor(Math.random() * (maxMock - minMock + 1)) + minMock
            }));
            
            combined = [...combined, ...mocks];
        }

        // Sort Combined List Descending by Streak
        combined.sort((a, b) => b.dayStreak - a.dayStreak);
        
        // Return ONLY TOP 50
        return combined.slice(0, 50);

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        // Fallback
        return [];
    }
};
