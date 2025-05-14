import {
  getCourses,
  getSessions,
  addSession,
  addRevision,
  getRevisions,
  getDailyActivity,
  getCourseStats,
  deleteSession,
  addCourse,
  updateSessionStatus,
  addLecture,
  addLab,
  getLecturesForCourse,
  getLabsForCourse,
  markLectureAsStudied,
  markLabAsStudied,
  markLectureAsRevised,
  markLabAsRevised,
  deleteCourse
} from './firebase-config.js';

// DOM Elements
const navigationItems = document.querySelectorAll('.sidebar-nav li');
const contentSections = document.querySelectorAll('.content-section');
const coursesList = document.getElementById('courses-list');
const courseSearch = document.getElementById('course-search');
const courseFilter = document.getElementById('course-filter');
const searchBtn = document.getElementById('search-btn');
const studyCourseSelect = document.getElementById('study-course');
const studySessionsTable = document.getElementById('study-sessions-table').querySelector('tbody');
const studySessionForm = document.getElementById('study-session-form');
const recordRevisionModal = document.getElementById('record-revision-modal');
const recordRevisionForm = document.getElementById('record-revision-form');
const addSessionModal = document.getElementById('add-session-modal');
const addSessionForm = document.getElementById('add-session-form');
const courseDetailModal = document.getElementById('course-detail-modal');
console.log('Course detail modal element:', courseDetailModal);
const closeModalButtons = document.querySelectorAll('.close-modal');
const aiInput = document.getElementById('ai-input');
const aiSendBtn = document.getElementById('ai-send-btn');
const aiChatMessages = document.getElementById('ai-chat-messages');
const addCourseBtn = document.getElementById('add-course-btn');
const addCourseModal = document.getElementById('add-course-modal');
const addCourseForm = document.getElementById('add-course-form');
const timeRangeButtons = document.querySelectorAll('.time-btn');
const manageLecturesLabsModal = document.getElementById('manage-lectures-labs-modal');
const lecturesTab = document.getElementById('lectures-tab');
const labsTab = document.getElementById('labs-tab');
const tabButtons = document.querySelectorAll('.tab-btn');
const addLectureForm = document.getElementById('add-lecture-form');
const addLabForm = document.getElementById('add-lab-form');
const lecturesTable = document.getElementById('lectures-table').querySelector('tbody');
const labsTable = document.getElementById('labs-table').querySelector('tbody');
const markStudiedModal = document.getElementById('mark-studied-modal');
const markStudiedForm = document.getElementById('mark-studied-form');
const markRevisedModal = document.getElementById('mark-revised-modal');
const markRevisedForm = document.getElementById('mark-revised-form');

// Global state
let allCourses = [];
let allSessions = [];
let currentSessionId = null;
let isOfflineMode = false; // Always start in online mode by default
let currentCourse = null;
let currentItemId = null;
let currentItemType = null;

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

// Initialize the application
async function initializeApp() {
  try {
    // Update UI elements with loading indicators
    showLoading('courses-list', 'Loading your courses...');
    showLoading('study-sessions-table', 'Loading your study sessions...');
    
    // Fetch data
    allCourses = await getCourses();
    allSessions = await getSessions();
    
    // Populate UI
    renderCourses(allCourses);
    populateStudyCourseSelect();
    renderStudySessions();
    initializeDashboard();
    updateReports();
    
    // Set up event listeners
    setupEventListeners();
    
    // Display success message
    showMotivationalMessage();
  } catch (error) {
    console.error('Error initializing app:', error);
    showErrorMessage('There was an error loading your data. Please refresh the page.');
  }
}

// Helper function to show loading indicators
function showLoading(elementId, message = 'Loading...') {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  if (element.tagName === 'TBODY') {
    const loadingRow = document.createElement('tr');
    loadingRow.className = 'loading-row';
    loadingRow.innerHTML = `
      <td colspan="7" style="text-align: center; padding: 20px;">
        <span class="loader"></span> ${message}
      </td>
    `;
    element.innerHTML = '';
    element.appendChild(loadingRow);
  } else {
    element.innerHTML = `
      <div class="loading-container" style="text-align: center; padding: 20px;">
        <span class="loader"></span>
        <p>${message}</p>
      </div>
    `;
  }
}

// Helper function to show error messages
function showErrorMessage(message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.style.backgroundColor = '#f44336';
  errorElement.style.color = 'white';
  errorElement.style.padding = '10px 20px';
  errorElement.style.borderRadius = '10px';
  errorElement.style.position = 'fixed';
  errorElement.style.top = '20px';
  errorElement.style.right = '20px';
  errorElement.style.zIndex = '9999';
  errorElement.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  errorElement.textContent = message;
  
  document.body.appendChild(errorElement);
  
  setTimeout(() => {
    errorElement.style.opacity = '0';
    errorElement.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      document.body.removeChild(errorElement);
    }, 500);
  }, 5000);
}

// Helper function to show success message
function showSuccessMessage(message) {
  const successElement = document.createElement('div');
  successElement.className = 'success-message';
  successElement.style.backgroundColor = '#4caf50';
  successElement.style.color = 'white';
  successElement.style.padding = '10px 20px';
  successElement.style.borderRadius = '10px';
  successElement.style.position = 'fixed';
  successElement.style.top = '20px';
  successElement.style.right = '20px';
  successElement.style.zIndex = '9999';
  successElement.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  successElement.textContent = message;
  
  document.body.appendChild(successElement);
  
  setTimeout(() => {
    successElement.style.opacity = '0';
    successElement.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      document.body.removeChild(successElement);
    }, 500);
  }, 5000);
}

// Helper function to show motivational messages
function showMotivationalMessage() {
  const messages = [
    "You're doing an amazing job, Marnona! Keep it up!",
    "Your dedication to learning is truly inspiring!",
    "Every study session brings you closer to your goals!",
    "Your hard work today is an investment in your future success!",
    "You're going to be an incredible pharmacist one day!",
    "Remember: persistence is the key to success!",
    "You've got this, Marnona! Stay focused and positive!"
  ];
  
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  const motivationText = document.querySelector('.motivation-text');
  if (motivationText) {
    motivationText.textContent = randomMessage;
  }
}

// Function to setup all event listeners
function setupEventListeners() {
  setupNavigation();
  setupCourseSearch();
  setupStudySessionForm();
  setupAddCourse();
  setupCloseModals();
  setupAIChat();
  setupTimeRangeSelectors();
  setupLecturesLabsTabs();
  setupAddLectureForm();
  setupAddLabForm();
  setupMarkStudiedForm();
  setupMarkRevisedForm();
}

// Navigation between sections
function setupNavigation() {
  navigationItems.forEach(item => {
    item.addEventListener('click', () => {
      const sectionId = item.dataset.section;
      
      // Update active navigation item
      navigationItems.forEach(navItem => {
        navItem.classList.remove('active');
      });
      item.classList.add('active');
      
      // Show selected section
      contentSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === sectionId) {
          section.classList.add('active');
        }
      });
      
      // Refresh data in the selected section if needed
      if (sectionId === 'reports') {
        updateReports();
      } else if (sectionId === 'study-buddy') {
        renderStudySessions();
      }
    });
  });
}

// Setup Add Course functionality
function setupAddCourse() {
  if (!addCourseBtn || !addCourseModal || !addCourseForm) return;
  
  // Open Add Course modal
  addCourseBtn.addEventListener('click', () => {
    openModal(addCourseModal);
  });
  
  // Handle form submission
  addCourseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const code = document.getElementById('course-code').value;
    const name = document.getElementById('course-name').value;
    const description = document.getElementById('course-description').value || `This is the ${name} course with code ${code}.`;
    let category = document.getElementById('course-category').value;
    
    // Auto-detect category if not selected
    if (!category) {
      // Extract prefix from code (e.g., PHCM from PHCM101)
      category = code.split(/[0-9]/)[0];
    }
    
    try {
      // Show loading state
      const submitBtn = addCourseForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Saving...';
      submitBtn.disabled = true;
      
      // Add course to database
      const courseData = { code, name, description, category };
      const courseId = await addCourse(courseData);
      
      // Add new course to the local array
      const newCourse = { id: courseId, ...courseData };
      allCourses.push(newCourse);
      
      // Update UI
      renderCourses(allCourses);
      populateStudyCourseSelect();
      
      // Close modal and reset form
      closeModal(addCourseModal);
      addCourseForm.reset();
      
      // Show success message
      showSuccessMessage(`Course "${name}" added successfully!`);
      
      // Reset button
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    } catch (error) {
      console.error('Error adding course:', error);
      showErrorMessage('Failed to add course. Please try again.');
    }
  });
}

// Render courses in the courses section
function renderCourses(courses) {
  if (!coursesList) return;
  
  if (courses.length === 0) {
    coursesList.innerHTML = `
      <div class="no-data-message">
        <p>No courses found. Try a different search or filter.</p>
      </div>
    `;
    return;
  }
  
  coursesList.innerHTML = '';
  
  courses.forEach(course => {
    const courseCard = document.createElement('div');
    courseCard.className = 'course-card';
    courseCard.innerHTML = `
      <div class="course-code">${course.code}</div>
      <h3 class="course-name">${course.name}</h3>
      <p class="course-description">${course.description || 'No description available.'}</p>
      <div class="course-stats">
        <span id="sessions-count-${course.id}">0 Sessions</span>
        <span id="revisions-count-${course.id}">0 Revisions</span>
      </div>
    `;
    
    // Add click event to open course detail
    courseCard.addEventListener('click', () => {
      openCourseDetailModal(course);
    });
    
    coursesList.appendChild(courseCard);
    updateCourseStats(course.id);
  });
  
  // Update dashboard stats
  document.getElementById('courses-count').textContent = courses.length;
}

// Function to update course statistics displays
async function updateCourseStats(courseId) {
  try {
    // Fetch course statistics from Firebase
    const stats = await getCourseStats(courseId);
    
    // Update sessions count
    const sessionsElement = document.getElementById(`sessions-count-${courseId}`);
    if (sessionsElement) {
      const sessionCount = stats?.sessionCount || 0;
      sessionsElement.textContent = `${sessionCount} ${sessionCount === 1 ? 'Session' : 'Sessions'}`;
    }
    
    // Update revisions count
    const revisionsElement = document.getElementById(`revisions-count-${courseId}`);
    if (revisionsElement) {
      const totalRevisions = stats?.totalRevisions || 0;
      revisionsElement.textContent = `${totalRevisions} ${totalRevisions === 1 ? 'Revision' : 'Revisions'}`;
    }
  } catch (error) {
    console.error(`Error updating stats for course ${courseId}:`, error);
  }
}

// Function to populate the study course select dropdown
function populateStudyCourseSelect() {
  if (!studyCourseSelect) return;
  
  // Clear existing options
  studyCourseSelect.innerHTML = '';
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a course';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  studyCourseSelect.appendChild(defaultOption);
  
  // Add each course as an option
  allCourses.forEach(course => {
    const option = document.createElement('option');
    option.value = course.id;
    option.textContent = `${course.code}: ${course.name}`;
    studyCourseSelect.appendChild(option);
  });
}

// Function to render study sessions in the study buddy section
function renderStudySessions() {
  if (!studySessionsTable) return;
  
  // Filter sessions if needed
  const selectedCourse = studyCourseSelect ? studyCourseSelect.value : '';
  let filteredSessions = [...allSessions];
  
  if (selectedCourse) {
    filteredSessions = filteredSessions.filter(session => session.courseId === selectedCourse);
  }
  
  // Sort sessions by date (most recent first)
  filteredSessions.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (filteredSessions.length === 0) {
    studySessionsTable.innerHTML = `
      <tr>
        <td colspan="7" class="no-data-message">
          No study sessions found. Start recording your study sessions!
        </td>
      </tr>
    `;
    return;
  }
  
  studySessionsTable.innerHTML = '';
  
  filteredSessions.forEach(session => {
    // Find the course name
    const course = allCourses.find(c => c.id === session.courseId) || { code: 'Unknown', name: 'Unknown' };
    
    // Format date
    const date = new Date(session.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    // Create table row
    const row = document.createElement('tr');
    
    // Determine status button
    let statusButton = '';
    if (session.status === 'revised') {
      statusButton = `<button class="status-btn revised-btn" disabled>Revised</button>`;
    } else if (session.status === 'completed') {
      statusButton = `<button class="status-btn revision-btn" data-id="${session.id}">Ready for Revision</button>`;
    } else {
      statusButton = `<button class="status-btn complete-btn" data-id="${session.id}">Finish Studying</button>`;
    }
    
    row.innerHTML = `
      <td>${course.code}</td>
      <td>${session.type || 'lecture'}</td>
      <td>${session.topic || 'General'}</td>
      <td>${formattedDate}</td>
      <td>${session.duration} min</td>
      <td>${statusButton}</td>
      <td>
        <button class="action-btn detail-btn" data-id="${session.id}">
          <i class="fas fa-info-circle"></i>
        </button>
        <button class="action-btn delete-btn" data-id="${session.id}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    // Add event listeners to buttons
    const completeBtn = row.querySelector('.complete-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', async () => {
        try {
          // Update status to completed
          await updateSessionStatus(session.id, 'completed');
          
          // Update local data
          const index = allSessions.findIndex(s => s.id === session.id);
          if (index !== -1) {
            allSessions[index].status = 'completed';
            allSessions[index].completedAt = new Date().toISOString();
          }
          
          // Re-render
          renderStudySessions();
          showSuccessMessage('Session marked as completed!');
        } catch (error) {
          console.error('Error updating session:', error);
          showErrorMessage('Failed to update session status.');
        }
      });
    }
    
    const revisionBtn = row.querySelector('.revision-btn');
    if (revisionBtn) {
      revisionBtn.addEventListener('click', () => {
        openRecordRevisionModal(session.id);
      });
    }
    
    const detailBtn = row.querySelector('.detail-btn');
    detailBtn.addEventListener('click', () => {
      // Show session details
      const sessionDetails = {
        ...session,
        courseName: course.name,
        courseCode: course.code
      };
      openSessionDetailModal(sessionDetails);
    });
    
    const deleteBtn = row.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this study session?')) {
        try {
          await deleteSession(session.id);
          
          // Remove from local array
          const index = allSessions.findIndex(s => s.id === session.id);
          if (index !== -1) {
            allSessions.splice(index, 1);
          }
          
          // Re-render sessions
          renderStudySessions();
          showSuccessMessage('Study session deleted successfully!');
        } catch (error) {
          console.error('Error deleting session:', error);
          showErrorMessage('Failed to delete study session. Please try again.');
        }
      }
    });
    
    studySessionsTable.appendChild(row);
  });
}

// Function to initialize the dashboard with stats and charts
function initializeDashboard() {
  // Update count statistics
  const coursesCountElement = document.getElementById('courses-count');
  if (coursesCountElement) {
    coursesCountElement.textContent = allCourses.length || 0;
  }
  
  const sessionsCountElement = document.getElementById('sessions-count');
  if (sessionsCountElement) {
    sessionsCountElement.textContent = allSessions.length || 0;
  }
  
  // Calculate total study time
  const totalMinutes = allSessions.reduce((total, session) => total + (parseInt(session.duration) || 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  const studyTimeElement = document.getElementById('study-time');
  if (studyTimeElement) {
    studyTimeElement.textContent = `${hours}h ${minutes}m`;
  }
  
  // Count revisions
  const revisions = allSessions.reduce((total, session) => {
    return total + (session.revisions ? session.revisions.length : 0);
  }, 0);
  
  const revisionsCountElement = document.getElementById('revisions-count');
  if (revisionsCountElement) {
    revisionsCountElement.textContent = revisions;
  }
  
  // Initialize or update charts
  initializeActivityChart();
  initializeCourseDistributionChart();
}

// Function to initialize the activity chart on the dashboard
async function initializeActivityChart() {
  try {
    const activityChartElement = document.getElementById('activity-chart');
    if (!activityChartElement) return;
    
    // Get activity data for the last 7 days
    const activityData = await getDailyActivity(7);
    
    // If chart already exists, destroy it before creating a new one
    if (window.activityChart) {
      window.activityChart.destroy();
    }
    
    // Convert the activity data object to arrays for Chart.js
    const dates = Object.keys(activityData).sort();
    const labels = dates;
    const sessionData = dates.map(date => activityData[date]?.sessions || 0);
    const revisionData = dates.map(date => activityData[date]?.revisions || 0);
    
    // Create the chart
    window.activityChart = new Chart(activityChartElement, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Study Sessions',
            data: sessionData,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Revisions',
            data: revisionData,
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Count'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Your Study Activity'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error initializing activity chart:', error);
  }
}

// Function to initialize the course distribution chart on the dashboard
function initializeCourseDistributionChart() {
  try {
    const distributionChartElement = document.getElementById('course-distribution-chart');
    if (!distributionChartElement) return;
    
    // If chart already exists, destroy it before creating a new one
    if (window.distributionChart) {
      window.distributionChart.destroy();
    }
    
    // Create course-based data for distribution chart
    const courseMap = new Map();
    allSessions.forEach(session => {
      const course = allCourses.find(c => c.id === session.courseId);
      if (course) {
        const courseName = course.code;
        const minutes = parseInt(session.duration) || 0;
        
        if (courseMap.has(courseName)) {
          courseMap.set(courseName, courseMap.get(courseName) + minutes);
        } else {
          courseMap.set(courseName, minutes);
        }
      }
    });
    
    // Prepare data for the chart
    const courseLabels = Array.from(courseMap.keys());
    const courseMinutes = Array.from(courseMap.values());
    const backgroundColors = [
      'rgba(255, 99, 132, 0.5)',
      'rgba(54, 162, 235, 0.5)',
      'rgba(255, 206, 86, 0.5)',
      'rgba(75, 192, 192, 0.5)',
      'rgba(153, 102, 255, 0.5)',
      'rgba(255, 159, 64, 0.5)',
      'rgba(199, 199, 199, 0.5)'
    ];
    
    // Create the chart
    window.distributionChart = new Chart(distributionChartElement, {
      type: 'pie',
      data: {
        labels: courseLabels,
        datasets: [{
          data: courseMinutes,
          backgroundColor: backgroundColors.slice(0, courseLabels.length),
          borderColor: backgroundColors.map(color => color.replace('0.5', '1')),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: 'Study Time by Course'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const minutes = context.raw;
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return `${context.label}: ${hours}h ${mins}m`;
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error initializing course distribution chart:', error);
  }
}

// Setup the time range selectors in reports
function setupTimeRangeSelectors() {
  timeRangeButtons.forEach(button => {
    button.addEventListener('click', () => {
      timeRangeButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const range = button.getAttribute('data-range');
      updateReports(range);
    });
  });
}

// Function to update reports section with specified time range
function updateReports(timeRange = '7') {
  try {
    // Default to last 7 days if not specified
    const days = parseInt(timeRange) || 7;
    
    // Update activity chart with new time range
    updateActivityChart(days);
    
    // Update other reports as needed
    updateStudyStats(days);
  } catch (error) {
    console.error('Error updating reports:', error);
  }
}

// Function to update activity chart with specified time range
async function updateActivityChart(days) {
  try {
    const activityChartElement = document.getElementById('activity-chart');
    if (!activityChartElement) return;
    
    // Get activity data for the specified days
    const activityData = await getDailyActivity(days);
    
    // Convert the activity data object to arrays for Chart.js
    const dates = Object.keys(activityData).sort();
    const labels = dates;
    const sessionData = dates.map(date => activityData[date]?.sessions || 0);
    const revisionData = dates.map(date => activityData[date]?.revisions || 0);
    
    // If chart already exists, update its data
    if (window.activityChart) {
      // Update chart labels and datasets
      window.activityChart.data.labels = labels;
      window.activityChart.data.datasets[0].data = sessionData;
      window.activityChart.data.datasets[1].data = revisionData;
      
      // Update chart
      window.activityChart.update();
    } else {
      // Create new chart if it doesn't exist
      initializeActivityChart();
    }
  } catch (error) {
    console.error('Error updating activity chart:', error);
  }
}

// Function to update study statistics for the reports section
function updateStudyStats(days) {
  try {
    // Filter sessions based on date range
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    
    const filteredSessions = allSessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= startDate && sessionDate <= now;
    });
    
    // Calculate stats for the filtered sessions
    const sessionCount = filteredSessions.length;
    const totalMinutes = filteredSessions.reduce((total, session) => {
      return total + (parseInt(session.duration) || 0);
    }, 0);
    
    // Calculate average study time per day
    const avgMinutesPerDay = days > 0 ? Math.round(totalMinutes / days) : 0;
    
    // Update UI elements if they exist
    const periodSessionsElement = document.getElementById('period-sessions');
    if (periodSessionsElement) {
      periodSessionsElement.textContent = sessionCount;
    }
    
    const periodTimeElement = document.getElementById('period-time');
    if (periodTimeElement) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      periodTimeElement.textContent = `${hours}h ${minutes}m`;
    }
    
    const dailyAvgElement = document.getElementById('daily-avg');
    if (dailyAvgElement) {
      const avgHours = Math.floor(avgMinutesPerDay / 60);
      const avgMinutes = avgMinutesPerDay % 60;
      dailyAvgElement.textContent = `${avgHours}h ${avgMinutes}m`;
    }
  } catch (error) {
    console.error('Error updating study stats:', error);
  }
}

// Add this function to your existing event listeners setup
function setupCloseModals() {
  closeModalButtons.forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      closeModal(modal);
    });
  });
  
  // Close modal when clicking outside the content
  window.addEventListener('click', (e) => {
    document.querySelectorAll('.modal').forEach(modal => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });
}

// Setup study session form functionality
function setupStudySessionForm() {
  if (!studySessionForm || !addSessionModal) return;
  
  // Handle form submission
  studySessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const courseId = document.getElementById('study-course').value;
    const type = document.getElementById('session-type').value;
    const topic = document.getElementById('session-topic').value;
    const date = document.getElementById('session-date').value;
    const duration = document.getElementById('session-duration').value;
    const notes = document.getElementById('session-notes').value;
    
    // Validate inputs
    if (!courseId || !type || !topic || !date || !duration) {
      showErrorMessage('Please fill all required fields.');
      return;
    }
    
    try {
      // Show loading state
      const submitBtn = studySessionForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Saving...';
      submitBtn.disabled = true;
      
      // Add session to database with status
      const sessionData = { 
        type, 
        topic, 
        date, 
        duration, 
        notes,
        status: 'in_progress',
        createdAt: new Date().toISOString() 
      };
      
      const sessionId = await addSession(courseId, sessionData);
      
      // Add new session to the local array
      const newSession = { id: sessionId, courseId, ...sessionData };
      allSessions.push(newSession);
      
      // Update UI
      renderStudySessions();
      updateReports();
      
      // Close modal and reset form
      studySessionForm.reset();
      
      // Set default date to today in the form
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('session-date').value = today;
      
      // Show success message
      showSuccessMessage('Study session recorded successfully!');
      
      // Reset button
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    } catch (error) {
      console.error('Error adding session:', error);
      showErrorMessage('Failed to record study session. Please try again.');
    }
  });
  
  // Set default date to today when the form loads
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('session-date');
  if (dateInput) {
    dateInput.value = today;
  }
  
  // Setup Add Session Modal Form
  const addSessionForm = document.getElementById('add-session-form');
  if (addSessionForm) {
    // Populate course select
    const courseSelect = document.getElementById('add-session-course');
    if (courseSelect) {
      // Clear existing options
      courseSelect.innerHTML = '';
      
      // Add default option
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select a course';
      defaultOption.disabled = true;
      defaultOption.selected = true;
      courseSelect.appendChild(defaultOption);
      
      // Add course options
      allCourses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = `${course.code}: ${course.name}`;
        courseSelect.appendChild(option);
      });
    }
    
    // Set default date
    const modalDateInput = document.getElementById('add-session-date');
    if (modalDateInput) {
      modalDateInput.value = today;
    }
    
    // Handle form submission
    addSessionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Get form data
      const courseId = document.getElementById('add-session-course').value;
      const type = document.getElementById('add-session-type').value;
      const topic = document.getElementById('add-session-name').value;
      const date = document.getElementById('add-session-date').value;
      const duration = document.getElementById('add-session-duration').value;
      const notes = document.getElementById('add-session-notes').value;
      
      // Validate inputs
      if (!courseId || !type || !topic || !date || !duration) {
        showErrorMessage('Please fill all required fields.');
        return;
      }
      
      try {
        // Show loading state
        const submitBtn = addSessionForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;
        
        // Add session to database with status
        const sessionData = { 
          type, 
          topic, 
          date, 
          duration, 
          notes,
          status: 'in_progress',
          createdAt: new Date().toISOString() 
        };
        
        const sessionId = await addSession(courseId, sessionData);
        
        // Add new session to the local array
        const newSession = { id: sessionId, courseId, ...sessionData };
        allSessions.push(newSession);
        
        // Update UI
        renderStudySessions();
        updateReports();
        
        // Close modal and reset form
        closeModal(addSessionModal);
        addSessionForm.reset();
        
        // Reset date input to today
        if (modalDateInput) {
          modalDateInput.value = today;
        }
        
        // Show success message
        showSuccessMessage('Session added successfully!');
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      } catch (error) {
        console.error('Error adding session:', error);
        showErrorMessage('Failed to add session. Please try again.');
      }
    });
  }
}

// Setup course search and filtering functionality
function setupCourseSearch() {
  if (!courseSearch || !courseFilter || !searchBtn) return;
  
  // Handle search button click
  searchBtn.addEventListener('click', () => {
    const searchTerm = courseSearch.value.trim().toLowerCase();
    const filterValue = courseFilter.value;
    
    // Filter courses based on search term and filter
    let filteredCourses = [...allCourses];
    
    if (searchTerm) {
      filteredCourses = filteredCourses.filter(course => 
        course.code.toLowerCase().includes(searchTerm) ||
        course.name.toLowerCase().includes(searchTerm) ||
        course.description?.toLowerCase().includes(searchTerm)
      );
    }
    
    if (filterValue) {
      filteredCourses = filteredCourses.filter(course => 
        course.category === filterValue
      );
    }
    
    // Render filtered courses
    renderCourses(filteredCourses);
  });
  
  // Handle Enter key in search input
  courseSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });
  
  // Reset search and filter
  document.getElementById('reset-search-btn')?.addEventListener('click', () => {
    courseSearch.value = '';
    courseFilter.value = '';
    renderCourses(allCourses);
  });
  
  // Populate category filter
  populateCategoryFilter();
}

// Function to populate category filter dropdown
function populateCategoryFilter() {
  if (!courseFilter) return;
  
  // Get unique categories
  const categories = [...new Set(allCourses.map(course => course.category).filter(Boolean))];
  
  // Clear existing options (except the default one)
  const defaultOption = courseFilter.querySelector('option[value=""]');
  courseFilter.innerHTML = '';
  
  if (defaultOption) {
    courseFilter.appendChild(defaultOption);
  } else {
    // Add default option if it doesn't exist
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'All Categories';
    courseFilter.appendChild(option);
  }
  
  // Add each category as an option
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    courseFilter.appendChild(option);
  });
}

// Function to set up AI chat functionality
function setupAIChat() {
  if (!aiInput || !aiSendBtn || !aiChatMessages) return;
  
  // Handle send button click
  aiSendBtn.addEventListener('click', () => {
    const message = aiInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    addChatMessage('user', message);
    
    // Clear input
    aiInput.value = '';
    
    // Generate AI response (basic implementation)
    setTimeout(() => {
      generateAIResponse(message);
    }, 500);
  });
  
  // Handle Enter key in input
  aiInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      aiSendBtn.click();
    }
  });
  
  // Add initial welcome message
  setTimeout(() => {
    addChatMessage('ai', 'Hello! I\'m your Study Buddy AI assistant. How can I help with your studies today?');
  }, 1000);
}

// Function to add a message to the chat
function addChatMessage(sender, message) {
  if (!aiChatMessages) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender}-message`;
  
  // Format the message with markdown-like syntax
  let formattedMessage = message;
  
  // Replace **text** with <strong>text</strong>
  formattedMessage = formattedMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Replace *text* with <em>text</em>
  formattedMessage = formattedMessage.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  messageDiv.innerHTML = `
    <div class="message-content">
      ${formattedMessage}
    </div>
    <div class="message-time">
      ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </div>
  `;
  
  aiChatMessages.appendChild(messageDiv);
  
  // Scroll to bottom
  aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

// Function to generate AI response (simple implementation)
function generateAIResponse(userMessage) {
  // Array of study-related responses
  const responses = [
    "That's a great question about studying! I recommend trying the Pomodoro technique - 25 minutes of focused study followed by a 5-minute break.",
    "Based on research, spaced repetition is one of the most effective study techniques. Try reviewing material at increasing intervals.",
    "Remember to take care of your wellbeing too! Regular breaks, hydration, and sleep are crucial for effective studying.",
    "Have you tried creating summary notes? Condensing information helps reinforce your understanding.",
    "Mind maps can be very effective for connecting concepts and seeing the bigger picture in your studies.",
    "Active recall (testing yourself) is much more effective than passive reviewing. Try to quiz yourself on the material!",
    "Teaching concepts to others, even imaginary students, is a great way to solidify your understanding.",
    "Remember that consistency beats intensity - studying a little each day is better than cramming before exams.",
    "I suggest creating flashcards for key terms and concepts. They're perfect for quick reviews throughout the day.",
    "Don't forget to connect new information to things you already know. Building these connections strengthens memory."
  ];
  
  // Simple keyword matching
  let response;
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('tired') || lowerMessage.includes('exhausted') || lowerMessage.includes('break')) {
    response = "It sounds like you might need a break! Research shows that taking regular breaks improves study efficiency. Try a 15-minute break with some light physical activity.";
  } else if (lowerMessage.includes('motivat') || lowerMessage.includes('procrastinat')) {
    response = "Motivation can be challenging! Try breaking down your work into smaller, more manageable tasks, and reward yourself after completing them. Remember why you started this journey in the first place.";
  } else if (lowerMessage.includes('memoriz') || lowerMessage.includes('remember')) {
    response = "For better memorization, try techniques like spaced repetition, active recall, or the memory palace technique. Also, teaching the material to someone else (or pretending to) can significantly improve retention!";
  } else if (lowerMessage.includes('exam') || lowerMessage.includes('test')) {
    response = "For exam preparation, make sure to practice with past papers, create summary sheets of key concepts, and test yourself regularly. Also, simulating exam conditions during practice can help reduce anxiety on the actual day.";
  } else {
    // Random response if no keywords match
    response = responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Add AI response to chat
  addChatMessage('ai', response);
}

// Function to open a modal
function openModal(modal) {
  console.log('Opening modal:', modal);
  
  if (!modal) {
    console.error('Modal element is null or undefined');
    return;
  }
  
  // Add active class to show modal
  modal.classList.add('active');
  console.log('Added active class to modal');
  
  // Add class to body to prevent scrolling
  document.body.classList.add('modal-open');
}

// Function to close a modal
function closeModal(modal) {
  if (!modal) return;
  
  // Remove active class to hide modal
  modal.classList.remove('active');
  
  // Remove class from body to enable scrolling
  document.body.classList.remove('modal-open');
}

// Function to open record revision modal
function openRecordRevisionModal(sessionId) {
  if (!recordRevisionModal || !recordRevisionForm) return;
  
  currentSessionId = sessionId;
  
  // Set up the form submission handler
  recordRevisionForm.onsubmit = async (e) => {
    e.preventDefault();
    
    // Get revision data
    const duration = document.getElementById('revision-duration').value;
    const notes = document.getElementById('revision-notes').value;
    
    if (!duration) {
      showErrorMessage('Please enter the revision duration.');
      return;
    }
    
    try {
      // Show loading state
      const submitBtn = recordRevisionForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Saving...';
      submitBtn.disabled = true;
      
      // Record revision data
      const revisionData = {
        duration,
        notes,
        date: new Date().toISOString()
      };
      
      await addRevision(currentSessionId, revisionData);
      
      // Update session status
      await updateSessionStatus(currentSessionId, 'revised');
      
      // Update local data
      const sessionIndex = allSessions.findIndex(s => s.id === currentSessionId);
      if (sessionIndex !== -1) {
        if (!allSessions[sessionIndex].revisions) {
          allSessions[sessionIndex].revisions = [];
        }
        allSessions[sessionIndex].revisions.push(revisionData);
        allSessions[sessionIndex].status = 'revised';
        allSessions[sessionIndex].revisedAt = new Date().toISOString();
      }
      
      // Close modal and reset form
      closeModal(recordRevisionModal);
      recordRevisionForm.reset();
      
      // Update UI
      renderStudySessions();
      updateReports();
      
      // Show success message
      showSuccessMessage('Revision recorded successfully!');
      
      // Reset button
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    } catch (error) {
      console.error('Error recording revision:', error);
      showErrorMessage('Failed to record revision. Please try again.');
    }
  };
  
  // Open the modal
  openModal(recordRevisionModal);
}

// Function to open course detail modal
function openCourseDetailModal(course) {
  console.log('Opening course detail modal for:', course);
  
  if (!courseDetailModal) {
    console.error('Course detail modal element not found!');
    return;
  }
  
  // Update modal content with course details
  const courseDetailContent = document.getElementById('course-detail-content');
  
  if (!courseDetailContent) {
    console.error('Course detail content element not found!');
    return;
  }
  
  courseDetailContent.innerHTML = `
    <h2 class="modal-title">${course.code}: ${course.name}</h2>
    <div class="course-detail">
      <p class="course-description">${course.description || 'No description available.'}</p>
      <div class="course-meta">
        <p><strong>Category:</strong> ${course.category || 'Uncategorized'}</p>
      </div>
      
      <div class="course-actions">
        <button id="manage-lectures-labs-btn" class="btn primary-btn">
          <i class="fas fa-book-reader"></i> Manage Lectures & Labs
        </button>
        <button id="delete-course-btn" class="btn danger-btn">
          <i class="fas fa-trash"></i> Delete Course
        </button>
      </div>
      
      <div class="course-stats-detail">
        <h4>Course Statistics</h4>
        <div id="course-detail-stats-${course.id}" class="stats-grid">
          <div class="loading-spinner"><span class="loader"></span> Loading stats...</div>
        </div>
      </div>
      
      <div class="recent-sessions">
        <h4>Recent Study Sessions</h4>
        <div id="recent-sessions-list" class="recent-sessions-list">
          <div class="loading-spinner"><span class="loader"></span> Loading sessions...</div>
        </div>
      </div>
    </div>
  `;
  
  // Load course stats and sessions
  loadCourseDetailStats(course.id);
  
  // Add event listener to the Manage Lectures & Labs button
  const manageLecturesLabsBtn = document.getElementById('manage-lectures-labs-btn');
  if (manageLecturesLabsBtn) {
    manageLecturesLabsBtn.addEventListener('click', () => {
      openManageLecturesLabsModal(course);
    });
  }
  
  // Add event listener to the Delete Course button
  const deleteCourseBtn = document.getElementById('delete-course-btn');
  if (deleteCourseBtn) {
    deleteCourseBtn.addEventListener('click', () => {
      confirmDeleteCourse(course);
    });
  }
  
  // Open the modal
  openModal(courseDetailModal);
}

// Function to load detailed statistics for a course
async function loadCourseDetailStats(courseId) {
  try {
    const statsContainer = document.getElementById(`course-detail-stats-${courseId}`);
    if (!statsContainer) return;
    
    // Show loading indicator
    statsContainer.innerHTML = '<div class="loading-container" style="text-align: center; padding: 20px;"><span class="loader"></span><p>Loading statistics...</p></div>';
    
    // Set a timeout to prevent long loading
    const statsPromise = new Promise(async (resolve, reject) => {
      try {
        // Get course statistics from Firebase
        const stats = await getCourseStats(courseId);
        resolve(stats);
      } catch (error) {
        reject(error);
      }
    });
    
    // Add a timeout to avoid UI freezing
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Loading stats timed out')), 10000);
    });
    
    // Race the promises to handle timeout
    const stats = await Promise.race([statsPromise, timeoutPromise]).catch(error => {
      console.error('Error loading stats:', error);
      return {
        sessionCount: 0,
        lectureCount: 0,
        labCount: 0,
        totalRevisions: 0
      };
    });
    
    // Filter sessions for this course
    const courseSessions = allSessions.filter(session => session.courseId === courseId);
    
    // Calculate statistics
    const sessionCount = stats?.sessionCount || 0;
    const lectureCount = stats?.lectureCount || 0;
    const labCount = stats?.labCount || 0;
    const totalCount = sessionCount + lectureCount + labCount;
    
    const totalRevisions = stats?.totalRevisions || 0;
    const studiedLectureCount = stats?.studiedLectureCount || 0;
    const revisedLectureCount = stats?.revisedLectureCount || 0;
    const studiedLabCount = stats?.studiedLabCount || 0;
    const revisedLabCount = stats?.revisedLabCount || 0;
    
    const totalMinutes = courseSessions.reduce((total, session) => total + (parseInt(session.duration) || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    // Calculate average session length
    const avgSessionLength = sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0;
    const avgHours = Math.floor(avgSessionLength / 60);
    const avgMinutes = avgSessionLength % 60;
    
    // Generate HTML for statistics
    statsContainer.innerHTML = `
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">${sessionCount}</span>
          <span class="stat-label">Study Sessions</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${lectureCount}</span>
          <span class="stat-label">Lectures</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${labCount}</span>
          <span class="stat-label">Labs</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${totalRevisions}</span>
          <span class="stat-label">Total Revisions</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${hours}h ${minutes}m</span>
          <span class="stat-label">Total Study Time</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${avgHours}h ${avgMinutes}m</span>
          <span class="stat-label">Avg. Session Length</span>
        </div>
      </div>
      
      <div class="additional-stats">
        <h5>Progress Breakdown</h5>
        <div class="progress-stats">
          <div class="progress-item">
            <span class="progress-label">Lectures Studied:</span>
            <span class="progress-value">${studiedLectureCount}/${lectureCount}</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${lectureCount > 0 ? (studiedLectureCount / lectureCount) * 100 : 0}%"></div>
            </div>
          </div>
          <div class="progress-item">
            <span class="progress-label">Lectures Revised:</span>
            <span class="progress-value">${revisedLectureCount}/${lectureCount}</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${lectureCount > 0 ? (revisedLectureCount / lectureCount) * 100 : 0}%"></div>
            </div>
          </div>
          <div class="progress-item">
            <span class="progress-label">Labs Studied:</span>
            <span class="progress-value">${studiedLabCount}/${labCount}</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${labCount > 0 ? (studiedLabCount / labCount) * 100 : 0}%"></div>
            </div>
          </div>
          <div class="progress-item">
            <span class="progress-label">Labs Revised:</span>
            <span class="progress-value">${revisedLabCount}/${labCount}</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${labCount > 0 ? (revisedLabCount / labCount) * 100 : 0}%"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="recent-sessions">
        <h4>Recent Sessions</h4>
        ${await generateRecentSessionsList(courseSessions)}
      </div>
    `;
  } catch (error) {
    console.error(`Error loading course detail stats for ${courseId}:`, error);
    const statsContainer = document.getElementById(`course-detail-stats-${courseId}`);
    if (statsContainer) {
      statsContainer.innerHTML = '<p class="error-message">Failed to load statistics. Please try again.</p>';
    }
  }
}

// Helper function to generate HTML for recent sessions list
async function generateRecentSessionsList(sessions) {
  if (!sessions || sessions.length === 0) {
    return '<p>No study sessions recorded yet.</p>';
  }
  
  // Sort sessions by date (most recent first) and take the 5 most recent
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  
  let html = '<ul class="recent-sessions-list">';
  
  recentSessions.forEach(session => {
    // Format date
    const date = new Date(session.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    html += `
      <li>
        <span class="session-date">${formattedDate}</span>
        <span class="session-duration">${session.duration} min</span>
        <span class="session-topic">${session.topic || 'General'}</span>
      </li>
    `;
  });
  
  html += '</ul>';
  return html;
}

// Function to open session detail modal
function openSessionDetailModal(session) {
  if (!courseDetailModal) return;
  
  const courseDetailContent = document.getElementById('course-detail-content');
  if (!courseDetailContent) return;
  
  // Format date
  const date = new Date(session.date);
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Get status text
  let statusText = 'In Progress';
  let statusClass = 'in-progress';
  
  if (session.status === 'completed') {
    statusText = 'Completed';
    statusClass = 'completed';
  } else if (session.status === 'revised') {
    statusText = 'Revised';
    statusClass = 'revised';
  }
  
  // Get completion date if available
  let completionInfo = '';
  if (session.completedAt) {
    const completedDate = new Date(session.completedAt);
    const formattedCompletedDate = completedDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    completionInfo = `
      <div class="detail-group">
        <strong>Completed On:</strong> ${formattedCompletedDate}
      </div>
    `;
  }
  
  // Get revision date if available
  let revisionInfo = '';
  if (session.revisedAt) {
    const revisedDate = new Date(session.revisedAt);
    const formattedRevisedDate = revisedDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    revisionInfo = `
      <div class="detail-group">
        <strong>Revised On:</strong> ${formattedRevisedDate}
      </div>
    `;
  }
  
  // Populate modal content
  courseDetailContent.innerHTML = `
    <div class="session-detail-header">
      <h3>${session.topic}</h3>
      <span class="session-type ${session.type}">${session.type}</span>
      <span class="session-status ${statusClass}">${statusText}</span>
    </div>
    
    <div class="session-detail-content">
      <div class="detail-group">
        <strong>Course:</strong> ${session.courseCode} - ${session.courseName}
      </div>
      <div class="detail-group">
        <strong>Date Created:</strong> ${formattedDate}
      </div>
      <div class="detail-group">
        <strong>Study Duration:</strong> ${session.duration} minutes
      </div>
      ${completionInfo}
      ${revisionInfo}
      <div class="detail-group">
        <strong>Notes:</strong>
        <p>${session.notes || 'No notes provided.'}</p>
      </div>
    </div>
  `;
  
  // Open the modal
  openModal(courseDetailModal);
}

// Setup tabs for lectures and labs
function setupLecturesLabsTabs() {
  if (!tabButtons) return;
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Get the tab to show
      const tabToShow = button.getAttribute('data-tab');
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Show/hide tab content
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      
      document.getElementById(`${tabToShow}-tab`).classList.add('active');
    });
  });
}

// Setup add lecture form
function setupAddLectureForm() {
  if (!addLectureForm) return;
  
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('lecture-date');
  if (dateInput) {
    dateInput.value = today;
  }
  
  addLectureForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentCourse) {
      showErrorMessage('No course selected. Please try again.');
      return;
    }
    
    // Get form data
    const name = document.getElementById('lecture-name').value;
    const date = document.getElementById('lecture-date').value;
    const duration = document.getElementById('lecture-duration').value;
    const description = document.getElementById('lecture-description').value;
    
    try {
      // Show loading state
      const submitBtn = addLectureForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Saving...';
      submitBtn.disabled = true;
      
      // Add lecture to database
      const lectureData = {
        name,
        date,
        duration,
        description
      };
      
      await addLecture(currentCourse.id, lectureData);
      
      // Reset form
      addLectureForm.reset();
      
      // Set default date to today again
      if (dateInput) {
        dateInput.value = today;
      }
      
      // Show success message
      showSuccessMessage('Lecture added successfully!');
      
      // Refresh lectures list
      loadLecturesForCourse(currentCourse.id);
      
      // Reset button
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    } catch (error) {
      console.error('Error adding lecture:', error);
      showErrorMessage('Failed to add lecture. Please try again.');
    }
  });
}

// Setup add lab form
function setupAddLabForm() {
  if (!addLabForm) return;
  
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('lab-date');
  if (dateInput) {
    dateInput.value = today;
  }
  
  addLabForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentCourse) {
      showErrorMessage('No course selected. Please try again.');
      return;
    }
    
    // Get form data
    const name = document.getElementById('lab-name').value;
    const date = document.getElementById('lab-date').value;
    const duration = document.getElementById('lab-duration').value;
    const description = document.getElementById('lab-description').value;
    
    try {
      // Show loading state
      const submitBtn = addLabForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Saving...';
      submitBtn.disabled = true;
      
      // Add lab to database
      const labData = {
        name,
        date,
        duration,
        description
      };
      
      await addLab(currentCourse.id, labData);
      
      // Reset form
      addLabForm.reset();
      
      // Set default date to today again
      if (dateInput) {
        dateInput.value = today;
      }
      
      // Show success message
      showSuccessMessage('Lab added successfully!');
      
      // Refresh labs list
      loadLabsForCourse(currentCourse.id);
      
      // Reset button
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    } catch (error) {
      console.error('Error adding lab:', error);
      showErrorMessage('Failed to add lab. Please try again.');
    }
  });
}

// Setup mark as studied form
function setupMarkStudiedForm() {
  if (!markStudiedForm) return;
  
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('completion-date');
  if (dateInput) {
    dateInput.value = today;
  }
  
  markStudiedForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentItemId || !currentItemType) {
      showErrorMessage('No item selected. Please try again.');
      return;
    }
    
    // Get form data
    const completionDate = document.getElementById('completion-date').value;
    const completionTime = document.getElementById('completion-time').value;
    const notes = document.getElementById('completion-notes').value;
    
    try {
      // Show loading state
      const submitBtn = markStudiedForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Saving...';
      submitBtn.disabled = true;
      
      const studyData = {
        completionDate,
        completionTime,
        notes
      };
      
      if (currentItemType === 'lecture') {
        await markLectureAsStudied(currentItemId, studyData);
      } else if (currentItemType === 'lab') {
        await markLabAsStudied(currentItemId, studyData);
      }
      
      // Close modal and reset form
      closeModal(markStudiedModal);
      markStudiedForm.reset();
      
      // Set default date to today again
      if (dateInput) {
        dateInput.value = today;
      }
      
      // Show success message
      showSuccessMessage(`${currentItemType === 'lecture' ? 'Lecture' : 'Lab'} marked as studied!`);
      
      // Refresh lists
      if (currentItemType === 'lecture') {
        loadLecturesForCourse(currentCourse.id);
      } else if (currentItemType === 'lab') {
        loadLabsForCourse(currentCourse.id);
      }
      
      // Update course stats
      updateCourseStats(currentCourse.id);
      
      // Reload all course data to ensure stats are updated everywhere
      await reloadCourseData();
      
      // Reset button
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      
      // Reset currentItemId and currentItemType
      currentItemId = null;
      currentItemType = null;
    } catch (error) {
      console.error('Error marking as studied:', error);
      showErrorMessage('Failed to mark as studied. Please try again.');
    }
  });
}

// Function to setup mark as revised form
function setupMarkRevisedForm() {
  if (!markRevisedForm) return;
  
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('revision-date');
  if (dateInput) {
    dateInput.value = today;
  }
  
  markRevisedForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentItemId || !currentItemType) {
      showErrorMessage('No item selected. Please try again.');
      return;
    }
    
    // Get form data
    const revisionDate = document.getElementById('revision-date').value;
    const revisionTime = document.getElementById('revision-time').value;
    const notes = document.getElementById('revision-notes').value;
    
    try {
      // Show loading state
      const submitBtn = markRevisedForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Saving...';
      submitBtn.disabled = true;
      
      const revisionData = {
        revisionDate,
        revisionTime,
        notes
      };
      
      try {
        if (currentItemType === 'lecture') {
          await markLectureAsRevised(currentItemId, revisionData);
        } else if (currentItemType === 'lab') {
          await markLabAsRevised(currentItemId, revisionData);
        }
        
        // Close modal and reset form
        closeModal(markRevisedModal);
        markRevisedForm.reset();
        
        // Set default date to today again
        if (dateInput) {
          dateInput.value = today;
        }
        
        // Show success message
        showSuccessMessage(`${currentItemType === 'lecture' ? 'Lecture' : 'Lab'} marked as revised!`);
        
        // Refresh lists
        if (currentItemType === 'lecture') {
          loadLecturesForCourse(currentCourse.id);
        } else if (currentItemType === 'lab') {
          loadLabsForCourse(currentCourse.id);
        }
        
        // Update course stats to reflect the new revision
        updateCourseStats(currentCourse.id);
        
        // Reload all course data to ensure stats are updated everywhere
        await reloadCourseData();
      } catch (specificError) {
        // Handle the specific error from markAsRevised functions
        showErrorMessage(specificError.message);
      }
      
      // Reset button
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      
      // Reset currentItemId and currentItemType
      currentItemId = null;
      currentItemType = null;
    } catch (error) {
      console.error('Error marking as revised:', error);
      showErrorMessage('Failed to mark as revised. Please try again.');
    }
  });
}

// Function to load lectures for a course
async function loadLecturesForCourse(courseId) {
  if (!lecturesTable) return;
  
  // Show loading message
  showTableLoading(lecturesTable, 'Loading lectures...');
  
  try {
    // Get lectures for the course
    const lectures = await getLecturesForCourse(courseId);
    
    if (lectures.length === 0) {
      showNoDataMessage(lecturesTable, 'No lectures found. Add your first lecture above!');
      return;
    }
    
    // Clear existing content
    lecturesTable.innerHTML = '';
    
    // Add lectures to the table
    lectures.forEach(lecture => {
      const row = document.createElement('tr');
      
      // Format date
      const date = new Date(lecture.date);
      const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Format status
      let statusLabel = 'Pending';
      let statusClass = 'pending';
      
      if (lecture.status === 'studied') {
        statusLabel = 'Studied';
        statusClass = 'studied';
      } else if (lecture.status === 'revised') {
        const revisionCount = lecture.revisionCount || 1;
        statusLabel = `Revised (${revisionCount}x)`;
        statusClass = 'revised';
      }
      
      // Format completion time
      let completionInfo = '-';
      if (lecture.completionTime) {
        completionInfo = `${lecture.completionTime} min`;
        
        if (lecture.completionDate) {
          const completionDate = new Date(lecture.completionDate);
          const formattedCompletionDate = completionDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
          completionInfo += ` (${formattedCompletionDate})`;
        }
      }
      
      // Create action buttons based on status
      let actionButtons = '';
      
      if (lecture.status === 'pending') {
        actionButtons = `
          <button class="action-btn mark-studied-btn" data-id="${lecture.id}" title="Mark as Studied">
            <i class="fas fa-check"></i>
          </button>
        `;
      } else if (lecture.status === 'studied' || lecture.status === 'revised') {
        actionButtons = `
          <button class="action-btn mark-revised-btn" data-id="${lecture.id}" title="Mark as Revised">
            <i class="fas fa-sync-alt"></i>
          </button>
          <button class="action-btn view-details-btn" data-id="${lecture.id}" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
        `;
      }
      
      row.innerHTML = `
        <td>${lecture.name}</td>
        <td>${formattedDate}</td>
        <td>${lecture.duration} min</td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        <td>${completionInfo}</td>
        <td class="item-actions">${actionButtons}</td>
      `;
      
      // Add event listeners to action buttons
      const markStudiedBtn = row.querySelector('.mark-studied-btn');
      if (markStudiedBtn) {
        markStudiedBtn.addEventListener('click', () => {
          openMarkStudiedModal(lecture.id, 'lecture');
        });
      }
      
      const markRevisedBtn = row.querySelector('.mark-revised-btn');
      if (markRevisedBtn) {
        markRevisedBtn.addEventListener('click', () => {
          openMarkRevisedModal(lecture.id, 'lecture');
        });
      }

      const viewDetailsBtn = row.querySelector('.view-details-btn');
      if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', () => {
          openLectureDetailsModal(lecture);
        });
      }
      
      lecturesTable.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading lectures:', error);
    showNoDataMessage(lecturesTable, 'Error loading lectures. Please try again.');
  }
}

// Function to load labs for a course
async function loadLabsForCourse(courseId) {
  if (!labsTable) return;
  
  // Show loading message
  showTableLoading(labsTable, 'Loading labs...');
  
  try {
    // Get labs for the course
    const labs = await getLabsForCourse(courseId);
    
    if (labs.length === 0) {
      showNoDataMessage(labsTable, 'No labs found. Add your first lab above!');
      return;
    }
    
    // Clear existing content
    labsTable.innerHTML = '';
    
    // Add labs to the table
    labs.forEach(lab => {
      const row = document.createElement('tr');
      
      // Format date
      const date = new Date(lab.date);
      const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Format status
      let statusLabel = 'Pending';
      let statusClass = 'pending';
      
      if (lab.status === 'studied') {
        statusLabel = 'Studied';
        statusClass = 'studied';
      } else if (lab.status === 'revised') {
        const revisionCount = lab.revisionCount || 1;
        statusLabel = `Revised (${revisionCount}x)`;
        statusClass = 'revised';
      }
      
      // Format completion time
      let completionInfo = '-';
      if (lab.completionTime) {
        completionInfo = `${lab.completionTime} min`;
        
        if (lab.completionDate) {
          const completionDate = new Date(lab.completionDate);
          const formattedCompletionDate = completionDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
          completionInfo += ` (${formattedCompletionDate})`;
        }
      }
      
      // Create action buttons based on status
      let actionButtons = '';
      
      if (lab.status === 'pending') {
        actionButtons = `
          <button class="action-btn mark-studied-btn" data-id="${lab.id}" title="Mark as Studied">
            <i class="fas fa-check"></i>
          </button>
        `;
      } else if (lab.status === 'studied' || lab.status === 'revised') {
        actionButtons = `
          <button class="action-btn mark-revised-btn" data-id="${lab.id}" title="Mark as Revised">
            <i class="fas fa-sync-alt"></i>
          </button>
          <button class="action-btn view-details-btn" data-id="${lab.id}" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
        `;
      }
      
      row.innerHTML = `
        <td>${lab.name}</td>
        <td>${formattedDate}</td>
        <td>${lab.duration} min</td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        <td>${completionInfo}</td>
        <td class="item-actions">${actionButtons}</td>
      `;
      
      // Add event listeners to action buttons
      const markStudiedBtn = row.querySelector('.mark-studied-btn');
      if (markStudiedBtn) {
        markStudiedBtn.addEventListener('click', () => {
          openMarkStudiedModal(lab.id, 'lab');
        });
      }
      
      const markRevisedBtn = row.querySelector('.mark-revised-btn');
      if (markRevisedBtn) {
        markRevisedBtn.addEventListener('click', () => {
          openMarkRevisedModal(lab.id, 'lab');
        });
      }

      const viewDetailsBtn = row.querySelector('.view-details-btn');
      if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', () => {
          openLabDetailsModal(lab);
        });
      }
      
      labsTable.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading labs:', error);
    showNoDataMessage(labsTable, 'Error loading labs. Please try again.');
  }
}

// Function to open Mark as Studied modal
function openMarkStudiedModal(itemId, itemType) {
  if (!markStudiedModal || !markStudiedForm) return;
  
  // Store the current item id and type
  currentItemId = itemId;
  currentItemType = itemType;
  
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('completion-date');
  if (dateInput) {
    dateInput.value = today;
  }
  
  // Open the modal
  openModal(markStudiedModal);
}

// Function to open Mark as Revised modal
function openMarkRevisedModal(itemId, itemType) {
  if (!markRevisedModal || !markRevisedForm) return;
  
  // Store the current item id and type
  currentItemId = itemId;
  currentItemType = itemType;
  
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('revision-date');
  if (dateInput) {
    dateInput.value = today;
  }
  
  // Open the modal
  openModal(markRevisedModal);
}

// Function to open Manage Lectures & Labs modal
function openManageLecturesLabsModal(course) {
  if (!manageLecturesLabsModal) return;
  
  // Store the current course
  currentCourse = course;
  
  // Update modal title
  const modalTitle = document.getElementById('lectures-labs-modal-title');
  if (modalTitle) {
    modalTitle.textContent = `Manage Lectures & Labs: ${course.code} - ${course.name}`;
  }
  
  // Set default dates to today
  const today = new Date().toISOString().split('T')[0];
  
  const lectureDateInput = document.getElementById('lecture-date');
  if (lectureDateInput) {
    lectureDateInput.value = today;
  }
  
  const labDateInput = document.getElementById('lab-date');
  if (labDateInput) {
    labDateInput.value = today;
  }
  
  // Load lectures and labs for the course
  loadLecturesForCourse(course.id);
  loadLabsForCourse(course.id);
  
  // Open the modal
  openModal(manageLecturesLabsModal);
}

// Helper function to show loading in tables
function showTableLoading(tableElement, message = 'Loading...', colSpan = 6) {
  if (!tableElement) return;
  
  tableElement.innerHTML = `
    <tr>
      <td colspan="${colSpan}" style="text-align: center; padding: 20px;">
        <span class="loader"></span> ${message}
      </td>
    </tr>
  `;
}

// Helper function to show no data message in tables
function showNoDataMessage(tableElement, message, colSpan = 6) {
  if (!tableElement) return;
  
  tableElement.innerHTML = `
    <tr>
      <td colspan="${colSpan}" style="text-align: center; padding: 20px;">
        ${message}
      </td>
    </tr>
  `;
}

// Function to open lecture details modal
function openLectureDetailsModal(lecture) {
  const detailsModal = document.getElementById('item-details-modal');
  if (!detailsModal) return;
  
  const modalContent = detailsModal.querySelector('.modal-content');
  if (!modalContent) return;
  
  // Get revision details
  const revisions = lecture.revisions || [];
  const revisionCount = lecture.revisionCount || 0;
  
  // Format status
  let statusLabel = 'Pending';
  let statusClass = 'pending';
  
  if (lecture.status === 'studied') {
    statusLabel = 'Studied';
    statusClass = 'studied';
  } else if (lecture.status === 'revised') {
    statusLabel = `Revised (${revisionCount}x)`;
    statusClass = 'revised';
  }
  
  // Format study completion time
  let studyInfo = '';
  if (lecture.completionTime && lecture.completionDate) {
    const completionDate = new Date(lecture.completionDate);
    const formattedCompletionDate = completionDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    studyInfo = `
      <div class="detail-section">
        <h4>Study Details</h4>
        <div class="detail-item">
          <span class="detail-label">Completion Date:</span>
          <span class="detail-value">${formattedCompletionDate}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Time Spent:</span>
          <span class="detail-value">${lecture.completionTime} minutes</span>
        </div>
        ${lecture.studyNotes ? `
          <div class="detail-item">
            <span class="detail-label">Study Notes:</span>
            <div class="detail-notes">${formatNotes(lecture.studyNotes)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // Format revisions history
  let revisionsHistory = '';
  if (revisionCount > 0 && revisions.length > 0) {
    let revisionsList = '';
    
    // Sort revisions by date (newest first)
    const sortedRevisions = [...revisions].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    sortedRevisions.forEach((revision, index) => {
      const revisionDate = new Date(revision.timestamp);
      const formattedRevisionDate = revisionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      revisionsList += `
        <div class="revision-item">
          <div class="revision-header">
            <span class="revision-number">Revision #${index + 1}</span>
            <span class="revision-date">${formattedRevisionDate}</span>
          </div>
          <div class="revision-details">
            <div class="detail-item">
              <span class="detail-label">Time Spent:</span>
              <span class="detail-value">${revision.time} minutes</span>
            </div>
            ${revision.notes ? `
              <div class="detail-item">
                <span class="detail-label">Revision Notes:</span>
                <div class="detail-notes">${formatNotes(revision.notes)}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    revisionsHistory = `
      <div class="detail-section revisions-history">
        <h4>Revision History (${revisionCount})</h4>
        <div class="revisions-list">
          ${revisionsList}
        </div>
      </div>
    `;
  }
  
  // Update modal content
  modalContent.innerHTML = `
    <div class="modal-header">
      <h3>Lecture Details</h3>
      <span class="close-modal">&times;</span>
    </div>
    <div class="modal-body">
      <div class="item-details">
        <div class="item-title">
          <h2>${lecture.name}</h2>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>
        
        <div class="detail-section">
          <h4>Lecture Information</h4>
          <div class="detail-item">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${formatDate(lecture.date)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">${lecture.duration} minutes</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Topic:</span>
            <span class="detail-value">${lecture.topic || 'Not specified'}</span>
          </div>
          ${lecture.notes ? `
            <div class="detail-item">
              <span class="detail-label">Notes:</span>
              <div class="detail-notes">${formatNotes(lecture.notes)}</div>
            </div>
          ` : ''}
        </div>
        
        ${studyInfo}
        ${revisionsHistory}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn close-btn">Close</button>
      ${lecture.status === 'studied' || lecture.status === 'revised' ? `
        <button class="btn primary-btn mark-revised-btn" data-id="${lecture.id}">
          <i class="fas fa-sync-alt"></i> Mark Revised
        </button>
      ` : ''}
    </div>
  `;
  
  // Add event listeners
  const closeBtn = modalContent.querySelector('.close-modal');
  const closeButton = modalContent.querySelector('.close-btn');
  const markRevisedBtn = modalContent.querySelector('.mark-revised-btn');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeModal(detailsModal));
  }
  
  if (closeButton) {
    closeButton.addEventListener('click', () => closeModal(detailsModal));
  }
  
  if (markRevisedBtn) {
    markRevisedBtn.addEventListener('click', () => {
      closeModal(detailsModal);
      openMarkRevisedModal(lecture.id, 'lecture');
    });
  }
  
  // Open modal
  openModal(detailsModal);
}

// Function to open lab details modal
function openLabDetailsModal(lab) {
  const detailsModal = document.getElementById('item-details-modal');
  if (!detailsModal) return;
  
  const modalContent = detailsModal.querySelector('.modal-content');
  if (!modalContent) return;
  
  // Get revision details
  const revisions = lab.revisions || [];
  const revisionCount = lab.revisionCount || 0;
  
  // Format status
  let statusLabel = 'Pending';
  let statusClass = 'pending';
  
  if (lab.status === 'studied') {
    statusLabel = 'Studied';
    statusClass = 'studied';
  } else if (lab.status === 'revised') {
    statusLabel = `Revised (${revisionCount}x)`;
    statusClass = 'revised';
  }
  
  // Format study completion time
  let studyInfo = '';
  if (lab.completionTime && lab.completionDate) {
    const completionDate = new Date(lab.completionDate);
    const formattedCompletionDate = completionDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    studyInfo = `
      <div class="detail-section">
        <h4>Study Details</h4>
        <div class="detail-item">
          <span class="detail-label">Completion Date:</span>
          <span class="detail-value">${formattedCompletionDate}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Time Spent:</span>
          <span class="detail-value">${lab.completionTime} minutes</span>
        </div>
        ${lab.studyNotes ? `
          <div class="detail-item">
            <span class="detail-label">Study Notes:</span>
            <div class="detail-notes">${formatNotes(lab.studyNotes)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // Format revisions history
  let revisionsHistory = '';
  if (revisionCount > 0 && revisions.length > 0) {
    let revisionsList = '';
    
    // Sort revisions by date (newest first)
    const sortedRevisions = [...revisions].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    sortedRevisions.forEach((revision, index) => {
      const revisionDate = new Date(revision.timestamp);
      const formattedRevisionDate = revisionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      revisionsList += `
        <div class="revision-item">
          <div class="revision-header">
            <span class="revision-number">Revision #${index + 1}</span>
            <span class="revision-date">${formattedRevisionDate}</span>
          </div>
          <div class="revision-details">
            <div class="detail-item">
              <span class="detail-label">Time Spent:</span>
              <span class="detail-value">${revision.time} minutes</span>
            </div>
            ${revision.notes ? `
              <div class="detail-item">
                <span class="detail-label">Revision Notes:</span>
                <div class="detail-notes">${formatNotes(revision.notes)}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    revisionsHistory = `
      <div class="detail-section revisions-history">
        <h4>Revision History (${revisionCount})</h4>
        <div class="revisions-list">
          ${revisionsList}
        </div>
      </div>
    `;
  }
  
  // Update modal content
  modalContent.innerHTML = `
    <div class="modal-header">
      <h3>Lab Details</h3>
      <span class="close-modal">&times;</span>
    </div>
    <div class="modal-body">
      <div class="item-details">
        <div class="item-title">
          <h2>${lab.name}</h2>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>
        
        <div class="detail-section">
          <h4>Lab Information</h4>
          <div class="detail-item">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${formatDate(lab.date)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">${lab.duration} minutes</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Topic:</span>
            <span class="detail-value">${lab.topic || 'Not specified'}</span>
          </div>
          ${lab.notes ? `
            <div class="detail-item">
              <span class="detail-label">Notes:</span>
              <div class="detail-notes">${formatNotes(lab.notes)}</div>
            </div>
          ` : ''}
        </div>
        
        ${studyInfo}
        ${revisionsHistory}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn close-btn">Close</button>
      ${lab.status === 'studied' || lab.status === 'revised' ? `
        <button class="btn primary-btn mark-revised-btn" data-id="${lab.id}">
          <i class="fas fa-sync-alt"></i> Mark Revised
        </button>
      ` : ''}
    </div>
  `;
  
  // Add event listeners
  const closeBtn = modalContent.querySelector('.close-modal');
  const closeButton = modalContent.querySelector('.close-btn');
  const markRevisedBtn = modalContent.querySelector('.mark-revised-btn');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeModal(detailsModal));
  }
  
  if (closeButton) {
    closeButton.addEventListener('click', () => closeModal(detailsModal));
  }
  
  if (markRevisedBtn) {
    markRevisedBtn.addEventListener('click', () => {
      closeModal(detailsModal);
      openMarkRevisedModal(lab.id, 'lab');
    });
  }
  
  // Open modal
  openModal(detailsModal);
}

// Helper function to format notes with line breaks
function formatNotes(notes) {
  return notes.replace(/\n/g, '<br>');
}

// Function to reload course data and refresh UI
async function reloadCourseData() {
  try {
    // Reload courses and sessions
    allCourses = await getCourses();
    allSessions = await getSessions();
    
    // Refresh UI components
    renderCourses(allCourses);
    renderStudySessions();
    
    // Update dashboard stats
    initializeDashboard();
  } catch (error) {
    console.error('Error reloading course data:', error);
  }
}

// Function to confirm and handle course deletion
function confirmDeleteCourse(course) {
  // Create a confirmation dialog
  const confirmModal = document.createElement('div');
  confirmModal.className = 'modal confirmation-modal';
  confirmModal.innerHTML = `
    <div class="modal-content">
      <h3>Delete Course</h3>
      <p>Are you sure you want to delete <strong>${course.code}: ${course.name}</strong>?</p>
      <p class="warning-text">This will permanently delete all lectures, labs, and study sessions associated with this course.</p>
      <div class="button-group">
        <button id="cancel-delete-btn" class="btn secondary-btn">Cancel</button>
        <button id="confirm-delete-btn" class="btn danger-btn">Delete</button>
      </div>
    </div>
  `;
  
  // Add modal to the document
  document.body.appendChild(confirmModal);
  
  // Show the confirmation modal
  confirmModal.style.display = 'flex';
  
  // Handle cancel button
  const cancelBtn = document.getElementById('cancel-delete-btn');
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(confirmModal);
  });
  
  // Handle confirm button
  const confirmBtn = document.getElementById('confirm-delete-btn');
  confirmBtn.addEventListener('click', async () => {
    try {
      // Show loading state
      confirmBtn.textContent = 'Deleting...';
      confirmBtn.disabled = true;
      
      // Delete course and related data
      const result = await deleteCourse(course.id);
      
      if (result) {
        // Remove course from local array
        allCourses = allCourses.filter(c => c.id !== course.id);
        
        // Update UI
        renderCourses(allCourses);
        populateStudyCourseSelect();
        
        // Close all modals
        document.body.removeChild(confirmModal);
        closeModal(courseDetailModal);
        
        // Show success message
        showSuccessMessage(`Course "${course.name}" has been deleted.`);
      } else {
        throw new Error('Failed to delete course');
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      confirmBtn.textContent = 'Delete';
      confirmBtn.disabled = false;
      showErrorMessage('Failed to delete course. Please try again.');
    }
  });
}

// Rest of your existing functions... 