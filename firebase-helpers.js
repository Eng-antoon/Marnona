// Firebase Helpers - Optimized data fetching functions
import { 
  db, 
  getCourses, 
  getSessions, 
  getLecturesForCourse, 
  getLabsForCourse, 
  getCourseStats 
} from './firebase-config.js';
import { collection, getDocs, query, where, orderBy, limit, startAfter, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Local storage keys
const COURSES_STORAGE_KEY = "marnona_courses";
const SESSIONS_STORAGE_KEY = "marnona_sessions";
const LECTURES_STORAGE_KEY = "marnona_lectures";
const LABS_STORAGE_KEY = "marnona_labs";

// Local storage helper functions
function getLocalCourses() {
  const courses = localStorage.getItem(COURSES_STORAGE_KEY);
  return courses ? JSON.parse(courses) : [];
}

function saveLocalCourses(courses) {
  localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(courses));
}

function getLocalSessions() {
  const sessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
  return sessions ? JSON.parse(sessions) : [];
}

function saveLocalSessions(sessions) {
  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
}

function getLocalLectures() {
  const lectures = localStorage.getItem(LECTURES_STORAGE_KEY);
  return lectures ? JSON.parse(lectures) : [];
}

function saveLocalLectures(lectures) {
  localStorage.setItem(LECTURES_STORAGE_KEY, JSON.stringify(lectures));
}

function getLocalLabs() {
  const labs = localStorage.getItem(LABS_STORAGE_KEY);
  return labs ? JSON.parse(labs) : [];
}

function saveLocalLabs(labs) {
  localStorage.setItem(LABS_STORAGE_KEY, JSON.stringify(labs));
}

// Cache management
const CACHE_EXPIRY = 1000 * 60 * 5; // 5 minutes
const cache = {
  courses: { data: null, timestamp: 0 },
  sessions: { data: null, timestamp: 0 },
  lectures: { courseData: {}, timestamp: {} },
  labs: { courseData: {}, timestamp: {} },
  courseStats: { data: {}, timestamp: {} }
};

// Add dailyActivity to the cache system
const cacheKeys = {
  courses: 'courses',
  sessions: 'sessions',
  lecturesForCourse: 'lecturesForCourse_',
  labsForCourse: 'labsForCourse_',
  courseStats: 'courseStats_',
  allLabs: 'allLabs',
  dailyActivity: 'dailyActivity_'
};

// Batched query function
export async function getBatchedData(collectionName, queryConstraints = [], batchSize = 50) {
  try {
    const dataArray = [];
    let lastDoc = null;
    let hasMore = true;
    
    while (hasMore) {
      // Create a query with pagination
      let q;
      if (lastDoc) {
        q = query(
          collection(db, collectionName),
          ...queryConstraints,
          startAfter(lastDoc),
          limit(batchSize)
        );
      } else {
        q = query(
          collection(db, collectionName),
          ...queryConstraints,
          limit(batchSize)
        );
      }
      
      const querySnapshot = await getDocs(q);
      
      // Check if we have fewer documents than the batch size, meaning we're done
      if (querySnapshot.docs.length < batchSize) {
        hasMore = false;
      }
      
      // Save the last document for pagination
      if (querySnapshot.docs.length > 0) {
        lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      }
      
      // Add the current batch to our results
      const batch = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      dataArray.push(...batch);
    }
    
    return dataArray;
  } catch (error) {
    console.error(`Error in getBatchedData for ${collectionName}:`, error);
    return [];
  }
}

// Get courses with caching
export async function getCachedCourses() {
  // Check if we have a valid cache
  if (cache.courses.data && (Date.now() - cache.courses.timestamp < CACHE_EXPIRY)) {
    console.log("Using cached courses data");
    return cache.courses.data;
  }
  
  // Create an abort controller with a timeout mechanism
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15 seconds timeout
  
  try {
    // First, check local storage for any data
    const localCourses = getLocalCourses();
    
    // If we have local data, update the cache immediately so there's at least something to show
    if (localCourses && localCourses.length > 0) {
      // Update cache with local data right away
      cache.courses.data = localCourses;
      cache.courses.timestamp = Date.now();
      
      // Use this as our fallback if the fetch fails
      console.log("Using local courses data while fetching from server");
    }
    
    // Attempt to fetch fresh data from Firebase
    const courses = await getCourses();
    
    // Clear the timeout since we got a response
    clearTimeout(timeoutId);
    
    // Update local storage
    saveLocalCourses(courses);
    
    // Update cache
    cache.courses.data = courses;
    cache.courses.timestamp = Date.now();
    
    return courses;
  } catch (error) {
    // Clear the timeout to prevent memory leaks
    clearTimeout(timeoutId);
    
    console.error("Error getting cached courses:", error);
    
    // Fall back to local storage if we haven't already loaded it
    if (!cache.courses.data) {
      const localCourses = getLocalCourses();
      
      // Update cache with local data
      cache.courses.data = localCourses;
      cache.courses.timestamp = Date.now();
      
      return localCourses;
    }
    
    // If we already have cache data (from local storage above), use that
    return cache.courses.data;
  }
}

// Get sessions with caching
export async function getCachedSessions() {
  // Check if we have a valid cache
  if (cache.sessions.data && (Date.now() - cache.sessions.timestamp < CACHE_EXPIRY)) {
    console.log("Using cached sessions data");
    return cache.sessions.data;
  }
  
  // Create an abort controller with a timeout mechanism
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15 seconds timeout
  
  try {
    // First, check local storage for any data
    const localSessions = getLocalSessions();
    
    // If we have local data, update the cache immediately so there's at least something to show
    if (localSessions && localSessions.length > 0) {
      const sortedLocalSessions = localSessions.sort((a, b) => new Date(b.lastStudied) - new Date(a.lastStudied));
      
      // Update cache with local data right away
      cache.sessions.data = sortedLocalSessions;
      cache.sessions.timestamp = Date.now();
      
      // Use this as our fallback if the fetch fails
      console.log("Using local sessions data while fetching from server");
    }
    
    // Attempt to fetch fresh data
    // Use the Firebase getSessions function from firebase-config.js
    const sessions = await getSessions();
    
    // Clear the timeout since we got a response
    clearTimeout(timeoutId);
    
    // Update local storage
    saveLocalSessions(sessions);
    
    // Update cache
    cache.sessions.data = sessions;
    cache.sessions.timestamp = Date.now();
    
    return sessions;
  } catch (error) {
    // Clear the timeout to prevent memory leaks
    clearTimeout(timeoutId);
    
    console.error("Error getting cached sessions:", error);
    
    // Fall back to local storage if we haven't already loaded it
    if (!cache.sessions.data) {
      const localSessions = getLocalSessions();
      const sortedLocalSessions = localSessions.sort((a, b) => new Date(b.lastStudied) - new Date(a.lastStudied));
      
      // Update cache with local data
      cache.sessions.data = sortedLocalSessions;
      cache.sessions.timestamp = Date.now();
      
      return sortedLocalSessions;
    }
    
    // If we already have cache data (from local storage above), use that
    return cache.sessions.data;
  }
}

// Get lectures for a course with caching
export async function getCachedLecturesForCourse(courseId) {
  // Check if we have a valid cache for this course
  if (
    cache.lectures.courseData[courseId] && 
    cache.lectures.timestamp[courseId] && 
    (Date.now() - cache.lectures.timestamp[courseId] < CACHE_EXPIRY)
  ) {
    console.log(`Using cached lectures data for course ${courseId}`);
    return cache.lectures.courseData[courseId];
  }
  
  try {
    // Use the Firebase getLecturesForCourse function from firebase-config.js
    const lectures = await getLecturesForCourse(courseId);
    
    // Update cache
    cache.lectures.courseData[courseId] = lectures;
    cache.lectures.timestamp[courseId] = Date.now();
    
    return lectures;
  } catch (error) {
    console.error(`Error getting cached lectures for course ${courseId}:`, error);
    
    // Fall back to local storage
    const localLectures = getLocalLectures().filter(lecture => lecture.courseId === courseId);
    
    // Update cache with local data
    cache.lectures.courseData[courseId] = localLectures;
    cache.lectures.timestamp[courseId] = Date.now();
    
    return localLectures;
  }
}

// Get labs for a course with caching
export async function getCachedLabsForCourse(courseId) {
  // Check if we have a valid cache for this course
  if (
    cache.labs.courseData[courseId] && 
    cache.labs.timestamp[courseId] && 
    (Date.now() - cache.labs.timestamp[courseId] < CACHE_EXPIRY)
  ) {
    console.log(`Using cached labs data for course ${courseId}`);
    return cache.labs.courseData[courseId];
  }
  
  try {
    // Use the Firebase getLabsForCourse function from firebase-config.js
    const labs = await getLabsForCourse(courseId);
    
    // Update cache
    cache.labs.courseData[courseId] = labs;
    cache.labs.timestamp[courseId] = Date.now();
    
    return labs;
  } catch (error) {
    console.error(`Error getting cached labs for course ${courseId}:`, error);
    
    // Fall back to local storage
    const localLabs = getLocalLabs().filter(lab => lab.courseId === courseId);
    
    // Update cache with local data
    cache.labs.courseData[courseId] = localLabs;
    cache.labs.timestamp[courseId] = Date.now();
    
    return localLabs;
  }
}

// Get course stats with optimized data fetching and caching
export async function getCachedCourseStats(courseId) {
  // Check if we have a valid cache for this course's stats
  if (
    cache.courseStats.data[courseId] && 
    cache.courseStats.timestamp[courseId] && 
    (Date.now() - cache.courseStats.timestamp[courseId] < CACHE_EXPIRY)
  ) {
    console.log(`Using cached stats data for course ${courseId}`);
    return cache.courseStats.data[courseId];
  }
  
  try {
    // Use the Firebase getCourseStats function from firebase-config.js
    const stats = await getCourseStats(courseId);
    
    // Update cache
    cache.courseStats.data[courseId] = stats;
    cache.courseStats.timestamp[courseId] = Date.now();
    
    return stats;
  } catch (error) {
    console.error(`Error getting cached stats for course ${courseId}:`, error);
    
    return {
      sessionCount: 0,
      totalTime: 0,
      totalRevisions: 0,
      completedSessions: 0,
      revisedSessions: 0,
      inProgressSessions: 0,
      lectureCount: 0,
      studiedLectureCount: 0,
      revisedLectureCount: 0,
      labCount: 0,
      studiedLabCount: 0,
      revisedLabCount: 0
    };
  }
}

// Get all labs data optimized
export async function getCachedAllLabs(courses) {
  try {
    if (!courses || courses.length === 0) {
      console.log("No courses provided to getCachedAllLabs");
      return [];
    }
    
    // Use Promise.all to fetch labs for all courses in parallel
    const labPromises = courses.map(course => {
      if (!course || !course.id) {
        console.warn("Invalid course object received:", course);
        return Promise.resolve([]);
      }
      return getCachedLabsForCourse(course.id);
    });
    
    const labsArrays = await Promise.all(labPromises);
    
    // Flatten the arrays of labs
    const allLabs = labsArrays.flat();
    
    console.log(`Retrieved ${allLabs.length} labs from ${courses.length} courses`);
    return allLabs;
  } catch (error) {
    console.error("Error getting all labs:", error);
    return [];
  }
}

// Function to clear cache by key
export function clearCache(key) {
  if (!cacheKeys[key]) {
    console.warn(`Unknown cache key: ${key}`);
    return;
  }
  
  const baseKey = cacheKeys[key];
  
  if (baseKey.endsWith('_')) {
    // For keys that have dynamic parts (like courseId), clear all matching keys
    Object.keys(sessionStorage).forEach(storedKey => {
      if (storedKey.startsWith(baseKey)) {
        sessionStorage.removeItem(storedKey);
      }
    });
  } else {
    // For simple keys, just remove the item
    sessionStorage.removeItem(baseKey);
  }
}

// Fetch with timeout to handle network issues more gracefully
export async function fetchWithTimeout(promise, timeout = 10000) {
  let timer;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error('Request timed out'));
      }, timeout);
    });
    
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

// Wrapper to handle failed fetches by using cached data as fallback
export async function fetchWithFallback(fetchFn, cacheKey, params = {}) {
  try {
    // Try to fetch fresh data
    return await fetchWithTimeout(fetchFn(params));
  } catch (error) {
    console.error(`Error fetching ${cacheKey}:`, error);
    
    // Try to get from cache
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      console.log(`Using cached data for ${cacheKey}`);
      return JSON.parse(cachedData);
    }
    
    // If no cache, rethrow the error
    throw error;
  }
}

// Prefetch common data in the background
export async function prefetchCommonData() {
  console.log("Starting background prefetch of common data...");
  
  try {
    // Start courses prefetch
    getCachedCourses()
      .then(courses => {
        console.log(`Successfully prefetched ${courses.length} courses`);
      })
      .catch(error => {
        console.error("Error prefetching courses:", error);
      });
    
    // Start sessions prefetch
    getCachedSessions()
      .then(sessions => {
        console.log(`Successfully prefetched ${sessions.length} sessions`);
      })
      .catch(error => {
        console.error("Error prefetching sessions:", error);
      });
    
    // We don't need to await these calls as they're meant to just populate the cache
    console.log("Background prefetching initiated");
  } catch (error) {
    console.error("Error in prefetchCommonData:", error);
  }
}

// Export local storage functions for other modules
export {
  getLocalCourses,
  saveLocalCourses,
  getLocalSessions,
  saveLocalSessions,
  getLocalLectures,
  saveLocalLectures,
  getLocalLabs,
  saveLocalLabs
}; 