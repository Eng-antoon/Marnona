// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, serverTimestamp, query, orderBy, where, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCD-CHwd3jko6EK_ckHWFZC0i9tqZwt2rw",
  authDomain: "marnona-630a4.firebaseapp.com",
  projectId: "marnona-630a4",
  storageBucket: "marnona-630a4.appspot.com", // Fixed storage bucket URL
  messagingSenderId: "970601791759",
  appId: "1:970601791759:web:08ae924361146d8dd83e7a",
  measurementId: "G-RCHJF0MEMD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Export the database instance
export { db };

// Local storage keys
const COURSES_STORAGE_KEY = "marnona_courses";
const SESSIONS_STORAGE_KEY = "marnona_sessions";
const REVISIONS_STORAGE_KEY = "marnona_revisions";
const ACTIVITY_STORAGE_KEY = "marnona_activity";

// Track online status
let isOnline = navigator.onLine;
window.addEventListener('online', () => { 
  isOnline = true;
  console.log("App is online. Syncing data..."); 
  syncLocalData();
});
window.addEventListener('offline', () => { 
  isOnline = false;
  console.log("App is offline. Using local storage."); 
});

// Initialize data as soon as the app loads
document.addEventListener('DOMContentLoaded', () => {
  // Initialize data to make sure courses are in the database
  initializeData().then(() => {
    console.log("Data initialization complete");
  }).catch(error => {
    console.error("Error during data initialization:", error);
  });
});

// Helper functions for database operations with offline support
export const addCourse = async (courseData) => {
  try {
    if (isOnline) {
      const docRef = await addDoc(collection(db, "courses"), {
        ...courseData,
        createdAt: serverTimestamp()
      });
      
      // Also save to local storage
      const courses = getLocalCourses();
      courses.push({ id: docRef.id, ...courseData, createdAt: new Date().toISOString() });
      saveLocalCourses(courses);
      
      return docRef.id;
    } else {
      // Generate a temporary ID for offline mode
      const tempId = "local_" + new Date().getTime();
      const courses = getLocalCourses();
      courses.push({ id: tempId, ...courseData, createdAt: new Date().toISOString() });
      saveLocalCourses(courses);
      return tempId;
    }
  } catch (error) {
    console.error("Error adding course:", error);
    
    // Fallback to local storage
    const tempId = "local_" + new Date().getTime();
    const courses = getLocalCourses();
    courses.push({ id: tempId, ...courseData, createdAt: new Date().toISOString() });
    saveLocalCourses(courses);
    
    return tempId;
  }
};

export const getCourses = async () => {
  try {
    if (isOnline) {
      const querySnapshot = await getDocs(collection(db, "courses"));
      const courses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Update local storage
      saveLocalCourses(courses);
      
      return courses;
    } else {
      return getLocalCourses();
    }
  } catch (error) {
    console.error("Error getting courses:", error);
    return getLocalCourses();
  }
};

export const addSession = async (courseId, sessionData) => {
  try {
    if (isOnline) {
      const docRef = await addDoc(collection(db, "sessions"), {
        courseId,
        ...sessionData,
        revisions: 0,
        totalTime: 0,
        createdAt: serverTimestamp(),
        lastStudied: serverTimestamp()
      });
      
      // Also save to local storage
      const sessions = getLocalSessions();
      sessions.push({ 
        id: docRef.id, 
        courseId, 
        ...sessionData, 
        revisions: 0, 
        totalTime: 0, 
        createdAt: new Date().toISOString(),
        lastStudied: new Date().toISOString()
      });
      saveLocalSessions(sessions);
      
      return docRef.id;
    } else {
      // Generate a temporary ID for offline mode
      const tempId = "local_" + new Date().getTime();
      const sessions = getLocalSessions();
      sessions.push({ 
        id: tempId, 
        courseId, 
        ...sessionData, 
        revisions: 0, 
        totalTime: 0, 
        createdAt: new Date().toISOString(),
        lastStudied: new Date().toISOString()
      });
      saveLocalSessions(sessions);
      return tempId;
    }
  } catch (error) {
    console.error("Error adding session:", error);
    
    // Fallback to local storage
    const tempId = "local_" + new Date().getTime();
    const sessions = getLocalSessions();
    sessions.push({ 
      id: tempId, 
      courseId, 
      ...sessionData, 
      revisions: 0, 
      totalTime: 0, 
      createdAt: new Date().toISOString(),
      lastStudied: new Date().toISOString()
    });
    saveLocalSessions(sessions);
    
    return tempId;
  }
};

export const getSessions = async () => {
  try {
    if (isOnline) {
      const q = query(collection(db, "sessions"), orderBy("lastStudied", "desc"));
      const querySnapshot = await getDocs(q);
      const sessions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Update local storage
      saveLocalSessions(sessions);
      
      return sessions;
    } else {
      // Sort local sessions by lastStudied
      const sessions = getLocalSessions();
      return sessions.sort((a, b) => {
        return new Date(b.lastStudied) - new Date(a.lastStudied);
      });
    }
  } catch (error) {
    console.error("Error getting sessions:", error);
    
    // Fallback to local storage
    const sessions = getLocalSessions();
    return sessions.sort((a, b) => {
      return new Date(b.lastStudied) - new Date(a.lastStudied);
    });
  }
};

// Add Revision to a study session
export const addRevision = async (sessionId, revisionData) => {
  try {
    // Ensure duration is treated as an integer
    revisionData.duration = parseInt(revisionData.duration);
    
    if (isOnline) {
      // Add the revision document to the revisions collection
      const revisionRef = await addDoc(collection(db, "revisions"), {
        sessionId,
        ...revisionData,
        date: serverTimestamp()
      });
      
      // Update the session with revisions count and total time
      const sessionRef = doc(db, "sessions", sessionId);
      const sessionSnap = await getDoc(sessionRef);
      
      if (sessionSnap.exists()) {
        const sessionData = sessionSnap.data();
        const totalTime = parseInt(sessionData.totalTime || 0) + parseInt(revisionData.duration);
        const revisions = parseInt(sessionData.revisions || 0) + 1;
        
        await updateDoc(sessionRef, {
          totalTime,
          revisions,
          lastStudied: serverTimestamp()
        });
      }
      
      // Add to local storage too
      const revisions = getLocalRevisions();
      revisions.push({
        id: revisionRef.id,
        sessionId,
        ...revisionData,
        date: new Date().toISOString()
      });
      saveLocalRevisions(revisions);
      
      // Update local session data
      const sessions = getLocalSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      if (sessionIndex !== -1) {
        sessions[sessionIndex].totalTime = parseInt(sessions[sessionIndex].totalTime || 0) + parseInt(revisionData.duration);
        sessions[sessionIndex].revisions = parseInt(sessions[sessionIndex].revisions || 0) + 1;
        sessions[sessionIndex].lastStudied = new Date().toISOString();
        saveLocalSessions(sessions);
      }
      
      return revisionRef.id;
    } else {
      // Handle offline mode
      const tempId = "local_" + new Date().getTime();
      const revisions = getLocalRevisions();
      revisions.push({
        id: tempId,
        sessionId,
        ...revisionData,
        date: new Date().toISOString()
      });
      saveLocalRevisions(revisions);
      
      // Update local session data
      const sessions = getLocalSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      if (sessionIndex !== -1) {
        sessions[sessionIndex].totalTime = parseInt(sessions[sessionIndex].totalTime || 0) + parseInt(revisionData.duration);
        sessions[sessionIndex].revisions = parseInt(sessions[sessionIndex].revisions || 0) + 1;
        sessions[sessionIndex].lastStudied = new Date().toISOString();
        saveLocalSessions(sessions);
      }
      
      return tempId;
    }
  } catch (error) {
    console.error("Error adding revision:", error);
    
    // Fallback to local storage
    const tempId = "local_" + new Date().getTime();
    const revisions = getLocalRevisions();
    revisions.push({
      id: tempId,
      sessionId,
      ...revisionData,
      date: new Date().toISOString()
    });
    saveLocalRevisions(revisions);
    
    return tempId;
  }
};

// Get revisions for a specific session
export const getRevisions = async (sessionId) => {
  try {
    if (isOnline) {
      const q = query(
        collection(db, "revisions"),
        where("sessionId", "==", sessionId),
        orderBy("date", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const revisions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return revisions;
    } else {
      // Get from local storage
      const allRevisions = getLocalRevisions();
      return allRevisions
        .filter(rev => rev.sessionId === sessionId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  } catch (error) {
    console.error("Error getting revisions:", error);
    
    // Fallback to local storage
    const allRevisions = getLocalRevisions();
    return allRevisions
      .filter(rev => rev.sessionId === sessionId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }
};

// Get daily activity statistics
export const getDailyActivity = async (days = 7) => {
  try {
    const result = {};
    const today = new Date();
    
    // Initialize the result object with zero counts for each day
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result[dateStr] = { sessions: 0, revisions: 0, totalTime: 0 };
    }
    
    if (isOnline) {
      // Get the cutoff date (e.g., 7 days ago)
      const cutoffDate = new Date(today);
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // Query sessions created in the last 'days' days
      const sessionsQuery = query(
        collection(db, "sessions"),
        where("createdAt", ">=", cutoffDate)
      );
      
      const sessionsSnapshot = await getDocs(sessionsQuery);
      sessionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) {
          const dateStr = new Date(data.createdAt.toDate()).toISOString().split('T')[0];
          if (result[dateStr]) {
            result[dateStr].sessions += 1;
          }
        }
      });
      
      // Query revisions from the last 'days' days
      const revisionsQuery = query(
        collection(db, "revisions"),
        where("date", ">=", cutoffDate)
      );
      
      const revisionsSnapshot = await getDocs(revisionsQuery);
      revisionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.date) {
          const dateStr = new Date(data.date.toDate()).toISOString().split('T')[0];
          if (result[dateStr]) {
            result[dateStr].revisions += 1;
            result[dateStr].totalTime += data.duration || 0;
          }
        }
      });
    } else {
      // Use local storage
      const sessions = getLocalSessions();
      const revisions = getLocalRevisions();
      
      // Process sessions
      sessions.forEach(session => {
        if (session.createdAt) {
          const dateStr = new Date(session.createdAt).toISOString().split('T')[0];
          if (result[dateStr]) {
            result[dateStr].sessions += 1;
          }
        }
      });
      
      // Process revisions
      revisions.forEach(revision => {
        if (revision.date) {
          const dateStr = new Date(revision.date).toISOString().split('T')[0];
          if (result[dateStr]) {
            result[dateStr].revisions += 1;
            result[dateStr].totalTime += revision.duration || 0;
          }
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error("Error getting daily activity:", error);
    return {};
  }
};

// Get statistics for a specific course
export const getCourseStats = async (courseId) => {
  try {
    if (isOnline) {
      // Query sessions for this course
      const sessionsQuery = query(
        collection(db, "sessions"),
        where("courseId", "==", courseId)
      );
      
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessions = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Query lectures for this course
      const lecturesQuery = query(
        collection(db, "lectures"),
        where("courseId", "==", courseId)
      );
      
      const lecturesSnapshot = await getDocs(lecturesQuery);
      const lectures = lecturesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Query labs for this course
      const labsQuery = query(
        collection(db, "labs"),
        where("courseId", "==", courseId)
      );
      
      const labsSnapshot = await getDocs(labsQuery);
      const labs = labsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Calculate statistics for sessions
      const sessionCount = sessions.length;
      const totalTime = sessions.reduce((total, session) => total + parseInt(session.duration || 0), 0);
      const sessionRevisions = sessions.reduce((total, session) => total + (session.revisions || 0), 0);
      
      // Calculate statistics for lectures
      const lectureCount = lectures.length;
      const studiedLectureCount = lectures.filter(lecture => lecture.status === 'studied' || lecture.status === 'revised').length;
      const revisedLectureCount = lectures.filter(lecture => lecture.status === 'revised').length;
      const lectureRevisions = lectures.reduce((total, lecture) => total + (lecture.revisionCount || 0), 0);
      
      // Calculate statistics for labs
      const labCount = labs.length;
      const studiedLabCount = labs.filter(lab => lab.status === 'studied' || lab.status === 'revised').length;
      const revisedLabCount = labs.filter(lab => lab.status === 'revised').length;
      const labRevisions = labs.reduce((total, lab) => total + (lab.revisionCount || 0), 0);
      
      // Count sessions by status
      const completedSessions = sessions.filter(s => s.status === 'completed').length;
      const revisedSessions = sessions.filter(s => s.status === 'revised').length;
      const inProgressSessions = sessions.filter(s => !s.status || s.status === 'in_progress').length;
      
      // Combined statistics
      const totalRevisions = sessionRevisions + lectureRevisions + labRevisions;
      
      return {
        sessionCount,
        totalTime,
        totalRevisions,
        completedSessions,
        revisedSessions,
        inProgressSessions,
        lectureCount,
        studiedLectureCount,
        revisedLectureCount,
        labCount,
        studiedLabCount,
        revisedLabCount
      };
    } else {
      // Calculate from local storage
      const sessions = getLocalSessions().filter(s => s.courseId === courseId);
      const lectures = getLocalLectures().filter(lecture => lecture.courseId === courseId);
      const labs = getLocalLabs().filter(lab => lab.courseId === courseId);
      
      // Calculate statistics for sessions
      const sessionCount = sessions.length;
      const totalTime = sessions.reduce((total, session) => total + parseInt(session.duration || 0), 0);
      const sessionRevisions = sessions.reduce((total, session) => total + (session.revisions || 0), 0);
      
      // Calculate statistics for lectures
      const lectureCount = lectures.length;
      const studiedLectureCount = lectures.filter(lecture => lecture.status === 'studied' || lecture.status === 'revised').length;
      const revisedLectureCount = lectures.filter(lecture => lecture.status === 'revised').length;
      const lectureRevisions = lectures.reduce((total, lecture) => total + (lecture.revisionCount || 0), 0);
      
      // Calculate statistics for labs
      const labCount = labs.length;
      const studiedLabCount = labs.filter(lab => lab.status === 'studied' || lab.status === 'revised').length;
      const revisedLabCount = labs.filter(lab => lab.status === 'revised').length;
      const labRevisions = labs.reduce((total, lab) => total + (lab.revisionCount || 0), 0);
      
      // Count sessions by status
      const completedSessions = sessions.filter(s => s.status === 'completed').length;
      const revisedSessions = sessions.filter(s => s.status === 'revised').length;
      const inProgressSessions = sessions.filter(s => !s.status || s.status === 'in_progress').length;
      
      // Combined statistics
      const totalRevisions = sessionRevisions + lectureRevisions + labRevisions;
      
      return {
        sessionCount,
        totalTime,
        totalRevisions,
        completedSessions,
        revisedSessions,
        inProgressSessions,
        lectureCount,
        studiedLectureCount,
        revisedLectureCount,
        labCount,
        studiedLabCount,
        revisedLabCount
      };
    }
  } catch (error) {
    console.error("Error getting course stats:", error);
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
};

// Update a session's status
export const updateSessionStatus = async (sessionId, status) => {
  try {
    if (isOnline) {
      const sessionRef = doc(db, "sessions", sessionId);
      
      // Add timestamp based on status
      let updateData = { status };
      if (status === 'completed') {
        updateData.completedAt = serverTimestamp();
      } else if (status === 'revised') {
        updateData.revisedAt = serverTimestamp();
      }
      
      await updateDoc(sessionRef, updateData);
    }
    
    // Update local storage regardless of online status
    const sessions = getLocalSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex !== -1) {
      sessions[sessionIndex].status = status;
      
      // Add timestamp based on status
      if (status === 'completed') {
        sessions[sessionIndex].completedAt = new Date().toISOString();
      } else if (status === 'revised') {
        sessions[sessionIndex].revisedAt = new Date().toISOString();
      }
      
      saveLocalSessions(sessions);
    }
    
    return true;
  } catch (error) {
    console.error("Error updating session status:", error);
    
    // Still update local storage even if Firebase fails
    const sessions = getLocalSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex !== -1) {
      sessions[sessionIndex].status = status;
      
      if (status === 'completed') {
        sessions[sessionIndex].completedAt = new Date().toISOString();
      } else if (status === 'revised') {
        sessions[sessionIndex].revisedAt = new Date().toISOString();
      }
      
      saveLocalSessions(sessions);
    }
    
    return false;
  }
};

// Update a session's completion details
export const updateSessionCompletionDetails = async (sessionId, completionData) => {
  try {
    if (isOnline) {
      const sessionRef = doc(db, "sessions", sessionId);
      
      // Prepare update data
      const updateData = {
        completionTime: completionData.completionTime,
        completionNotes: completionData.completionNotes || ""
      };
      
      // Handle date conversion properly
      if (completionData.completionDate) {
        if (typeof completionData.completionDate === 'string') {
          updateData.completionDate = new Date(completionData.completionDate);
        } else {
          updateData.completionDate = completionData.completionDate;
        }
      } else {
        updateData.completionDate = new Date();
      }
      
      await updateDoc(sessionRef, updateData);
    }
    
    // Update local storage regardless of online status
    const sessions = getLocalSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex !== -1) {
      sessions[sessionIndex].completionTime = completionData.completionTime;
      sessions[sessionIndex].completionNotes = completionData.completionNotes || "";
      
      if (completionData.completionDate) {
        if (typeof completionData.completionDate === 'string') {
          sessions[sessionIndex].completionDate = completionData.completionDate;
        } else {
          sessions[sessionIndex].completionDate = completionData.completionDate.toISOString();
        }
      } else {
        sessions[sessionIndex].completionDate = new Date().toISOString();
      }
      
      saveLocalSessions(sessions);
    }
    
    return true;
  } catch (error) {
    console.error("Error updating session completion details:", error);
    
    // Still update local storage even if Firebase fails
    try {
      const sessions = getLocalSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex !== -1) {
        sessions[sessionIndex].completionTime = completionData.completionTime;
        sessions[sessionIndex].completionNotes = completionData.completionNotes || "";
        
        if (completionData.completionDate) {
          if (typeof completionData.completionDate === 'string') {
            sessions[sessionIndex].completionDate = completionData.completionDate;
          } else {
            sessions[sessionIndex].completionDate = completionData.completionDate.toISOString();
          }
        } else {
          sessions[sessionIndex].completionDate = new Date().toISOString();
        }
        
        saveLocalSessions(sessions);
      }
    } catch (localError) {
      console.error("Error updating local storage:", localError);
    }
    
    return false;
  }
};

// Delete a study session
export const deleteSession = async (sessionId) => {
  try {
    if (isOnline) {
      // Delete the session document
      await deleteDoc(doc(db, "sessions", sessionId));
      
      // Delete all revisions associated with this session
      const revisionsQuery = query(
        collection(db, "revisions"),
        where("sessionId", "==", sessionId)
      );
      
      const revisionsSnapshot = await getDocs(revisionsQuery);
      const deletePromises = revisionsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);
    }
    
    // Update local storage
    let sessions = getLocalSessions();
    sessions = sessions.filter(s => s.id !== sessionId);
    saveLocalSessions(sessions);
    
    let revisions = getLocalRevisions();
    revisions = revisions.filter(r => r.sessionId !== sessionId);
    saveLocalRevisions(revisions);
    
    return true;
  } catch (error) {
    console.error("Error deleting session:", error);
    return false;
  }
};

// Local storage operations
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

function getLocalRevisions() {
  const revisions = localStorage.getItem(REVISIONS_STORAGE_KEY);
  return revisions ? JSON.parse(revisions) : [];
}

function saveLocalRevisions(revisions) {
  localStorage.setItem(REVISIONS_STORAGE_KEY, JSON.stringify(revisions));
}

function getLocalActivity() {
  const activity = localStorage.getItem(ACTIVITY_STORAGE_KEY);
  return activity ? JSON.parse(activity) : [];
}

function saveLocalActivity(activity) {
  localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activity));
}

// Sync local data with Firestore when online
async function syncLocalData() {
  if (!isOnline) return;
  
  // Implement syncing logic here for adding local data to Firebase
  // This is a placeholder for the actual implementation
  console.log("Syncing local data with Firestore...");
}

// Initialize courses data from the provided list
const initializeData = async () => {
  try {
    // Check if we already have courses in the database
    const existingCourses = await getCourses();
    
    if (existingCourses.length > 0) {
      console.log("Data already initialized");
      return;
    }
    
    // Parse and add courses from the provided list
    const coursesData = [
      { code: "BIOT502", name: "Botanical Zool. Field Trips" },
      { code: "BIOT502", name: "Organic Chemistry III (Macromolecular Chemistry)" },
      { code: "BIOT503", name: "Physical Chemistry II (Electrochemistry)" },
      { code: "BIOT631", name: "Genetics & Genetic Engineering I" },
      { code: "BIOT641", name: "Cell Biology" },
      { code: "BIOT651", name: "Introduction to Biosafety" },
      { code: "BIOT681", name: "Bioinformatics" },
      { code: "BIOT691", name: "Technical Chemistry & Process Engineering" },
      { code: "BIOT711", name: "Microbiology II (Microbiology & Immunology)" },
      { code: "BIOT732", name: "Genetics & Genetic Engineering II" },
      { code: "BIOT751", name: "Radionuclides" },
      { code: "BIOT861", name: "Industrial Biotechnology" },
      { code: "BIOT891", name: "Fermentation Technology" },
      { code: "BIOT899", name: "Bachelor Thesis" },
      { code: "CHEM 102", name: "Engineering Chemistry" },
      { code: "CHEMt 102 / CHEMp 102", name: "Chemistry" },
      { code: "ELCT801", name: "Electronics" },
      { code: "PHBC521", name: "Biochemistry & Biochemical Analytical Methods" },
      { code: "PHBC621", name: "Clinical Biochemistry" },
      { code: "PHBL101", name: "Biology I" },
      { code: "PHBL202", name: "Biology II" },
      { code: "PHBL303", name: "Pharmacognosy I" },
      { code: "PHBL511", name: "Pharmacognosy II" },
      { code: "PHBL621", name: "Phytochemistry I" },
      { code: "PHBL722", name: "Phytochemistry II" },
      { code: "PHBL731", name: "Medicinal Plants/Marine Excusrions" },
      { code: "PHBL831", name: "Phytotherapy & Biogenic Drugs" },
      { code: "PHBT091", name: "Fermentation Technology" },
      { code: "PHBT601", name: "Introduction to Biotechnology" },
      { code: "PHCM081", name: "Drug Design" },
      { code: "PHCM101", name: "General & Inorganic Analytical Chemistry I" },
      { code: "PHCM223", name: "Pharmaceutical Analytical Chemistry II" },
      { code: "PHCM331", name: "Organic & Medicinal/Pharmaceutical Chemistry I" },
      { code: "PHCM341", name: "Physical Chemistry" },
      { code: "PHCM432", name: "Organic & Medicinal/Pharmaceutical Chemistry II" },
      { code: "PHCM561", name: "Introduction to Instrumental Analysis" },
      { code: "PHCM571", name: "Pharmaceutical Chemistry I" },
      { code: "PHCM662", name: "Instrumental Analysis" },
      { code: "PHCM672", name: "Pharmaceutical Chemistry II" },
      { code: "PHCM773", name: "Pharmaceutical Chemistry III" },
      { code: "PHCM874", name: "Pharmaceutical Chemistry IV" },
      { code: "PHMB401", name: "General & Pharmaceutical Microbiology" },
      { code: "PHMB911", name: "Microbiology II (Immunology, vaccines, sera)" },
      { code: "PHTC051", name: "Legislation of Pharmacy Laws" },
      { code: "PHTC061", name: "Pharmacy Management" },
      { code: "PHTC201", name: "History of Pharmacy & Biotechnology" },
      { code: "PHTC311", name: "Pharmaceutics I (Orientation & Physical Pharmacy)" },
      { code: "PHTC411", name: "Pharmaceutics II (Drug Dosage Forms)" },
      { code: "PHTC521", name: "Biopharmacy & Dosage Form Kinetics" },
      { code: "PHTC732", name: "Pharmaceutical Technology I" },
      { code: "PHTC833", name: "Pharmaceutical Technology II" },
      { code: "PHTC934", name: "Pharmaceutical Technology III" },
      { code: "PHTC941", name: "Quality Assurance" },
      { code: "PHTX051", name: "Pharmacoepidemiology & Economy" },
      { code: "PHTX062", name: "Clinical Pharmacy II" },
      { code: "PHTX071", name: "Pharmacotherapeutics" },
      { code: "PHTX211", name: "Pharmaceutical & Medical Terminology" },
      { code: "PHTX301", name: "Physiology & Anatomy I" },
      { code: "PHTX402", name: "Physiology & Anatomy II" },
      { code: "PHTX621", name: "Pathology & Histology" },
      { code: "PHTX731", name: "Pathophysiology & Pathobiochemistry" },
      { code: "PHTX831", name: "Toxicology I" },
      { code: "PHTX841", name: "Pharmacology I" },
      { code: "PHTX942", name: "Pharmacology II" },
      { code: "PHTX943", name: "Toxicology II" },
      { code: "PHTX944", name: "First Aid" },
      { code: "PHTX961", name: "Clinical Pharmacy I" }
    ];
    
    // Add each course to the database
    for (const course of coursesData) {
      await addCourse({
        code: course.code,
        name: course.name,
        description: `This is the ${course.name} course with code ${course.code}.`,
        category: course.code.split(/[0-9]/)[0]
      });
    }
    
    console.log("Courses data initialized successfully");
  } catch (error) {
    console.error("Error initializing data:", error);
  }
};

// LECTURES AND LABS OPERATIONS

// Delete a course and all its associated data (lectures, labs, sessions)
export const deleteCourse = async (courseId) => {
  try {
    if (isOnline) {
      // 1. Delete all lectures for this course
      const lecturesQuery = query(
        collection(db, "lectures"),
        where("courseId", "==", courseId)
      );
      const lecturesSnapshot = await getDocs(lecturesQuery);
      const lectureBatch = writeBatch(db);
      lecturesSnapshot.docs.forEach(doc => {
        lectureBatch.delete(doc.ref);
      });
      await lectureBatch.commit();
      
      // 2. Delete all labs for this course
      const labsQuery = query(
        collection(db, "labs"),
        where("courseId", "==", courseId)
      );
      const labsSnapshot = await getDocs(labsQuery);
      const labBatch = writeBatch(db);
      labsSnapshot.docs.forEach(doc => {
        labBatch.delete(doc.ref);
      });
      await labBatch.commit();
      
      // 3. Delete all sessions for this course
      const sessionsQuery = query(
        collection(db, "sessions"),
        where("courseId", "==", courseId)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessionBatch = writeBatch(db);
      sessionsSnapshot.docs.forEach(doc => {
        sessionBatch.delete(doc.ref);
      });
      await sessionBatch.commit();
      
      // 4. Finally delete the course itself
      await deleteDoc(doc(db, "courses", courseId));
      
      // Update local storage
      removeLocalCourse(courseId);
      removeLocalLecturesForCourse(courseId);
      removeLocalLabsForCourse(courseId);
      removeLocalSessionsForCourse(courseId);
      
      return true;
    } else {
      // Offline mode - handle local storage deletion
      removeLocalCourse(courseId);
      removeLocalLecturesForCourse(courseId);
      removeLocalLabsForCourse(courseId);
      removeLocalSessionsForCourse(courseId);
      
      return true;
    }
  } catch (error) {
    console.error("Error deleting course:", error);
    return false;
  }
};

// Add a lecture to a course
export const addLecture = async (courseId, lectureData) => {
  try {
    if (isOnline) {
      const docRef = await addDoc(collection(db, "lectures"), {
        courseId,
        type: 'lecture',
        ...lectureData,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      // Also save to local storage
      const lectures = getLocalLectures();
      lectures.push({ 
        id: docRef.id, 
        courseId,
        type: 'lecture',
        ...lectureData, 
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      saveLocalLectures(lectures);
      
      return docRef.id;
    } else {
      // Generate a temporary ID for offline mode
      const tempId = "local_" + new Date().getTime();
      const lectures = getLocalLectures();
      lectures.push({ 
        id: tempId, 
        courseId,
        type: 'lecture',
        ...lectureData, 
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      saveLocalLectures(lectures);
      return tempId;
    }
  } catch (error) {
    console.error("Error adding lecture:", error);
    
    // Fallback to local storage
    const tempId = "local_" + new Date().getTime();
    const lectures = getLocalLectures();
    lectures.push({ 
      id: tempId, 
      courseId,
      type: 'lecture',
      ...lectureData, 
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    saveLocalLectures(lectures);
    
    return tempId;
  }
};

// Add a lab to a course
export const addLab = async (courseId, labData) => {
  try {
    if (isOnline) {
      const docRef = await addDoc(collection(db, "labs"), {
        courseId,
        type: 'lab',
        ...labData,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      // Also save to local storage
      const labs = getLocalLabs();
      labs.push({ 
        id: docRef.id, 
        courseId,
        type: 'lab',
        ...labData, 
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      saveLocalLabs(labs);
      
      return docRef.id;
    } else {
      // Generate a temporary ID for offline mode
      const tempId = "local_" + new Date().getTime();
      const labs = getLocalLabs();
      labs.push({ 
        id: tempId, 
        courseId,
        type: 'lab',
        ...labData, 
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      saveLocalLabs(labs);
      return tempId;
    }
  } catch (error) {
    console.error("Error adding lab:", error);
    
    // Fallback to local storage
    const tempId = "local_" + new Date().getTime();
    const labs = getLocalLabs();
    labs.push({ 
      id: tempId, 
      courseId,
      type: 'lab',
      ...labData, 
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    saveLocalLabs(labs);
    
    return tempId;
  }
};

// Get all lectures for a course
export const getLecturesForCourse = async (courseId) => {
  try {
    if (isOnline) {
      const q = query(
        collection(db, "lectures"), 
        where("courseId", "==", courseId),
        orderBy("date", "asc")
      );
      const querySnapshot = await getDocs(q);
      const lectures = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Update local storage
      saveLocalLectures(lectures);
      
      return lectures;
    } else {
      // Filter local lectures by courseId
      const lectures = getLocalLectures();
      return lectures
        .filter(lecture => lecture.courseId === courseId)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
  } catch (error) {
    console.error("Error getting lectures:", error);
    
    // Fallback to local storage
    const lectures = getLocalLectures();
    return lectures
      .filter(lecture => lecture.courseId === courseId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }
};

// Get all labs for a course
export const getLabsForCourse = async (courseId) => {
  try {
    if (isOnline) {
      const q = query(
        collection(db, "labs"), 
        where("courseId", "==", courseId),
        orderBy("date", "asc")
      );
      const querySnapshot = await getDocs(q);
      const labs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Update local storage
      saveLocalLabs(labs);
      
      return labs;
    } else {
      // Filter local labs by courseId
      const labs = getLocalLabs();
      return labs
        .filter(lab => lab.courseId === courseId)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
  } catch (error) {
    console.error("Error getting labs:", error);
    
    // Fallback to local storage
    const labs = getLocalLabs();
    return labs
      .filter(lab => lab.courseId === courseId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }
};

// Mark a lecture as studied
export const markLectureAsStudied = async (lectureId, studyData) => {
  try {
    if (isOnline) {
      const lectureRef = doc(db, "lectures", lectureId);
      await updateDoc(lectureRef, {
        status: 'studied',
        studiedAt: serverTimestamp(),
        completionTime: studyData.completionTime,
        completionDate: studyData.completionDate,
        completionNotes: studyData.notes
      });
      
      // Update local storage
      const lectures = getLocalLectures();
      const index = lectures.findIndex(lecture => lecture.id === lectureId);
      if (index !== -1) {
        lectures[index].status = 'studied';
        lectures[index].studiedAt = new Date().toISOString();
        lectures[index].completionTime = studyData.completionTime;
        lectures[index].completionDate = studyData.completionDate;
        lectures[index].completionNotes = studyData.notes;
        saveLocalLectures(lectures);
      }
      
      return true;
    } else {
      // Update local storage only
      const lectures = getLocalLectures();
      const index = lectures.findIndex(lecture => lecture.id === lectureId);
      if (index !== -1) {
        lectures[index].status = 'studied';
        lectures[index].studiedAt = new Date().toISOString();
        lectures[index].completionTime = studyData.completionTime;
        lectures[index].completionDate = studyData.completionDate;
        lectures[index].completionNotes = studyData.notes;
        saveLocalLectures(lectures);
      }
      
      return true;
    }
  } catch (error) {
    console.error("Error marking lecture as studied:", error);
    return false;
  }
};

// Mark a lab as studied
export const markLabAsStudied = async (labId, studyData) => {
  try {
    if (isOnline) {
      const labRef = doc(db, "labs", labId);
      await updateDoc(labRef, {
        status: 'studied',
        studiedAt: serverTimestamp(),
        completionTime: studyData.completionTime,
        completionDate: studyData.completionDate,
        completionNotes: studyData.notes
      });
      
      // Update local storage
      const labs = getLocalLabs();
      const index = labs.findIndex(lab => lab.id === labId);
      if (index !== -1) {
        labs[index].status = 'studied';
        labs[index].studiedAt = new Date().toISOString();
        labs[index].completionTime = studyData.completionTime;
        labs[index].completionDate = studyData.completionDate;
        labs[index].completionNotes = studyData.notes;
        saveLocalLabs(labs);
      }
      
      return true;
    } else {
      // Update local storage only
      const labs = getLocalLabs();
      const index = labs.findIndex(lab => lab.id === labId);
      if (index !== -1) {
        labs[index].status = 'studied';
        labs[index].studiedAt = new Date().toISOString();
        labs[index].completionTime = studyData.completionTime;
        labs[index].completionDate = studyData.completionDate;
        labs[index].completionNotes = studyData.notes;
        saveLocalLabs(labs);
      }
      
      return true;
    }
  } catch (error) {
    console.error("Error marking lab as studied:", error);
    return false;
  }
};

// Mark a lecture as revised
export const markLectureAsRevised = async (lectureId, revisionData) => {
  try {
    // Ensure revisionTime is treated as an integer
    revisionData.revisionTime = parseInt(revisionData.revisionTime);
    
    if (isOnline) {
      const lectureRef = doc(db, "lectures", lectureId);
      
      // Get current lecture data to check if it was already studied
      const lectureSnap = await getDoc(lectureRef);
      if (!lectureSnap.exists() || lectureSnap.data().status !== 'studied' && lectureSnap.data().status !== 'revised') {
        throw new Error("Lecture must be marked as studied before revising");
      }
      
      // Get current revision count or set to 0 if not exists
      const currentRevisionCount = lectureSnap.data().revisionCount || 0;
      
      // Create a new revision entry
      const newRevision = {
        date: revisionData.revisionDate,
        time: revisionData.revisionTime,
        notes: revisionData.notes,
        timestamp: new Date().toISOString()
      };
      
      // Get existing revisions or create new array
      const existingRevisions = lectureSnap.data().revisions || [];
      
      await updateDoc(lectureRef, {
        status: 'revised',
        revisedAt: serverTimestamp(),
        revisionCount: currentRevisionCount + 1,
        revisions: [...existingRevisions, newRevision]
      });
      
      // Update local storage
      const lectures = getLocalLectures();
      const index = lectures.findIndex(lecture => lecture.id === lectureId);
      if (index !== -1) {
        if (lectures[index].status !== 'studied' && lectures[index].status !== 'revised') {
          throw new Error("Lecture must be marked as studied before revising");
        }
        
        // Get current revision count or set to 0 if not exists
        const localRevisionCount = lectures[index].revisionCount || 0;
        
        // Create a new revision entry
        const newLocalRevision = {
          date: revisionData.revisionDate,
          time: revisionData.revisionTime,
          notes: revisionData.notes,
          timestamp: new Date().toISOString()
        };
        
        // Get existing revisions or create new array
        const localExistingRevisions = lectures[index].revisions || [];
        
        lectures[index].status = 'revised';
        lectures[index].revisedAt = new Date().toISOString();
        lectures[index].revisionCount = localRevisionCount + 1;
        lectures[index].revisions = [...localExistingRevisions, newLocalRevision];
        
        saveLocalLectures(lectures);
      }
      
      return true;
    } else {
      // Update local storage only
      const lectures = getLocalLectures();
      const index = lectures.findIndex(lecture => lecture.id === lectureId);
      if (index !== -1) {
        if (lectures[index].status !== 'studied' && lectures[index].status !== 'revised') {
          throw new Error("Lecture must be marked as studied before revising");
        }
        
        // Get current revision count or set to 0 if not exists
        const localRevisionCount = lectures[index].revisionCount || 0;
        
        // Create a new revision entry
        const newLocalRevision = {
          date: revisionData.revisionDate,
          time: revisionData.revisionTime,
          notes: revisionData.notes,
          timestamp: new Date().toISOString()
        };
        
        // Get existing revisions or create new array
        const localExistingRevisions = lectures[index].revisions || [];
        
        lectures[index].status = 'revised';
        lectures[index].revisedAt = new Date().toISOString();
        lectures[index].revisionCount = localRevisionCount + 1;
        lectures[index].revisions = [...localExistingRevisions, newLocalRevision];
        
        saveLocalLectures(lectures);
      }
      
      return true;
    }
  } catch (error) {
    console.error("Error marking lecture as revised:", error);
    throw error;
  }
};

// Mark a lab as revised
export const markLabAsRevised = async (labId, revisionData) => {
  try {
    // Ensure revisionTime is treated as an integer
    revisionData.revisionTime = parseInt(revisionData.revisionTime);
    
    if (isOnline) {
      const labRef = doc(db, "labs", labId);
      
      // Get current lab data to check if it was already studied
      const labSnap = await getDoc(labRef);
      if (!labSnap.exists() || (labSnap.data().status !== 'studied' && labSnap.data().status !== 'revised')) {
        throw new Error("Lab must be marked as studied before revising");
      }
      
      // Get current revision count or set to 0 if not exists
      const currentRevisionCount = labSnap.data().revisionCount || 0;
      
      // Create a new revision entry
      const newRevision = {
        date: revisionData.revisionDate,
        time: revisionData.revisionTime,
        notes: revisionData.notes,
        timestamp: new Date().toISOString()
      };
      
      // Get existing revisions or create new array
      const existingRevisions = labSnap.data().revisions || [];
      
      await updateDoc(labRef, {
        status: 'revised',
        revisedAt: serverTimestamp(),
        revisionCount: currentRevisionCount + 1,
        revisions: [...existingRevisions, newRevision]
      });
      
      // Update local storage
      const labs = getLocalLabs();
      const index = labs.findIndex(lab => lab.id === labId);
      if (index !== -1) {
        if (labs[index].status !== 'studied' && labs[index].status !== 'revised') {
          throw new Error("Lab must be marked as studied before revising");
        }
        
        // Get current revision count or set to 0 if not exists
        const localRevisionCount = labs[index].revisionCount || 0;
        
        // Create a new revision entry
        const newLocalRevision = {
          date: revisionData.revisionDate,
          time: revisionData.revisionTime,
          notes: revisionData.notes,
          timestamp: new Date().toISOString()
        };
        
        // Get existing revisions or create new array
        const localExistingRevisions = labs[index].revisions || [];
        
        labs[index].status = 'revised';
        labs[index].revisedAt = new Date().toISOString();
        labs[index].revisionCount = localRevisionCount + 1;
        labs[index].revisions = [...localExistingRevisions, newLocalRevision];
        
        saveLocalLabs(labs);
      }
      
      return true;
    } else {
      // Update local storage only
      const labs = getLocalLabs();
      const index = labs.findIndex(lab => lab.id === labId);
      if (index !== -1) {
        if (labs[index].status !== 'studied' && labs[index].status !== 'revised') {
          throw new Error("Lab must be marked as studied before revising");
        }
        
        // Get current revision count or set to 0 if not exists
        const localRevisionCount = labs[index].revisionCount || 0;
        
        // Create a new revision entry
        const newLocalRevision = {
          date: revisionData.revisionDate,
          time: revisionData.revisionTime,
          notes: revisionData.notes,
          timestamp: new Date().toISOString()
        };
        
        // Get existing revisions or create new array
        const localExistingRevisions = labs[index].revisions || [];
        
        labs[index].status = 'revised';
        labs[index].revisedAt = new Date().toISOString();
        labs[index].revisionCount = localRevisionCount + 1;
        labs[index].revisions = [...localExistingRevisions, newLocalRevision];
        
        saveLocalLabs(labs);
      }
      
      return true;
    }
  } catch (error) {
    console.error("Error marking lab as revised:", error);
    throw error;
  }
};

// Local storage helpers for lectures and labs
function getLocalLectures() {
  const lectures = localStorage.getItem('marnona_lectures');
  return lectures ? JSON.parse(lectures) : [];
}

function saveLocalLectures(lectures) {
  localStorage.setItem('marnona_lectures', JSON.stringify(lectures));
}

function getLocalLabs() {
  const labs = localStorage.getItem('marnona_labs');
  return labs ? JSON.parse(labs) : [];
}

function saveLocalLabs(labs) {
  localStorage.setItem('marnona_labs', JSON.stringify(labs));
}

// Helper functions for local storage deletion
function removeLocalCourse(courseId) {
  const courses = getLocalCourses();
  const updatedCourses = courses.filter(course => course.id !== courseId);
  saveLocalCourses(updatedCourses);
}

function removeLocalLecturesForCourse(courseId) {
  const lectures = getLocalLectures();
  const updatedLectures = lectures.filter(lecture => lecture.courseId !== courseId);
  saveLocalLectures(updatedLectures);
}

function removeLocalLabsForCourse(courseId) {
  const labs = getLocalLabs();
  const updatedLabs = labs.filter(lab => lab.courseId !== courseId);
  saveLocalLabs(updatedLabs);
}

function removeLocalSessionsForCourse(courseId) {
  const sessions = getLocalSessions();
  const updatedSessions = sessions.filter(session => session.courseId !== courseId);
  saveLocalSessions(updatedSessions);
}

export { auth }; 