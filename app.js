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
  updateSessionCompletionDetails,
  addLecture,
  addLab,
  getLecturesForCourse,
  getLabsForCourse,
  markLectureAsStudied,
  markLabAsStudied,
  markLectureAsRevised,
  markLabAsRevised,
  deleteCourse,
  db
} from './firebase-config.js';

// Import optimized database functions
import {
  getCachedCourses,
  getCachedSessions,
  getCachedLecturesForCourse,
  getCachedLabsForCourse,
  getCachedCourseStats,
  getCachedAllLabs,
  clearCache,
  prefetchCommonData
} from './firebase-helpers.js';

// Import motivational messages
import { generalMessages, studiedMessages, revisionMessages, newCourseMessages, newLectureMessages, newLabMessages } from './motivational-messages.js';

// DOM Elements
const navigationItems = document.querySelectorAll('.sidebar-nav li');
const contentSections = document.querySelectorAll('.content-section');
const coursesList = document.getElementById('courses-list');
const courseSearch = document.getElementById('course-search');
const courseFilter = document.getElementById('course-filter');
const searchBtn = document.getElementById('search-btn');
const studyCourseSelect = document.getElementById('study-course');
const sessionsFilterCourse = document.getElementById('sessions-filter-course');
const filterSessionsBtn = document.getElementById('filter-sessions-btn');
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
    
    // Add a slight delay to ensure all elements are fully loaded
    setTimeout(() => {
        updateUIWithData();
        
        // Use the URL hash to determine which section to show
        handleUrlHash();
        
        // Add event listeners for navigation to update URL hash
        setupHashNavigation();
    }, 500);
    
    // Listen for browser navigation (back/forward)
    window.addEventListener('popstate', handleUrlHash);
});

// Initialize the application
async function initializeApp() {
    try {
        console.log("Initializing app and prefetching data...");
        
        // Prefetch common data in the background
        try {
            prefetchCommonData();
        } catch (prefetchError) {
            console.error('Error prefetching data:', prefetchError);
        }
        
        // Initialize Firebase from firebase-config.js
        await fetchCourses();
        await fetchStudySessions();
        setupEventListeners();
        setupMobileResponsiveness();
        
        // Initialize dashboard with proper loading states
        initializeDashboard();
        
        // Ensure stats are updated
        updateStats();
        
        // Update UI components
        updateUIWithData();
        
        // Check URL hash for navigation
        handleUrlHash();
        
        // Apply iOS specific fixes
        applyIOSFixes();
    } catch (error) {
        console.error('Error initializing app:', error);
        showErrorMessage('Failed to initialize the app. Please try refreshing the page.');
    }
}

// Setup mobile responsiveness with hamburger menu
function setupMobileResponsiveness() {
    // Create hamburger menu button if it doesn't exist
    if (!document.getElementById('hamburger-menu')) {
        const hamburgerBtn = document.createElement('button');
        hamburgerBtn.id = 'hamburger-menu';
        hamburgerBtn.className = 'hamburger-btn';
        hamburgerBtn.innerHTML = '<i class="fas fa-bars"></i>';
        hamburgerBtn.setAttribute('aria-label', 'Toggle navigation menu');
        
        // Add hamburger button to the body instead of the sidebar to ensure top right positioning
        document.body.appendChild(hamburgerBtn);
    }
    
    // Setup hamburger menu event listener
    const hamburgerBtn = document.getElementById('hamburger-menu');
    if (hamburgerBtn) {
        // Remove any existing listeners to prevent duplicates
        hamburgerBtn.removeEventListener('click', toggleSidebar);
        // Add click listener
        hamburgerBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event from propagating
            toggleSidebar();
        });
    }
    
    // Handle navigation items click in mobile view
    const navItems = document.querySelectorAll('.sidebar-nav li');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
    
    // Add click outside to close sidebar
    document.addEventListener('click', closeSidebarOnClickOutside);
    
    // Handle orientation change
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Create sidebar overlay if it doesn't exist
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        
        // Add click event to close sidebar when overlay is clicked
        overlay.addEventListener('click', closeSidebar);
    }
    
    // Sync streak counts between sidebar and mobile footer
    function syncStreakCount() {
        const sidebarStreakCount = document.getElementById('streak-count');
        const mobileStreakCount = document.getElementById('mobile-streak-count');
        
        if (sidebarStreakCount && mobileStreakCount) {
            // Initial sync
            mobileStreakCount.textContent = sidebarStreakCount.textContent;
            
            // Set up a mutation observer to keep them in sync
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'characterData' || mutation.type === 'childList') {
                        mobileStreakCount.textContent = sidebarStreakCount.textContent;
                    }
                });
            });
            
            // Observe the sidebar streak count for changes
            observer.observe(sidebarStreakCount, { 
                characterData: true, 
                childList: true,
                subtree: true 
            });
        }
    }
    
    // Call the sync function
    syncStreakCount();
    
    // Fix width constraints for mobile devices
    function fixMobileWidth() {
        // Ensure content doesn't overflow the viewport
        document.documentElement.style.setProperty('--max-mobile-width', window.innerWidth + 'px');
        
        // Add viewport meta tag if not present
        if (!document.querySelector('meta[name="viewport"]')) {
            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.head.appendChild(meta);
        }
    }
    
    // Call width fix on load and resize
    fixMobileWidth();
    window.addEventListener('resize', fixMobileWidth);
    
    // Handle resize events
    const handleResize = () => {
        try {
            const isMobile = window.innerWidth <= 768;
            const sidebar = document.querySelector('.sidebar');
            const sidebarNav = document.querySelector('.sidebar-nav');
            const mainContent = document.querySelector('.main-content');
            
            if (!sidebar) {
                console.log('Sidebar element not found');
                return;
            }
            
            if (isMobile) {
                // Adjust UI for mobile view
                document.body.classList.add('mobile-view');
                
                // Ensure sidebar is in column layout
                sidebar.style.flexDirection = 'column';
                
                // Handle sidebar navigation in mobile view
                if (typeof navItems !== 'undefined' && navItems.length > 0) {
                    navItems.forEach(item => {
                        const icon = item.querySelector('i');
                        if (icon) {
                            // Keep original text content
                            const text = item.textContent.trim();
                            
                            // Clear existing content
                            item.innerHTML = '';
                            
                            // Add icon back
                            item.appendChild(icon);
                            
                            // Add text in a span
                            const span = document.createElement('span');
                            span.textContent = text;
                            item.appendChild(span);
                            
                            // Add title attribute for accessibility
                            item.setAttribute('title', text);
                        }
                    });
                }
                
                // Always close sidebar when switching to mobile
                if (sidebarNav && sidebarNav.classList.contains('active')) {
                    // Keep sidebar open if it was active
                } else {
                    closeSidebar();
                }
                
                // Add touch feedback to navigation items
                navItems.forEach(item => {
                    item.addEventListener('touchstart', function() {
                        this.classList.add('touch-active');
                    });
                    
                    item.addEventListener('touchend', function() {
                        this.classList.remove('touch-active');
                    });
                });
                
                // Adjust modal positions for mobile
                adjustModalsForMobile();
                
                // Optimize charts for mobile
                adjustChartsForMobile();
                
                // Adjust forms for mobile
                adjustFormsForMobile();
            } else {
                // Desktop view
                document.body.classList.remove('mobile-view');
                
                // Reset sidebar styles for desktop
                sidebar.style.flexDirection = '';
                sidebar.style.width = '';
                
                if (sidebarNav) {
                    sidebarNav.classList.remove('active');
                    sidebarNav.style.display = '';
                }
                
                // Reset content styles
                if (mainContent) {
                    mainContent.style.marginLeft = '';
                }
                
                // Reset modals for desktop
                adjustModalsForDesktop();
                
                // Reset charts for desktop
                adjustChartsForDesktop();
                
                // Reset forms for desktop
                adjustFormsForDesktop();
            }
            
            // Always update chart responsiveness on resize
            updateChartsResponsiveness();
        } catch (error) {
            console.error('Error in handleResize function:', error);
        }
    };
    
    // Handle resize events with debouncing
    let resizeTimeout;
    window.removeEventListener('resize', debouncedResize); // Remove existing listener
    
    function debouncedResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 250); // Debounce resize events
    }
    
    window.addEventListener('resize', debouncedResize);
    
    // Initial call on load
    handleResize();
}

// Function to adjust modals for mobile
function adjustModalsForMobile() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.width = '90%';
            modalContent.style.maxHeight = '80vh';
            modalContent.style.overflowY = 'auto';
            modalContent.style.padding = '15px';
        }
    });
}

// Function to adjust modals for desktop
function adjustModalsForDesktop() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.width = '';
            modalContent.style.maxHeight = '';
            modalContent.style.overflowY = '';
            modalContent.style.padding = '';
        }
    });
}

// Function to adjust charts for mobile
function adjustChartsForMobile() {
    // Update chart options for mobile
    if (window.activityChart) {
        window.activityChart.options.maintainAspectRatio = false;
        window.activityChart.options.plugins.legend.position = 'bottom';
        window.activityChart.options.plugins.legend.display = true;
        window.activityChart.update();
    }
    
    if (window.courseDistributionChart) {
        window.courseDistributionChart.options.maintainAspectRatio = false;
        window.courseDistributionChart.options.plugins.legend.position = 'bottom';
        window.courseDistributionChart.update();
    }
    
    // Add min-height to chart containers
    document.querySelectorAll('.chart-container').forEach(container => {
        container.style.minHeight = '250px';
    });
}

// Function to adjust charts for desktop
function adjustChartsForDesktop() {
                if (window.activityChart) {
                    window.activityChart.options.maintainAspectRatio = true;
        window.activityChart.options.plugins.legend.position = 'top';
                    window.activityChart.update();
                }
                
    if (window.courseDistributionChart) {
        window.courseDistributionChart.options.maintainAspectRatio = true;
        window.courseDistributionChart.options.plugins.legend.position = 'right';
        window.courseDistributionChart.update();
    }
    
    // Reset chart container heights
    document.querySelectorAll('.chart-container').forEach(container => {
        container.style.minHeight = '';
    });
}

// Function to adjust forms for mobile
function adjustFormsForMobile() {
    // Make form elements full width on mobile
    document.querySelectorAll('input, select, textarea').forEach(element => {
        element.style.width = '100%';
        element.style.boxSizing = 'border-box';
    });
    
    // Adjust form groups to be vertical on mobile
    document.querySelectorAll('.form-group').forEach(group => {
        group.style.flexDirection = 'column';
        group.style.marginBottom = '15px';
    });
    
    // Adjust button sizing
    document.querySelectorAll('.btn').forEach(btn => {
        btn.style.padding = '12px 20px';
        btn.style.fontSize = '16px';
    });
}

// Function to adjust forms for desktop
function adjustFormsForDesktop() {
    // Reset form element widths
    document.querySelectorAll('input, select, textarea').forEach(element => {
        element.style.width = '';
        element.style.boxSizing = '';
    });
    
    // Reset form group layout
    document.querySelectorAll('.form-group').forEach(group => {
        group.style.flexDirection = '';
        group.style.marginBottom = '';
    });
    
    // Reset button sizing
    document.querySelectorAll('.btn').forEach(btn => {
        btn.style.padding = '';
        btn.style.fontSize = '';
    });
}

// Function to update chart responsiveness
function updateChartsResponsiveness() {
    if (window.activityChart) {
        window.activityChart.resize();
    }
    if (window.courseDistributionChart) {
        window.courseDistributionChart.resize();
    }
    // Update any other charts as needed
}

// Improved function to handle orientation change
function handleOrientationChange() {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Force redraw of charts after orientation change
        setTimeout(() => {
            updateChartsResponsiveness();
            
            // Ensure sidebar is closed in mobile landscape
            if (window.innerWidth < window.innerHeight) {
                // portrait
                closeSidebar();
            }
            
            // Re-adjust modals and forms
            adjustModalsForMobile();
            adjustFormsForMobile();
        }, 300); // Small delay to allow UI to settle
    }
}

// Function to initialize the activity chart on the dashboard
async function initializeActivityChart() {
  try {
    // Get the canvas element and check if it exists
    const canvasElement = document.getElementById('activity-chart');
    if (!canvasElement) {
      console.warn('Activity chart canvas not found in the DOM');
      return;
    }
    
    // If we don't have sessions data, fetch it
    if (!allSessions || !allSessions.length) {
      try {
        await fetchStudySessions();
      } catch (error) {
        console.error('Error fetching study sessions for activity chart:', error);
      }
    }
    
    if (!allSessions || !allSessions.length) {
      console.warn('No sessions data available for activity chart');
      canvasElement.parentElement.innerHTML = `
        <h3>Study Activity</h3>
        <div class="no-data-message">
          <p>No study sessions found. Start studying to see your activity!</p>
        </div>
      `;
      return;
    }
    
    // Process data for weekly activity chart
    const today = new Date();
    const lastWeekDates = [];
    
    // Generate the last 7 days (including today)
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      lastWeekDates.push(date);
    }
    
    // Format dates as labels and count study hours per day
    const labels = lastWeekDates.map(date => {
      const options = { weekday: 'short' };
      return new Intl.DateTimeFormat('en-US', options).format(date);
    });
    
    // Calculate study hours per day
    const studyHoursData = lastWeekDates.map(date => {
      const sessionsOnDate = allSessions.filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate.toDateString() === date.toDateString();
      });
      
      const totalMinutes = sessionsOnDate.reduce((sum, session) => {
        return sum + (parseInt(session.duration) || 0);
      }, 0);
      
      return totalMinutes / 60; // Convert minutes to hours
    });
    
    // Calculate revisions per day
    const revisionsData = lastWeekDates.map(date => {
      return allSessions.filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate.toDateString() === date.toDateString() && 
               (session.status === 'revised' || session.type === 'revision');
      }).length;
    });
    
    try {
      // Get the canvas context
      const ctx = canvasElement.getContext('2d');
      
      // Check if chart already exists and destroy it
      if (window.activityChart) {
        window.activityChart.destroy();
      }
      
      // Set responsive options based on screen size
      const isMobile = window.innerWidth <= 768;
      const chartHeight = isMobile ? 250 : 350; // Shorter height on mobile
      
      // Adjust canvas height for better mobile viewing
      canvasElement.height = chartHeight;
      
      // Create the chart
      window.activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Study Hours',
              data: studyHoursData,
              backgroundColor: 'rgba(106, 76, 147, 0.7)',
              borderColor: 'rgba(106, 76, 147, 1)',
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              label: 'Revisions',
              data: revisionsData,
              backgroundColor: 'rgba(255, 159, 64, 0.7)',
              borderColor: 'rgba(255, 159, 64, 1)',
              borderWidth: 1,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false, // Changed to false for better mobile control
          scales: {
            y: {
              beginAtZero: true,
              position: 'left',
              title: {
                display: !isMobile, // Hide title on mobile
                text: 'Hours'
              },
              grid: {
                display: !isMobile // Simplified grid on mobile
              }
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              grid: {
                drawOnChartArea: false
              },
              title: {
                display: !isMobile, // Hide title on mobile
                text: 'Revisions'
              }
            },
            x: {
              title: {
                display: !isMobile, // Hide title on mobile
                text: 'Day'
              },
              grid: {
                display: !isMobile // Simplified grid on mobile
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              position: isMobile ? 'bottom' : 'top', // Position legend at bottom on mobile
              labels: {
                boxWidth: isMobile ? 12 : 40, // Smaller legend boxes on mobile
                padding: isMobile ? 10 : 20
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const datasetLabel = context.dataset.label || '';
                  if (datasetLabel === 'Study Hours') {
                    return `${datasetLabel}: ${context.parsed.y.toFixed(1)}h`;
                  } else {
                    return `${datasetLabel}: ${context.parsed.y}`;
                  }
                }
              }
            }
          }
        }
      });
      
      // Set the container height to match the chart
      const chartContainer = canvasElement.parentElement;
      if (chartContainer) {
        chartContainer.style.height = `${chartHeight + 50}px`; // Extra space for heading
      }
      
    } catch (ctxError) {
      console.error('Error initializing chart context:', ctxError);
    }
  } catch (error) {
    console.error('Error initializing activity chart:', error);
  }
}

// Helper function to show loading indicators
function showLoading(elementId, message = 'Loading...') {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Add a data attribute to track loading start time
  const loadingStartTime = new Date().getTime();
  element.dataset.loadingStartTime = loadingStartTime;
  
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
    // For courses-list, we need special handling to preserve course cards and stats
    if (elementId === 'courses-list') {
      // Just add a loading overlay instead of replacing content
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'loading-overlay';
      loadingOverlay.innerHTML = `
        <div class="loading-container">
          <span class="loader"></span>
          <p>${message}</p>
        </div>
      `;
      
      // Style the overlay to cover the existing content
      loadingOverlay.style.position = 'absolute';
      loadingOverlay.style.top = '0';
      loadingOverlay.style.left = '0';
      loadingOverlay.style.width = '100%';
      loadingOverlay.style.height = '100%';
      loadingOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
      loadingOverlay.style.display = 'flex';
      loadingOverlay.style.justifyContent = 'center';
      loadingOverlay.style.alignItems = 'center';
      loadingOverlay.style.zIndex = '5';
      
      // Make sure the parent has position relative
      element.style.position = 'relative';
      
      // Add the overlay
      element.appendChild(loadingOverlay);
      
      // Set a timeout for this overlay specifically
      setTimeout(() => {
        // Remove the overlay if it still exists
        const overlay = element.querySelector('.loading-overlay');
        if (overlay) {
          element.removeChild(overlay);
        }
      }, 15000);
      
      // Return early since we're not replacing content
      return;
    }
    
    // Save current content if it's not empty and doesn't contain a loading indicator
    const hasContent = element.children.length > 0 && !element.querySelector('.loading-container');
    const savedContent = hasContent ? element.innerHTML : null;
    
    element.innerHTML = `
      <div class="loading-container" style="text-align: center; padding: 20px;">
        <span class="loader"></span>
        <p>${message}</p>
      </div>
    `;
    
    // Store the saved content in a data attribute
    if (savedContent) {
      element.dataset.savedContent = savedContent;
    }
  }
  
  // Set a timeout to clear loading indicators if they persist too long
  setTimeout(() => {
    const currentElement = document.getElementById(elementId);
    if (currentElement && currentElement.dataset.loadingStartTime == loadingStartTime) {
      // Loading indicator still exists and hasn't been updated since we set it
      
      // If we have saved content, restore it instead of showing the timeout message
      if (currentElement.dataset.savedContent) {
        currentElement.innerHTML = currentElement.dataset.savedContent;
        delete currentElement.dataset.savedContent;
        
        // Don't show the timeout message for courses list to avoid confusion
        if (elementId !== 'courses-list') {
          showSuccessMessage('Some data may not be up to date. Please refresh to try again.');
        }
        
        // Re-apply course stats if we're dealing with the courses list
        if (elementId === 'courses-list') {
          // Wait a small amount of time for the DOM to update
          setTimeout(() => {
            allCourses.forEach(course => {
              updateCourseStats(course.id);
            });
          }, 100);
        }
        
        return;
      }
      
      if (currentElement.tagName === 'TBODY') {
        currentElement.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 20px;">
              <p class="no-data-message">Loading timed out. Please refresh the page to try again.</p>
            </td>
          </tr>
        `;
      } else {
        currentElement.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <p class="no-data-message">Loading timed out. Please refresh the page to try again.</p>
          </div>
        `;
      }
    }
  }, 15000); // 15 seconds timeout
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
      // Safely remove element if it still exists and is still a child of body
      if (errorElement && errorElement.parentNode === document.body) {
        document.body.removeChild(errorElement);
      }
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
      // Safely remove element if it still exists and is still a child of body
      if (successElement && successElement.parentNode === document.body) {
        document.body.removeChild(successElement);
      }
    }, 500);
  }, 5000);
}

// Helper function to show motivational messages (updated to use celebration modal)
function showMotivationalMessage(messageType = 'general') {
  console.log(`Showing motivational message for: ${messageType}`);
  
  // Small delay to ensure DOM is ready and other operations are complete
  setTimeout(() => {
    try {
      // Show celebration modal
      showCelebrationModal(messageType);
    } catch (error) {
      console.error('Error in showMotivationalMessage:', error);
      // Fallback to a basic message
      showSuccessMessage('Success! Great work!');
    }
  }, 100);
}

// Helper function to show celebration modal with motivational message
function showCelebrationModal(messageType = 'general') {
  try {
    console.log('Attempting to show celebration modal for type:', messageType);
    
    // Ensure DOM is fully loaded
    if (document.readyState !== 'complete') {
      // If DOM is not fully loaded, try again after a short delay
      console.log('DOM not fully loaded, retrying in 300ms');
      setTimeout(() => showCelebrationModal(messageType), 300);
      return;
    }
    
    // Get modal elements
    const celebrationModal = document.getElementById('celebration-modal');
    const celebrationMessage = document.getElementById('celebration-message');
    const celebrationIcon = document.getElementById('celebration-icon');
    const celebrationButton = document.getElementById('celebration-button');
    
    // Check that all elements exist
    if (!celebrationModal || !celebrationMessage || !celebrationIcon || !celebrationButton) {
      console.error('Celebration modal elements not found', { 
        modal: !!celebrationModal, 
        message: !!celebrationMessage, 
        icon: !!celebrationIcon, 
        button: !!celebrationButton 
      });
      return;
    }
    
    // Determine the appropriate messages and icon
    let messages;
    let icon = 'fa-star';
    
    // Select the appropriate message array and icon based on the action type
    switch(messageType) {
      case 'studied':
        messages = studiedMessages;
        icon = 'fa-graduation-cap';
        break;
      case 'revised':
        messages = revisionMessages;
        icon = 'fa-sync';
        break;
      case 'newCourse':
        messages = newCourseMessages;
        icon = 'fa-book';
        break;
      case 'newLecture':
        messages = newLectureMessages;
        icon = 'fa-chalkboard-teacher';
        break;
      case 'newLab':
        messages = newLabMessages;
        icon = 'fa-flask';
        break;
      case 'general':
      default:
        messages = generalMessages;
        icon = 'fa-star';
        break;
    }
    
    // Ensure messages is defined, if not fall back to general
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.warn(`No messages found for type ${messageType}, using general messages`);
      messages = generalMessages;
    }
    
    // Get a random message from the selected array
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // Set message and icon
    celebrationMessage.textContent = randomMessage;
    celebrationIcon.innerHTML = `<i class="fas ${icon}"></i>`;
    
    // Create confetti elements
    createConfetti(celebrationModal);
    
    // Force repaint to ensure CSS transition works properly
    const forceRepaint = celebrationModal.offsetHeight;
    
    // Hide the modal first to reset animations
    celebrationModal.classList.remove('active');
    
    // Small timeout to ensure CSS transitions work properly
    setTimeout(() => {
      // Show the modal by adding the active class
      celebrationModal.classList.add('active');
      
      // Disable scrolling on body
      document.body.style.overflow = 'hidden';
      
      // Function to close the celebration modal
      const closeCelebrationModal = function() {
        celebrationModal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Remove confetti elements after closing
        const confettiElements = celebrationModal.querySelectorAll('.confetti');
        confettiElements.forEach(element => element.remove());
        
        // Remove event listeners
        celebrationButton.removeEventListener('click', closeCelebrationModal);
        celebrationModal.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('keydown', handleEscapeKey);
      };
      
      // Function to handle clicking outside the celebration container
      const handleOutsideClick = function(event) {
        const celebrationContainer = celebrationModal.querySelector('.celebration-container');
        if (event.target === celebrationModal && celebrationContainer && !celebrationContainer.contains(event.target)) {
          closeCelebrationModal();
        }
      };
      
      // Function to handle escape key press
      const handleEscapeKey = function(event) {
        if (event.key === 'Escape') {
          closeCelebrationModal();
        }
      };
      
      // Add event listeners for closing the modal
      celebrationButton.addEventListener('click', closeCelebrationModal);
      celebrationModal.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleEscapeKey);
      
      // Also update the motivation text in the sidebar
      const motivationText = document.querySelector('.motivation-text');
      if (motivationText) {
        motivationText.textContent = randomMessage;
      }
      
      // Auto-close after 8 seconds
      setTimeout(closeCelebrationModal, 8000);
    }, 50);
  } catch (error) {
    console.error('Error showing celebration modal:', error);
    // Try to show a basic success message as fallback
    showSuccessMessage('Success! Great job!');
  }
}

// Function to create confetti animation
function createConfetti(container) {
  // Remove any existing confetti
  const existingConfetti = container.querySelectorAll('.confetti');
  existingConfetti.forEach(element => element.remove());
  
  // Confetti colors
  const colors = [
    '#fd6c6c', // Red
    '#ffb366', // Orange
    '#fdfd66', // Yellow
    '#57fd66', // Green
    '#66d9fd', // Blue
    '#bd66fd', // Purple
    '#fd66d3'  // Pink
  ];
  
  // Confetti shapes
  const shapes = ['circle', 'square', 'triangle', 'star'];
  
  // Create random confetti pieces
  const confettiCount = 150;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    // Random shape
    const shapeIndex = Math.floor(Math.random() * shapes.length);
    confetti.classList.add(shapes[shapeIndex]);
    
    // Random position
    const startPositionX = Math.random() * 100;
    
    // Random size
    const size = Math.random() * 10 + 5;
    
    // Random color
    const colorIndex = Math.floor(Math.random() * colors.length);
    
    // Random animation duration
    const duration = Math.random() * 3 + 2;
    
    // Set styles
    confetti.style.left = `${startPositionX}%`;
    confetti.style.width = `${size}px`;
    confetti.style.height = `${size}px`;
    
    // Apply color based on shape
    if (shapes[shapeIndex] === 'triangle') {
      confetti.style.borderBottomColor = colors[colorIndex];
    } else {
      confetti.style.backgroundColor = colors[colorIndex];
    }
    
    confetti.style.animationDuration = `${duration}s`;
    
    // Add to container
    container.appendChild(confetti);
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
  setupClickableImages(); // Add this new function
  
  // Set up study course filter
  if (studyCourseSelect) {
    studyCourseSelect.addEventListener('change', function() {
      renderStudySessions();
    });
  }
  
  // Set up sessions filter
  if (filterSessionsBtn) {
    filterSessionsBtn.addEventListener('click', function(e) {
      e.preventDefault();
      renderStudySessions();
    });
  }
  
  if (sessionsFilterCourse) {
    // Also handle change to automatically filter
    sessionsFilterCourse.addEventListener('change', function() {
      renderStudySessions();
    });
  }
  
  // Mobile-specific event listeners
  if ('ontouchstart' in window) {
      // Add touch event listeners for better mobile experience
      const navItems = document.querySelectorAll('.sidebar-nav li');
      navItems.forEach(item => {
          item.addEventListener('touchstart', function() {
              this.classList.add('touch-active');
          });
          
          item.addEventListener('touchend', function() {
              this.classList.remove('touch-active');
              // Trigger the click event
              this.click();
          });
      });
      
      // Handle modals on mobile
      const modals = document.querySelectorAll('.modal');
      modals.forEach(modal => {
          modal.addEventListener('touchmove', function(e) {
              // Allow scrolling inside modal content but prevent background scrolling
              if (!e.target.closest('.modal-content')) {
                  e.preventDefault();
              }
          });
      });
  }
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
        // Get the active time range
        const activeTimeBtn = document.querySelector('.time-btn.active');
        const timeRange = activeTimeBtn ? activeTimeBtn.getAttribute('data-range') : 'week';
        updateReports(timeRange);
      } else if (sectionId === 'study-buddy') {
        renderStudySessions();
      } else if (sectionId === 'dashboard') {
        initializeDashboard();
      }
      
      // Close mobile menu if on mobile view
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
      
      // Scroll to top on mobile
      window.scrollTo(0, 0);
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
      
      // Show success message with motivational message
      showMotivationalMessage('newCourse');
      
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
  // Check if coursesList element exists
  if (!coursesList) {
    console.warn('coursesList element not found');
    return;
  }
  
  if (!courses || courses.length === 0) {
    coursesList.innerHTML = `
      <div class="no-data-message">
        <p>No courses found. Try a different search term or filter.</p>
        <p class="search-hint">Your search includes course name, description, lectures, labs, and revision notes.</p>
      </div>
    `;
    return;
  }
  
  // Define specific categories for courses
  const specificCategories = [
    { value: "BIOT", label: "Biotechnology" },
    { value: "PHBL", label: "Pharmacognosy" },
    { value: "PHCM", label: "Chemistry" },
    { value: "PHTC", label: "Pharmaceutics" },
    { value: "PHTX", label: "Pharmacology" },
    { value: "Other", label: "Other" }
  ];
  
  // Categorize courses before rendering
  const categorizedCourses = courses.map(course => {
    // Get course code
    const code = course.code || '';
    
    // Find matching category
    let categoryMatch = specificCategories.find(cat => 
      code.startsWith(cat.value)
    );
    
    if (categoryMatch) {
      course.category = categoryMatch.label;
      course.categoryValue = categoryMatch.value;
    } else {
      course.category = 'Other';
      course.categoryValue = 'Other';
    }
    
    return course;
  });
  
  // Store the existing course cards in a map to preserve stats
  const existingCourseCards = new Map();
  const courseCards = coursesList.querySelectorAll('.course-card');
  
  courseCards.forEach(card => {
    // Extract course ID from the stats elements
    const statsElement = card.querySelector('[id^="sessions-count-"]');
    if (statsElement) {
      const courseId = statsElement.id.replace('sessions-count-', '');
      existingCourseCards.set(courseId, card);
    }
  });
  
  // Clear the courses list
  coursesList.innerHTML = '';
  
  // Add each course card to the container
  categorizedCourses.forEach(course => {
    // Check if we already have this course card
    if (existingCourseCards.has(course.id)) {
      // Re-use the existing card to preserve stats
      coursesList.appendChild(existingCourseCards.get(course.id));
    } else {
      // Create a new card
      const courseCard = document.createElement('div');
      courseCard.className = 'course-card';
      courseCard.innerHTML = `
        <div class="course-code">${course.code}</div>
        <h3 class="course-name">${course.name}</h3>
        <p class="course-description">${course.description || 'No description available.'}</p>
        <div class="course-meta">
          <span class="course-category">${course.category || 'Other'}</span>
        </div>
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
    }
    
    // Always update the stats for each course
    updateCourseStats(course.id);
  });
  
  // Update dashboard stats - safely
  const coursesCountElement = document.getElementById('courses-count');
  if (coursesCountElement) {
    coursesCountElement.textContent = courses.length;
  }
  
  // Make course images clickable
  makeAllImagesClickable('.courses-grid');
}

// Function to update course statistics displays
async function updateCourseStats(courseId) {
    try {
        // First try to get the element
        const sessionsElement = document.getElementById(`sessions-count-${courseId}`);
        const revisionsElement = document.getElementById(`revisions-count-${courseId}`);
        
        // If the elements don't exist, the course card may have been removed, so stop here
        if (!sessionsElement || !revisionsElement) {
            console.warn(`Stats elements for course ${courseId} not found, skipping stats update`);
            return;
        }
        
        // Add a special data attribute to track if stats update is in progress to prevent duplicate calls
        if (sessionsElement.dataset.updating === 'true') {
            console.log(`Stats update for course ${courseId} already in progress, skipping`);
            return;
        }
        
        // Mark as updating
        sessionsElement.dataset.updating = 'true';
        
        // First try to get stats from sessions in memory if possible
        let sessionCount = 0;
        let totalRevisions = 0;
        
        if (allSessions && allSessions.length > 0) {
            // Count sessions for this course
            sessionCount = allSessions.filter(session => session.courseId === courseId).length;
            
            // Count revisions for sessions in this course
            totalRevisions = allSessions.reduce((total, session) => {
                if (session.courseId === courseId && session.revisions) {
                    return total + (parseInt(session.revisions) || 0);
                }
                return total;
            }, 0);
            
            // Update immediately with local data
            sessionsElement.textContent = `${sessionCount} ${sessionCount === 1 ? 'Session' : 'Sessions'}`;
            revisionsElement.textContent = `${totalRevisions} ${totalRevisions === 1 ? 'Revision' : 'Revisions'}`;
        }
        
        // Set up a timeout to limit how long we wait for Firebase
        const statsFetchPromise = getCourseStats(courseId);
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve({ sessionCount, totalRevisions }), 3000); // Use resolve with local data instead of reject
        });
        
        // Race the promises to handle timeout
        const stats = await Promise.race([statsFetchPromise, timeoutPromise])
            .catch(error => {
                console.error(`Error fetching stats for course ${courseId}:`, error);
                // Return default stats object on error
                return { sessionCount, totalRevisions };
            });
        
        // Update sessions count
        if (sessionsElement) {
            const count = stats?.sessionCount || 0;
            sessionsElement.textContent = `${count} ${count === 1 ? 'Session' : 'Sessions'}`;
            // Mark as no longer updating
            delete sessionsElement.dataset.updating;
        }
        
        // Update revisions count
        if (revisionsElement) {
            const revisions = stats?.totalRevisions || 0;
            revisionsElement.textContent = `${revisions} ${revisions === 1 ? 'Revision' : 'Revisions'}`;
        }
    } catch (error) {
        console.error(`Error updating stats for course ${courseId}:`, error);
        // Even on error, try to set default values if the elements exist
        const sessionsElement = document.getElementById(`sessions-count-${courseId}`);
        const revisionsElement = document.getElementById(`revisions-count-${courseId}`);
        
        if (sessionsElement) {
            sessionsElement.textContent = '0 Sessions';
            // Mark as no longer updating
            delete sessionsElement.dataset.updating;
        }
        
        if (revisionsElement) {
            revisionsElement.textContent = '0 Revisions';
        }
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
  
  // Also populate the sessions filter dropdown
  if (sessionsFilterCourse) {
    // Clear existing options except the first one (All Courses)
    while (sessionsFilterCourse.options.length > 1) {
      sessionsFilterCourse.remove(1);
    }
    
    // Add each course as an option
    allCourses.forEach(course => {
      const option = document.createElement('option');
      option.value = course.id;
      option.textContent = `${course.code}: ${course.name}`;
      sessionsFilterCourse.appendChild(option);
    });
  }
}

// Function to render study sessions in the study buddy section
function renderStudySessions() {
  // Make sure we have the table element
  if (!studySessionsTable) {
    console.warn('Study sessions table not found');
    return;
  }
  
  try {
    // Show loading indicator while we're processing
    showTableLoadingWithTimeout(studySessionsTable, 'Loading study sessions...', 7);
    
    // Filter sessions by course if filter is selected
    let selectedCourse = '';
    
    // Prioritize the dedicated filter if it exists
    if (sessionsFilterCourse) {
      selectedCourse = sessionsFilterCourse.value;
    } 
    // Fall back to the form dropdown if the filter doesn't exist
    else if (studyCourseSelect) {
      selectedCourse = studyCourseSelect.value;
    }
    
    let filteredSessions = Array.isArray(allSessions) ? [...allSessions] : [];
    
    if (selectedCourse) {
      filteredSessions = filteredSessions.filter(session => session.courseId === selectedCourse);
    }
    
    // Sort sessions by date (most recent first)
    filteredSessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // If we have no sessions to display, show a message
    if (!filteredSessions || filteredSessions.length === 0) {
      if (selectedCourse) {
        showNoDataMessage(studySessionsTable, 'No study sessions found for this course. Start recording your study sessions!', 7);
      } else {
        showNoDataMessage(studySessionsTable, 'No study sessions found. Start recording your study sessions!', 7);
      }
      return;
    }
    
    // Clear the table before adding new rows
    studySessionsTable.innerHTML = '';
    
    // Populate the table with sessions
    filteredSessions.forEach(session => {
      try {
        // Find the course for this session
        const course = allCourses.find(c => c.id === session.courseId) || { code: 'Unknown', name: 'Unknown' };
        
        // Format date
        const date = new Date(session.date);
        const formattedDate = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        
        // Calculate study time - if completed or revised
        const studyTime = parseInt(session.completionTime || 0);
        
        // Calculate total revision time from all revisions
        const revisionCount = parseInt(session.revisions || 0);
        const totalRevisionTime = parseInt(session.totalTime || 0);
        
        // Create table row
        const row = document.createElement('tr');
        
        // Determine status button
        let statusButton = '';
        if (session.status === 'revised') {
          statusButton = `<button class="status-btn revised-btn" data-id="${session.id}" data-count="${revisionCount}">Revised</button>`;
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
          <td>${studyTime} min</td>
          <td>${totalRevisionTime} min</td>
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
        setupSessionRowEventListeners(row, session);
        
        // Add the row to the table
        studySessionsTable.appendChild(row);
      } catch (rowError) {
        console.error('Error rendering session row:', rowError);
        // Continue to next session if there's an error with this one
      }
    });
  } catch (error) {
    console.error('Error rendering study sessions:', error);
    // Show error in the table
    showNoDataMessage(studySessionsTable, 'Error loading study sessions. Please refresh the page.', 7);
  }
}

// Helper function to set up event listeners for session row buttons
function setupSessionRowEventListeners(row, session) {
  // Complete button
  const completeBtn = row.querySelector('.complete-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      // Store the current session ID
      currentSessionId = session.id;
      
      // Open session completion modal
      const completionModal = document.getElementById('mark-studied-modal');
      if (completionModal) {
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('completion-date');
        if (dateInput) {
          dateInput.value = today;
        }
        
        // Set up form submission handler if not already set
        const completionForm = document.getElementById('mark-studied-form');
        if (completionForm) {
          completionForm.onsubmit = async (e) => {
            e.preventDefault();
            
            // Get completion data
            const completionDate = document.getElementById('completion-date').value;
            const completionTime = parseInt(document.getElementById('completion-time').value);
            const notes = document.getElementById('completion-notes').value;
            
            if (!completionTime) {
              showErrorMessage('Please enter the time taken to complete this session.');
              return;
            }
            
            try {
              // Show loading state
              const submitBtn = completionForm.querySelector('button[type="submit"]');
              if (!submitBtn) {
                console.error('Submit button not found');
                showErrorMessage('System error: Submit button not found.');
                return;
              }
              const originalText = submitBtn.textContent;
              submitBtn.textContent = 'Saving...';
              submitBtn.disabled = true;
              
              // Update status to completed
              await updateSessionStatus(currentSessionId, 'completed');
              
              // Create completion data object
              const completionData = {
                completionTime: completionTime,
                completionDate: completionDate ? new Date(completionDate) : new Date(),
                completionNotes: notes
              };
              
              // Update session with completion details using the Firebase function
              // This avoids direct Firestore usage which might be causing the error
              await updateSessionCompletionDetails(currentSessionId, completionData);
              
              // Update local data
              const index = allSessions.findIndex(s => s.id === currentSessionId);
              if (index !== -1) {
                allSessions[index].status = 'completed';
                allSessions[index].completedAt = new Date().toISOString();
                allSessions[index].completionTime = completionTime;
                allSessions[index].completionDate = completionDate ? new Date(completionDate).toISOString() : new Date().toISOString();
                allSessions[index].completionNotes = notes;
              }
              
              // Close modal and reset form
              closeModal(completionModal);
              completionForm.reset();
              
              // Re-render
              renderStudySessions();
              updateReports();
              
              // Show success message with motivational message
              showMotivationalMessage('studied');
              
              // Reset button
              if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
              }
            } catch (error) {
              console.error('Error updating session:', error);
              showErrorMessage('Failed to update session status.');
              // Reset button - moved inside the try block with null check
              const submitBtn = completionForm.querySelector('button[type="submit"]');
              if (submitBtn) {
                const originalText = submitBtn.textContent || 'Submit';
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
              }
            }
          };
        }
        
        // Open the modal
        openModal(completionModal);
      } else {
        // Fall back to simple status update if modal doesn't exist
        updateSessionWithoutModal(session.id);
      }
    });
  }
  
  // Helper function for simple update without modal
  async function updateSessionWithoutModal(sessionId) {
    try {
      // Update status to completed
      await updateSessionStatus(sessionId, 'completed');
      
      // Update local data
      const index = allSessions.findIndex(s => s.id === sessionId);
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
  }
  
  // Revision button for both new revisions and additional revisions
  const revisionBtn = row.querySelector('.revision-btn, .revised-btn');
  if (revisionBtn) {
    revisionBtn.addEventListener('click', () => {
      openRecordRevisionModal(session.id);
    });
  }
  
  // Detail button
  const detailBtn = row.querySelector('.detail-btn');
  if (detailBtn) {
    detailBtn.addEventListener('click', () => {
      // Show session details
      const sessionDetails = {
        ...session,
        courseName: allCourses.find(c => c.id === session.courseId)?.name || 'Unknown',
        courseCode: allCourses.find(c => c.id === session.courseId)?.code || 'Unknown'
      };
      openSessionDetailModal(sessionDetails);
    });
  }
  
  // Delete button
  const deleteBtn = row.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this study session? This action cannot be undone.')) {
        try {
          await deleteSession(session.id);
          
          // Remove from local data
          const index = allSessions.findIndex(s => s.id === session.id);
          if (index !== -1) {
            allSessions.splice(index, 1);
          }
          
          // Re-render
          renderStudySessions();
          showSuccessMessage('Session deleted successfully!');
        } catch (error) {
          console.error('Error deleting session:', error);
          showErrorMessage('Failed to delete session.');
        }
      }
    });
  }
}

// Function to initialize dashboard components
function initializeDashboard() {
  try {
    console.log('Initializing dashboard components...');
    
    // Show loading indicators for dashboard components
    document.querySelectorAll('.stat-card p').forEach(statEl => {
      statEl.innerHTML = '<span class="loader"></span> Loading...';
    });
    
    // Fetch fresh data first to ensure we have the latest
    Promise.all([
      fetchCourses().catch(err => {
        console.error('Error fetching courses for dashboard:', err);
        return allCourses || [];
      }),
      fetchStudySessions().catch(err => {
        console.error('Error fetching sessions for dashboard:', err);
        return allSessions || [];
      })
    ]).then(([courses, sessions]) => {
      // Update global variables
      allCourses = courses;
      allSessions = sessions;
      
      // Update all stats with fresh data
      updateStats();
      
      // Update recent activity section
      updateRecentActivity();
      
      // Initialize activity chart
      initializeActivityChart();
    }).catch(error => {
      console.error('Error loading dashboard data:', error);
      
      // Show error message but still try to display any available data
      showErrorMessage('Error loading some dashboard data. Showing available information.');
      
      // Update stats with whatever data we have
      updateStats();
    });
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    
    // Ensure we at least show zeros instead of loading indicators
    document.querySelectorAll('.stat-card p').forEach(statEl => {
      if (statEl.querySelector('.loader')) {
        statEl.innerHTML = '0';
      }
    });
  }
}

// Function to update recent activity section
async function updateRecentActivity() {
  try {
    const recentActivityContainer = document.querySelector('.activity-list');
    if (!recentActivityContainer) return;
    
    // Show loading
    recentActivityContainer.innerHTML = `<div class="loading-container"><span class="loader"></span><p>Loading recent activity...</p></div>`;
    
    // Ensure we have sessions data
    if (!allSessions || allSessions.length === 0) {
      recentActivityContainer.innerHTML = `<div class="no-data-message">No recent activity found.</div>`;
      return;
    }
    
    // Get the most recent sessions (limit to 5)
    const recentSessions = [...allSessions]
      .filter(session => session.date && isValidDate(session.date)) // Ensure date is valid
      .sort((a, b) => {
        // Use createdAt if available, fall back to date
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(a.date);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(b.date);
        return dateB - dateA; // Sort descending (newest first)
      })
      .slice(0, 5);
    
    if (recentSessions.length === 0) {
      recentActivityContainer.innerHTML = `<div class="no-data-message">No recent activity found.</div>`;
      return;
    }
    
    // Generate HTML for recent sessions
    let activityHTML = '';
    
    for (const session of recentSessions) {
      const courseId = session.courseId;
      // Find course name
      const course = allCourses.find(c => c.id === courseId);
      const courseName = course ? course.name || course.code : 'Unknown Course';
      
      // Format date - ensure it's valid first
      let formattedDate = 'Unknown Date';
      let timeAgo = '';
      
      if (isValidDate(session.date)) {
        const sessionDate = new Date(session.date);
        formattedDate = sessionDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        
        // Format time ago - use createdAt if available, otherwise use date
        const timeStamp = session.createdAt && isValidDate(session.createdAt) 
          ? session.createdAt 
          : session.date;
        
        timeAgo = getTimeAgo(timeStamp);
      } else {
        console.warn('Invalid date found in session:', session);
        formattedDate = 'Date unavailable';
        timeAgo = '';
      }
      
      // Determine icon based on session type
      let iconClass = 'fa-book';
      if (session.type === 'lab') {
        iconClass = 'fa-flask';
      } else if (session.type === 'revision') {
        iconClass = 'fa-sync';
      }
      
      activityHTML += `
        <div class="activity-item">
          <div class="activity-icon">
            <i class="fas ${iconClass}"></i>
          </div>
          <div class="activity-details">
            <div class="activity-title">${session.topic || 'Untitled Session'}</div>
            <div class="activity-subtitle">${courseName}</div>
            <div class="activity-info">${session.type || 'study'} · ${formattedDate} · ${session.duration || 0} mins</div>
          </div>
          <div class="activity-time">${timeAgo}</div>
        </div>
      `;
    }
    
    // Update the container
    recentActivityContainer.innerHTML = activityHTML;
    
    // Make activity items clickable to open session details
    document.querySelectorAll('.activity-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        openSessionDetailModal(recentSessions[index]);
      });
      
      // Add hover class for better feedback
      item.classList.add('clickable');
    });
  } catch (error) {
    console.error('Error updating recent activity:', error);
    const recentActivityContainer = document.querySelector('.activity-list');
    if (recentActivityContainer) {
      recentActivityContainer.innerHTML = `<div class="error-message">Error loading recent activity.</div>`;
    }
  }
}

// Helper function to check if a date string is valid
function isValidDate(dateString) {
  if (!dateString) return false;
  
  // Handle Firebase Timestamp objects
  if (typeof dateString === 'object' && dateString.toDate && typeof dateString.toDate === 'function') {
    return true;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

// Helper function to format time ago
function getTimeAgo(dateString) {
  if (!dateString || !isValidDate(dateString)) return '';
  
  // Handle Firebase Timestamp objects
  let date;
  if (typeof dateString === 'object' && dateString.toDate && typeof dateString.toDate === 'function') {
    date = dateString.toDate();
  } else {
    date = new Date(dateString);
  }
  
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHour < 24) {
    return `${diffHour}h ago`;
  } else if (diffDay < 7) {
    return `${diffDay}d ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
}

// Function to initialize the course distribution chart on the dashboard
function initializeCourseDistributionChart() {
  try {
    const distributionChartElement = document.getElementById('time-distribution-chart');
    if (!distributionChartElement) {
      console.warn('Course distribution chart element not found');
      return;
    }
    
    // If chart already exists, destroy it before creating a new one
    if (window.distributionChart) {
      window.distributionChart.destroy();
    }
    
    // Ensure we have sessions and courses data
    if (!allSessions || !allSessions.length || !allCourses || !allCourses.length) {
      console.warn('No sessions or courses data available for distribution chart');
      return;
    }
    
    // Create course-based data for distribution chart
    const courseMap = new Map();
    allSessions.forEach(session => {
      if (!session || !session.courseId) return;
      
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
    
    // If no valid data, exit
    if (!courseMap.size) {
      console.warn('No valid course data for distribution chart');
      return;
    }
    
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
    
    // Get the context safely
    const ctx = distributionChartElement.getContext('2d');
    if (!ctx) {
      console.warn('Failed to get canvas context for distribution chart');
      return;
    }
    
    // Create the chart
    window.distributionChart = new Chart(ctx, {
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
  const timeRangeButtons = document.querySelectorAll('.time-btn');
  if (!timeRangeButtons || timeRangeButtons.length === 0) return;
  
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
function updateReports(timeRange = 'week') {
  try {
    console.log('Updating reports with time range:', timeRange);
    
    // Convert time range to days
    let days = 7; // Default to week
    if (timeRange === 'month') {
      days = 30;
    } else if (timeRange === 'semester') {
      days = 120;
    }
    
    // Highlight the active time button
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-range') === timeRange) {
        btn.classList.add('active');
      }
    });
    
    // Ensure we have sessions and courses data
    if (!allSessions || !allCourses) {
      Promise.all([
        fetchStudySessions(),
        fetchCourses()
      ]).then(() => {
        initializeReportsCharts(days);
        generateReportInsights(days);
      }).catch(error => {
        console.error('Error fetching data for reports:', error);
        showErrorMessage('Error loading reports data. Please try again.');
      });
      return;
    }
    
    // Initialize or update charts
    initializeReportsCharts(days);
    
    // Update report insights section
    generateReportInsights(days);
  } catch (error) {
    console.error('Error updating reports:', error);
    // Show error message in reports section
    const reportSection = document.getElementById('reports');
    if (reportSection) {
      reportSection.querySelector('.reports-grid').innerHTML = `
        <div class="error-message">
          <p>Error loading reports data. Please try again.</p>
          <button class="secondary-btn retry-btn">Retry</button>
        </div>
      `;
      
      // Add retry button functionality
      const retryBtn = reportSection.querySelector('.retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          updateReports(timeRange);
        });
      }
    }
  }
}

// Function to initialize all reports charts
function initializeReportsCharts(days) {
  try {
    // Show loading indicators for report sections
    const reportSection = document.getElementById('reports');
    if (reportSection) {
      const reportCards = reportSection.querySelectorAll('.report-card');
      reportCards.forEach(card => {
        card.innerHTML = `<h3>${card.querySelector('h3').textContent}</h3><div class="loading-container"><span class="loader"></span><p>Loading...</p></div>`;
      });
    }
    
    // Initialize each chart
    initializeTimeDistributionChart(days);
    initializeRevisionChart(days);
    initializeSessionsByCourseChart(days);
    initializeProgressOverTimeChart(days);
  } catch (error) {
    console.error('Error initializing reports charts:', error);
  }
}

// Initialize the time distribution chart
function initializeTimeDistributionChart(days) {
  const chartCanvas = document.getElementById('time-distribution-chart');
  if (!chartCanvas) return;
  
  try {
    // Filter sessions based on date range
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    
    const filteredSessions = allSessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= startDate && sessionDate <= now;
    });
    
    // Calculate time spent per course
    const courseTimeMap = new Map();
    
    filteredSessions.forEach(session => {
      const { courseId, duration } = session;
      const mins = parseInt(duration) || 0;
      
      if (courseTimeMap.has(courseId)) {
        courseTimeMap.set(courseId, courseTimeMap.get(courseId) + mins);
      } else {
        courseTimeMap.set(courseId, mins);
      }
    });
    
    // Convert to arrays for chart
    const courseIds = Array.from(courseTimeMap.keys());
    const courseNames = courseIds.map(id => {
      const course = allCourses.find(c => c.id === id);
      return course ? (course.code || 'Unknown') : 'Unknown';
    });
    
    const courseTimes = courseIds.map(id => courseTimeMap.get(id));
    
    // Generate colors for each course
    const backgroundColors = courseIds.map((_, index) => {
      const hue = (index * 137.5) % 360; // Generate varied colors using golden angle
      return `hsla(${hue}, 70%, 60%, 0.7)`;
    });
    
    // If chart already exists, destroy it
    if (window.timeDistributionChart) {
      window.timeDistributionChart.destroy();
    }
    
    // Create new chart
    window.timeDistributionChart = new Chart(chartCanvas.getContext('2d'), {
      type: 'pie',
      data: {
        labels: courseNames,
        datasets: [{
          data: courseTimes,
          backgroundColor: backgroundColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 15,
              padding: 10
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw;
                const hours = Math.floor(value / 60);
                const minutes = value % 60;
                return `${context.label}: ${hours}h ${minutes}m`;
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error initializing time distribution chart:', error);
    chartCanvas.parentElement.innerHTML = `<h3>Study Time Distribution</h3><div class="error-message">Error loading chart</div>`;
  }
}

// Initialize the revision frequency chart
function initializeRevisionChart(days) {
  const chartCanvas = document.getElementById('revision-chart');
  if (!chartCanvas) return;
  
  try {
    // Filter sessions based on date range
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    
    // Create array of days for the x-axis
    const daysArray = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      daysArray.unshift(date);
    }
    
    // Format dates as labels
    const labels = daysArray.map(date => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    // Count revisions for each day
    const revisionCounts = daysArray.map(date => {
      return allSessions.filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate.toDateString() === date.toDateString() && 
               (session.status === 'revised' || session.type === 'revision');
      }).length;
    });
    
    // If chart already exists, destroy it
    if (window.revisionChart) {
      window.revisionChart.destroy();
    }
    
    // Create new chart
    window.revisionChart = new Chart(chartCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revisions',
          data: revisionCounts,
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error initializing revision chart:', error);
    chartCanvas.parentElement.innerHTML = `<h3>Revision Frequency</h3><div class="error-message">Error loading chart</div>`;
  }
}

// Initialize the sessions by course chart
function initializeSessionsByCourseChart(days) {
  const chartCanvas = document.getElementById('sessions-by-course-chart');
  if (!chartCanvas) return;
  
  try {
    // Filter sessions based on date range
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    
    const filteredSessions = allSessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= startDate && sessionDate <= now;
    });
    
    // Count sessions per course
    const courseSessionsMap = new Map();
    
    filteredSessions.forEach(session => {
      const courseId = session.courseId;
      
      if (courseSessionsMap.has(courseId)) {
        courseSessionsMap.set(courseId, courseSessionsMap.get(courseId) + 1);
      } else {
        courseSessionsMap.set(courseId, 1);
      }
    });
    
    // Convert to arrays for chart
    const courseIds = Array.from(courseSessionsMap.keys());
    const courseNames = courseIds.map(id => {
      const course = allCourses.find(c => c.id === id);
      return course ? (course.code || 'Unknown') : 'Unknown';
    });
    
    const sessionCounts = courseIds.map(id => courseSessionsMap.get(id));
    
    // Generate colors for each course
    const backgroundColors = courseIds.map((_, index) => {
      const hue = (index * 137.5) % 360; // Generate varied colors using golden angle
      return `hsla(${hue}, 70%, 60%, 0.7)`;
    });
    
    // If chart already exists, destroy it
    if (window.sessionsByCourseChart) {
      window.sessionsByCourseChart.destroy();
    }
    
    // Create new chart
    window.sessionsByCourseChart = new Chart(chartCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: courseNames,
        datasets: [{
          label: 'Study Sessions',
          data: sessionCounts,
          backgroundColor: backgroundColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error initializing sessions by course chart:', error);
    chartCanvas.parentElement.innerHTML = `<h3>Study Sessions by Course</h3><div class="error-message">Error loading chart</div>`;
  }
}

// Initialize the progress over time chart
function initializeProgressOverTimeChart(days) {
  const chartCanvas = document.getElementById('progress-over-time-chart');
  if (!chartCanvas) return;
  
  try {
    // Create array of days for the x-axis
    const now = new Date();
    const daysArray = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      daysArray.unshift(date);
    }
    
    // Format dates as labels
    const labels = daysArray.map(date => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    // Calculate cumulative study time for each day
    let cumulativeMinutes = 0;
    const cumulativeStudyTime = daysArray.map(date => {
      const dailyMinutes = allSessions
        .filter(session => {
          const sessionDate = new Date(session.date);
          return sessionDate <= date;
        })
        .reduce((total, session) => total + (parseInt(session.duration) || 0), 0);
      
      return dailyMinutes / 60; // Convert to hours
    });
    
    // If chart already exists, destroy it
    if (window.progressOverTimeChart) {
      window.progressOverTimeChart.destroy();
    }
    
    // Create new chart
    window.progressOverTimeChart = new Chart(chartCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cumulative Study Hours',
          data: cumulativeStudyTime,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2,
          tension: 0.1,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours'
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error initializing progress over time chart:', error);
    chartCanvas.parentElement.innerHTML = `<h3>Progress Over Time</h3><div class="error-message">Error loading chart</div>`;
  }
}

// New function to generate insights for the reports section
function generateReportInsights(days) {
  try {
    const insightsContainer = document.querySelector('.insights-container');
    if (!insightsContainer) return;
    
    // Show loading
    insightsContainer.innerHTML = `<div class="loading-container"><span class="loader"></span><p>Generating insights...</p></div>`;
    
    // Filter sessions based on date range
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    
    const filteredSessions = allSessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= startDate && sessionDate <= now;
    });
    
    // If no sessions in the period
    if (filteredSessions.length === 0) {
      insightsContainer.innerHTML = `
        <div class="insight-card">
          <h4>No Study Data Available</h4>
          <p>No study sessions found in the selected period. Start studying to see insights!</p>
        </div>
      `;
      return;
    }
    
    // Calculate insights
    const totalSessions = filteredSessions.length;
    const totalMinutes = filteredSessions.reduce((sum, session) => sum + (parseInt(session.duration) || 0), 0);
    const avgSessionLength = Math.round(totalMinutes / totalSessions);
    
    // Find most studied course
    const courseMap = new Map();
    filteredSessions.forEach(session => {
      const courseId = session.courseId;
      const duration = parseInt(session.duration) || 0;
      if (courseMap.has(courseId)) {
        courseMap.set(courseId, courseMap.get(courseId) + duration);
      } else {
        courseMap.set(courseId, duration);
      }
    });
    
    let mostStudiedCourseId = null;
    let maxTime = 0;
    
    for (const [courseId, time] of courseMap.entries()) {
      if (time > maxTime) {
        mostStudiedCourseId = courseId;
        maxTime = time;
      }
    }
    
    // Find course name
    let mostStudiedCourseName = 'Unknown';
    if (mostStudiedCourseId) {
      const course = allCourses.find(c => c.id === mostStudiedCourseId);
      if (course) {
        mostStudiedCourseName = course.name || course.code || 'Unknown';
      }
    }
    
    // Find most productive day
    const dayMap = new Map();
    filteredSessions.forEach(session => {
      const sessionDate = new Date(session.date);
      const day = sessionDate.toLocaleDateString('en-US', { weekday: 'long' });
      const duration = parseInt(session.duration) || 0;
      
      if (dayMap.has(day)) {
        dayMap.set(day, dayMap.get(day) + duration);
      } else {
        dayMap.set(day, duration);
      }
    });
    
    let mostProductiveDay = 'Unknown';
    maxTime = 0;
    
    for (const [day, time] of dayMap.entries()) {
      if (time > maxTime) {
        mostProductiveDay = day;
        maxTime = time;
      }
    }
    
    // Generate HTML for insights
    const insights = `
      <div class="insight-card">
        <h4>Study Overview</h4>
        <p>You completed <strong>${totalSessions}</strong> study sessions over <strong>${days}</strong> days.</p>
        <p>Total study time: <strong>${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m</strong></p>
      </div>
      
      <div class="insight-card">
        <h4>Session Analysis</h4>
        <p>Average session length: <strong>${Math.floor(avgSessionLength / 60)}h ${avgSessionLength % 60}m</strong></p>
        <p>Most studied course: <strong>${mostStudiedCourseName}</strong></p>
      </div>
      
      <div class="insight-card">
        <h4>Time Patterns</h4>
        <p>Most productive day: <strong>${mostProductiveDay}</strong></p>
      </div>
    `;
    
    // Update the insights container
    insightsContainer.innerHTML = insights;
  } catch (error) {
    console.error('Error generating report insights:', error);
    // Show error message
    const insightsContainer = document.querySelector('.insights-container');
    if (insightsContainer) {
      insightsContainer.innerHTML = `
        <div class="insight-card">
          <h4>Error Loading Insights</h4>
          <p>Failed to generate insights. Please try again later.</p>
        </div>
      `;
    }
  }
}

// New function to update course distribution for reports
function updateCourseDistributionForReports(days) {
  try {
    const courseDistributionElement = document.getElementById('course-distribution-chart');
    if (!courseDistributionElement) return;
    
    // Filter sessions based on date range
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    
    const filteredSessions = allSessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= startDate && sessionDate <= now;
    });
    
    // Calculate time spent per course
    const courseTimeMap = new Map();
    
    filteredSessions.forEach(session => {
      const { courseId, duration } = session;
      const mins = parseInt(duration) || 0;
      
      if (courseTimeMap.has(courseId)) {
        courseTimeMap.set(courseId, courseTimeMap.get(courseId) + mins);
      } else {
        courseTimeMap.set(courseId, mins);
      }
    });
    
    // Convert to arrays for chart
    const courseIds = Array.from(courseTimeMap.keys());
    const courseNames = courseIds.map(id => {
      const course = allCourses.find(c => c.id === id);
      return course ? (course.code || 'Unknown') : 'Unknown';
    });
    
    const courseTimes = courseIds.map(id => courseTimeMap.get(id));
    
    // Generate colors for each course
    const backgroundColors = courseIds.map((_, index) => {
      const hue = (index * 137.5) % 360; // Generate varied colors using golden angle
      return `hsla(${hue}, 70%, 60%, 0.7)`;
    });
    
    // If chart already exists, update it
    if (window.courseDistributionChart) {
      window.courseDistributionChart.data.labels = courseNames;
      window.courseDistributionChart.data.datasets[0].data = courseTimes;
      window.courseDistributionChart.data.datasets[0].backgroundColor = backgroundColors;
      window.courseDistributionChart.update();
    } else {
      // Create new chart
      window.courseDistributionChart = new Chart(courseDistributionElement.getContext('2d'), {
        type: 'pie',
        data: {
          labels: courseNames,
          datasets: [{
            data: courseTimes,
            backgroundColor: backgroundColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: window.innerWidth > 768,
          plugins: {
            legend: {
              position: window.innerWidth > 768 ? 'right' : 'bottom',
              labels: {
                boxWidth: 15,
                padding: 10
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const value = context.raw;
                  const hours = Math.floor(value / 60);
                  const minutes = value % 60;
                  return `${context.label}: ${hours}h ${minutes}m`;
                }
              }
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('Error updating course distribution chart:', error);
  }
}

// New function to update achievements for reports
function updateAchievementsForReports(days) {
  // Implementation will depend on how achievements are tracked in your app
  // This is a placeholder implementation
  console.log('Updating achievements for reports with days:', days);
}

// Function to update activity chart with specified time range
async function updateActivityChart(days) {
  try {
    const activityChartElement = document.getElementById('activity-chart');
    if (!activityChartElement) return;
    
    // Show loading state
    activityChartElement.style.opacity = '0.5';
    
    // Get activity data for the specified days - forcing a fresh fetch from database
    // Avoid using clearCache for 'dailyActivity' since it might not be registered
    const activityData = await getDailyActivity(days, true); // Pass true to force a fresh fetch
    
    // Convert the activity data object to arrays for Chart.js
    const dates = Object.keys(activityData).sort();
    const labels = dates.map(date => {
      // Format date for display (e.g., "Mon", "Tue", etc.)
      const dateObj = new Date(date);
      return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(dateObj);
    });
    
    const sessionData = dates.map(date => activityData[date]?.sessions || 0);
    const revisionData = dates.map(date => activityData[date]?.revisions || 0);
    
    // If chart already exists, update its data
    if (window.activityChart && window.activityChart.data) {
      // Update chart labels and datasets
      window.activityChart.data.labels = labels;
      if (window.activityChart.data.datasets && window.activityChart.data.datasets.length > 0) {
        if (window.activityChart.data.datasets[0]) {
          window.activityChart.data.datasets[0].data = sessionData;
        }
        if (window.activityChart.data.datasets.length > 1 && window.activityChart.data.datasets[1]) {
          window.activityChart.data.datasets[1].data = revisionData;
        } else if (window.activityChart.data.datasets.length === 1) {
          // Add the revisions dataset if it doesn't exist
          window.activityChart.data.datasets.push({
            label: 'Revisions',
            data: revisionData,
            backgroundColor: 'rgba(255, 159, 64, 0.7)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1
          });
        }
      }
      
      // Update chart
      window.activityChart.update();
    } else {
      // Create new chart if it doesn't exist
      try {
        window.activityChart = new Chart(activityChartElement.getContext('2d'), {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Study Sessions',
                data: sessionData,
                backgroundColor: 'rgba(106, 76, 147, 0.7)',
                borderColor: 'rgba(106, 76, 147, 1)',
                borderWidth: 1
              },
              {
                label: 'Revisions',
                data: revisionData,
                backgroundColor: 'rgba(255, 159, 64, 0.7)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: window.innerWidth > 768,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: window.innerWidth > 576,
                  text: 'Count'
                }
              },
              x: {
                title: {
                  display: window.innerWidth > 576,
                  text: 'Day'
                }
              }
            },
            plugins: {
              legend: {
                display: true,
                position: window.innerWidth > 768 ? 'top' : 'bottom'
              },
              tooltip: {
                callbacks: {
                  title: function(tooltipItems) {
                    return tooltipItems[0].label;
                  },
                  label: function(context) {
                    const label = context.dataset.label || '';
                    const value = context.parsed.y;
                    return `${label}: ${value}`;
                  }
                }
              }
            }
          }
        });
      } catch (chartError) {
        console.error('Error creating chart:', chartError);
      }
    }
    
    // Restore opacity
    activityChartElement.style.opacity = '1';
  } catch (error) {
    console.error('Error updating activity chart:', error);
    // Display error message in chart container
    const chartContainer = activityChartElement.closest('.chart-container');
    if (chartContainer) {
      const errorMessage = document.createElement('div');
      errorMessage.className = 'chart-error';
      errorMessage.innerHTML = 'Error loading chart data. Please try again.';
      chartContainer.appendChild(errorMessage);
    }
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
      
      // Clear cache to ensure fresh data next time
      clearCache('sessions');
      clearCache('courseStats');
      
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
        
        // Clear cache to ensure fresh data next time
        clearCache('sessions');
        clearCache('courseStats');
        
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
  searchBtn.addEventListener('click', async () => {
    const searchTerm = courseSearch.value.trim().toLowerCase();
    const filterValue = courseFilter.value;
    
    // Update button state
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    searchBtn.disabled = true;
    
    // Show loading state
    const coursesListElement = document.getElementById('courses-list');
    if (coursesListElement) {
      showLoading('courses-list', 'Searching in courses, lectures, and labs...');
    }
    
    // Basic filtering for course properties first
    let filteredCourses = [...allCourses];
    
    if (filterValue) {
      filteredCourses = filteredCourses.filter(course => 
        course.category === filterValue
      );
    }
    
    // If there's a search term, perform deeper content search
    if (searchTerm) {
      try {
        // First filter for basic course properties
        const basicFilteredCourses = filteredCourses.filter(course => 
          course.code.toLowerCase().includes(searchTerm) ||
          course.name.toLowerCase().includes(searchTerm) ||
          course.description?.toLowerCase().includes(searchTerm)
        );
        
        // Content search for remaining courses
        const contentSearchPromises = filteredCourses
          .filter(course => !basicFilteredCourses.includes(course)) // Skip courses already matched
          .map(async course => {
            try {
              // Check lectures
              const lectures = await getCachedLecturesForCourse(course.id);
              const lectureMatch = lectures.some(lecture => {
                // Check basic lecture properties
                const basicLectureMatch = 
                  lecture.name?.toLowerCase().includes(searchTerm) || 
                  lecture.completionNotes?.toLowerCase().includes(searchTerm) ||
                  lecture.topics?.toLowerCase().includes(searchTerm) ||
                  lecture.description?.toLowerCase().includes(searchTerm) ||
                  lecture.references?.toLowerCase().includes(searchTerm);
                
                if (basicLectureMatch) return true;
                
                // Check revision history if available
                if (lecture.revisions && Array.isArray(lecture.revisions)) {
                  return lecture.revisions.some(revision => 
                    revision.notes?.toLowerCase().includes(searchTerm)
                  );
                }
                
                return false;
              });
              
              if (lectureMatch) return course;
              
              // Check labs
              const labs = await getCachedLabsForCourse(course.id);
              const labMatch = labs.some(lab => {
                // Check basic lab properties
                const basicLabMatch = 
                  lab.name?.toLowerCase().includes(searchTerm) || 
                  lab.completionNotes?.toLowerCase().includes(searchTerm) ||
                  lab.description?.toLowerCase().includes(searchTerm) ||
                  lab.objectives?.toLowerCase().includes(searchTerm) ||
                  lab.procedures?.toLowerCase().includes(searchTerm) ||
                  lab.results?.toLowerCase().includes(searchTerm);
                
                if (basicLabMatch) return true;
                
                // Check revision history if available
                if (lab.revisions && Array.isArray(lab.revisions)) {
                  return lab.revisions.some(revision => 
                    revision.notes?.toLowerCase().includes(searchTerm)
                  );
                }
                
                return false;
              });
              
              if (labMatch) return course;
              
              // No match
              return null;
            } catch (error) {
              console.error(`Error searching content for course ${course.id}:`, error);
              return null;
            }
          });
        
        // Wait for all content search promises to resolve
        const contentMatchResults = await Promise.all(contentSearchPromises);
        
        // Combine the basic filtered courses with the content matches
        const contentMatchedCourses = contentMatchResults.filter(Boolean); // Remove null values
        filteredCourses = [...basicFilteredCourses, ...contentMatchedCourses];
      } catch (error) {
        console.error("Error in course content search:", error);
        // Fall back to basic filtering if error occurs
        filteredCourses = filteredCourses.filter(course => 
          course.code.toLowerCase().includes(searchTerm) ||
          course.name.toLowerCase().includes(searchTerm) ||
          course.description?.toLowerCase().includes(searchTerm)
        );
      }
    }
    
    // Render filtered courses
    renderCourses(filteredCourses);
    
    // Reset button state
    searchBtn.innerHTML = '<i class="fas fa-search"></i> Search';
    searchBtn.disabled = false;
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
  
  // Use the specified categories instead of dynamic detection
  const specificCategories = [
    { value: "BIOT", label: "Biotechnology" },
    { value: "PHBL", label: "Pharmacognosy" },
    { value: "PHCM", label: "Chemistry" },
    { value: "PHTC", label: "Pharmaceutics" },
    { value: "PHTX", label: "Pharmacology" },
    { value: "Other", label: "Other" }
  ];
  
  // Categorize courses based on their code prefix
  const categorizedCourses = allCourses.map(course => {
    // Get course code and determine category
    const code = course.code || '';
    let categoryMatch = specificCategories.find(cat => 
      code.startsWith(cat.value)
    );
    
    if (categoryMatch) {
      course.category = categoryMatch.label;
    } else {
      course.category = 'Other';
    }
    
    return course;
  });
  
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
  
  // Add each specific category as an option
  specificCategories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.value;
    option.textContent = category.label;
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
  try {
    if (!modal) {
      console.error('Modal element is null or undefined');
      return;
    }
    
    // Add active class to show modal
    modal.classList.add('active');
    
    // Add class to body to prevent scrolling
    document.body.classList.add('modal-open');
  } catch (error) {
    console.error('Error opening modal:', error);
  }
}

// Function to close a modal
function closeModal(modal) {
  try {
    if (!modal) {
      console.error('Modal element is null or undefined');
      return;
    }
    
    // Remove active class to hide modal
    modal.classList.remove('active');
    
    // Remove class from body to enable scrolling
    document.body.classList.remove('modal-open');
  } catch (error) {
    console.error('Error closing modal:', error);
  }
}

// Function to open record revision modal
function openRecordRevisionModal(sessionId) {
  if (!recordRevisionModal || !recordRevisionForm) return;
  
  currentSessionId = sessionId;
  
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('revision-date');
  if (dateInput) {
    dateInput.value = today;
  }
  
  // Set up the form submission handler
  recordRevisionForm.onsubmit = async (e) => {
    e.preventDefault();
    
    // Get revision data
    const revisionDate = document.getElementById('revision-date').value;
    const duration = parseInt(document.getElementById('revision-duration').value);
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
        date: revisionDate ? new Date(revisionDate).toISOString() : new Date().toISOString()
      };
      
      await addRevision(currentSessionId, revisionData);
      
      // Update session status
      await updateSessionStatus(currentSessionId, 'revised');
      
      // Update local data
      const sessionIndex = allSessions.findIndex(s => s.id === currentSessionId);
      if (sessionIndex !== -1) {
        if (!allSessions[sessionIndex].revisions) {
          allSessions[sessionIndex].revisions = 0;
        }
        allSessions[sessionIndex].revisions += 1;
        if (!allSessions[sessionIndex].totalTime) {
          allSessions[sessionIndex].totalTime = 0;
        }
        allSessions[sessionIndex].totalTime = parseInt(allSessions[sessionIndex].totalTime) + duration;
        allSessions[sessionIndex].status = 'revised';
        allSessions[sessionIndex].revisedAt = new Date().toISOString();
      }
      
      // Clear cache to ensure fresh data
      clearCache('sessions');
      clearCache('courseStats');
      
      // Close modal and reset form
      closeModal(recordRevisionModal);
      recordRevisionForm.reset();
      
      // Set default date to today again
      if (dateInput) {
        dateInput.value = today;
      }
      
      // Update UI
      renderStudySessions();
      updateReports();
      
      // Show success message with motivational message
      showMotivationalMessage('revised');
      
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
  try {
    // Check if the course object is valid
    if (!course || !course.id) {
      console.error('Invalid course object:', course);
      showErrorMessage('Failed to open course details. Invalid course data.');
      return;
    }

    // Get the modal element
    const courseDetailModal = document.getElementById('course-detail-modal');
    if (!courseDetailModal) {
      console.error('Course detail modal element not found!');
      showErrorMessage('Could not open course details. Interface element missing.');
      return;
    }
    
    // Get the content container inside the modal
    const courseDetailContent = document.getElementById('course-detail-content');
    if (!courseDetailContent) {
      console.error('Course detail content element not found!');
      showErrorMessage('Could not open course details. Interface element missing.');
      return;
    }
    
    // Define specific categories
    const specificCategories = [
      { value: "BIOT", label: "Biotechnology" },
      { value: "PHBL", label: "Pharmacognosy" },
      { value: "PHCM", label: "Chemistry" },
      { value: "PHTC", label: "Pharmaceutics" },
      { value: "PHTX", label: "Pharmacology" },
      { value: "Other", label: "Other" }
    ];
    
    // Make sure we have a valid category
    let category = course.category || 'Other';
    
    // If category needs to be determined
    if (!category || category === course.code) {
      const code = course.code || '';
      let categoryMatch = specificCategories.find(cat => 
        code.startsWith(cat.value)
      );
      
      if (categoryMatch) {
        category = categoryMatch.label;
      } else {
        category = 'Other';
      }
    }
  
    // Update modal content with course details
    courseDetailContent.innerHTML = `
      <h2 class="modal-title">${course.code}: ${course.name}</h2>
      <div class="course-detail">
        <p class="course-description">${course.description || 'No description available.'}</p>
        <div class="course-meta">
          <p><strong>Category:</strong> ${category}</p>
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
    
    // Load course stats
    loadCourseDetailStats(course.id);
    
    // Fetch and display recent sessions for this course
    const recentSessions = allSessions
      .filter(session => session.courseId === course.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    
    generateRecentSessionsList(recentSessions)
      .then(html => {
        const recentSessionsList = document.getElementById('recent-sessions-list');
        if (recentSessionsList) {
          recentSessionsList.innerHTML = html || '<p>No recent study sessions found for this course.</p>';
        }
      })
      .catch(error => {
        console.error('Error generating recent sessions list:', error);
        const recentSessionsList = document.getElementById('recent-sessions-list');
        if (recentSessionsList) {
          recentSessionsList.innerHTML = '<p>Error loading recent sessions.</p>';
        }
      });
    
    // Set up button event listeners
    const manageLecturesLabsBtn = document.getElementById('manage-lectures-labs-btn');
    if (manageLecturesLabsBtn) {
      manageLecturesLabsBtn.addEventListener('click', () => {
        openManageLecturesLabsModal(course);
      });
    }
    
    const deleteCourseBtn = document.getElementById('delete-course-btn');
    if (deleteCourseBtn) {
      deleteCourseBtn.addEventListener('click', () => {
        confirmDeleteCourse(course);
      });
    }
    
    // Open the modal
    openModal(courseDetailModal);
  } catch (error) {
    console.error('Error opening course detail modal:', error);
    showErrorMessage('Failed to open course details. Please try again.');
  }
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
        // Get course statistics using optimized cached function
        const stats = await getCachedCourseStats(courseId);
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
    const revisionCount = session.revisions || 0;
    statusText = `Revised (${revisionCount}x)`;
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
      <div class="detail-group">
        <strong>Study Time:</strong> ${session.completionTime || 0} minutes
      </div>
    `;
  }
  
  // Load all revisions for this session
  getRevisions(session.id)
    .then(revisionsData => {
      // Format revisions data
      let revisionsHtml = '';
      
      if (revisionsData && revisionsData.length > 0) {
        revisionsHtml = `
          <div class="revision-history">
            <h4>Revision History</h4>
            <table class="revisions-table">
              <thead>
                <tr>
                  <th>Revision #</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
        `;
        
        revisionsData.forEach((revision, index) => {
          const revDate = revision.date && revision.date.toDate ? 
            revision.date.toDate() : new Date(revision.date);
            
          const formattedRevDate = revDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          revisionsHtml += `
            <tr>
              <td>#${revisionsData.length - index}</td>
              <td>${formattedRevDate}</td>
              <td>${revision.duration} min</td>
              <td>${revision.notes || 'No notes'}</td>
            </tr>
          `;
        });
        
        revisionsHtml += `
              </tbody>
            </table>
            <div class="revision-summary">
              <div class="summary-item">
                <span class="summary-label">Total Revisions:</span>
                <span class="summary-value">${revisionsData.length}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Total Time Spent:</span>
                <span class="summary-value">${revisionsData.reduce((total, rev) => total + parseInt(rev.duration || 0), 0)} minutes</span>
              </div>
            </div>
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
            <strong>Estimated Duration:</strong> ${session.duration} minutes
          </div>
          ${completionInfo}
          <div class="detail-group">
            <strong>Notes:</strong>
            <p>${session.notes || 'No notes provided.'}</p>
          </div>
          ${revisionsHtml}
        </div>
        
        <div class="session-detail-actions">
          ${session.status === 'in_progress' ? `
            <button class="btn primary-btn complete-session-btn" data-id="${session.id}">Mark as Completed</button>
          ` : ''}
          ${session.status === 'completed' || session.status === 'revised' ? `
            <button class="btn primary-btn revise-session-btn" data-id="${session.id}">Record New Revision</button>
          ` : ''}
          <button class="btn danger-btn delete-session-btn" data-id="${session.id}">Delete Session</button>
        </div>
      `;
      
      // Add event listeners for action buttons
      const completeBtn = courseDetailContent.querySelector('.complete-session-btn');
      if (completeBtn) {
        completeBtn.addEventListener('click', async () => {
          try {
            await updateSessionStatus(session.id, 'completed');
            
            // Update local data
            const index = allSessions.findIndex(s => s.id === session.id);
            if (index !== -1) {
              allSessions[index].status = 'completed';
              allSessions[index].completedAt = new Date().toISOString();
            }
            
            // Close modal
            closeModal(courseDetailModal);
            
            // Re-render
            renderStudySessions();
            showSuccessMessage('Session marked as completed!');
          } catch (error) {
            console.error('Error updating session:', error);
            showErrorMessage('Failed to update session status.');
          }
        });
      }
      
      const reviseBtn = courseDetailContent.querySelector('.revise-session-btn');
      if (reviseBtn) {
        reviseBtn.addEventListener('click', () => {
          closeModal(courseDetailModal);
          openRecordRevisionModal(session.id);
        });
      }
      
      const deleteBtn = courseDetailContent.querySelector('.delete-session-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          if (confirm('Are you sure you want to delete this study session? This action cannot be undone.')) {
            try {
              await deleteSession(session.id);
              
              // Remove from local data
              const index = allSessions.findIndex(s => s.id === session.id);
              if (index !== -1) {
                allSessions.splice(index, 1);
              }
              
              // Close modal
              closeModal(courseDetailModal);
              
              // Re-render
              renderStudySessions();
              showSuccessMessage('Session deleted successfully!');
            } catch (error) {
              console.error('Error deleting session:', error);
              showErrorMessage('Failed to delete session.');
            }
          }
        });
      }
    })
    .catch(error => {
      console.error('Error fetching revisions:', error);
      
      // Populate modal with basic content without revisions
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
            <strong>Estimated Duration:</strong> ${session.duration} minutes
          </div>
          ${completionInfo}
          <div class="detail-group">
            <strong>Notes:</strong>
            <p>${session.notes || 'No notes provided.'}</p>
          </div>
          <div class="error-message">
            <p>Error loading revision history. Please try again later.</p>
          </div>
        </div>
      `;
    });
  
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
      
      // First close the modal
      closeModal(manageLecturesLabsModal);
      
      // Wait a moment for the modal to close completely
      setTimeout(() => {
        // Show success message with motivational message
        showMotivationalMessage('newLecture');
      }, 100);
      
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
      
      // First close the modal
      closeModal(manageLecturesLabsModal);
      
      // Wait a moment for the modal to close completely
      setTimeout(() => {
        // Show success message with motivational message
        showMotivationalMessage('newLab');
      }, 100);
      
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
    const completionTime = parseInt(document.getElementById('completion-time').value);
    const notes = document.getElementById('completion-notes').value;
    
    if (!completionTime) {
      showErrorMessage('Please enter a valid completion time.');
      return;
    }
    
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
      
      // Show success message with motivational message
      showMotivationalMessage('studied');
      
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
    const revisionTime = parseInt(document.getElementById('revision-time').value);
    const notes = document.getElementById('revision-notes').value;
    
    if (!revisionTime) {
      showErrorMessage('Please enter a valid revision time.');
      return;
    }
    
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
        
        // Show success message with motivational message
        showMotivationalMessage('revised');
        
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
  showTableLoadingWithTimeout(lecturesTable, 'Loading lectures...');
  
  try {
    // Get lectures for the course using optimized cached function
    const lectures = await getCachedLecturesForCourse(courseId);
    
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
  showTableLoadingWithTimeout(labsTable, 'Loading labs...');
  
  try {
    // Get labs for the course using optimized cached function
    const labs = await getCachedLabsForCourse(courseId);
    
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
  
  // Make images in the modal clickable
  makeAllImagesClickable('#item-details-modal');
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
  
  // Make images in the modal clickable
  makeAllImagesClickable('#item-details-modal');
}

// Helper function to format notes with line breaks
function formatNotes(notes) {
  return notes.replace(/\n/g, '<br>');
}

// Function to reload course data and refresh UI
async function reloadCourseData() {
  try {
    // Clear relevant caches first
    clearCache('courses');
    clearCache('sessions');
    
    // Refetch data
    await fetchCourses();
    await fetchStudySessions();
    
    // Update UI
    renderCourses(allCourses);
    populateStudyCourseSelect();
    renderStudySessions();
    
    // Update stats
    updateStats();
    
    // Show success message
    showSuccessMessage('Data refreshed successfully!');
  } catch (error) {
    console.error('Error reloading course data:', error);
    showErrorMessage('Failed to refresh data. Please try again.');
  }
}

// Function to confirm and handle course deletion
function confirmDeleteCourse(course) {
  try {
    // Check if we already have a confirmation modal
    const existingModal = document.querySelector('.confirmation-modal');
    if (existingModal) {
      // Remove existing modal to prevent duplicates
      document.body.removeChild(existingModal);
    }
    
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
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        // Safely remove the modal if it exists and is a child of document.body
        if (confirmModal && confirmModal.parentNode === document.body) {
          document.body.removeChild(confirmModal);
        }
      });
    }
    
    // Handle confirm button
    const confirmBtn = document.getElementById('confirm-delete-btn');
    if (confirmBtn) {
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
            // Safely remove the confirmation modal
            if (confirmModal && confirmModal.parentNode === document.body) {
              document.body.removeChild(confirmModal);
            }
            
            // Close the course detail modal
            closeModal(document.getElementById('course-detail-modal'));
            
            // Show success message
            showSuccessMessage(`Course "${course.name}" has been deleted.`);
          } else {
            throw new Error('Failed to delete course');
          }
        } catch (error) {
          console.error('Error deleting course:', error);
          if (confirmBtn) {
            confirmBtn.textContent = 'Delete';
            confirmBtn.disabled = false;
          }
          showErrorMessage('Failed to delete course. Please try again.');
        }
      });
    }
  } catch (error) {
    console.error('Error in course deletion confirmation:', error);
    showErrorMessage('There was a problem with the delete operation. Please try again.');
  }
}

// Function to update UI with fetched data
async function updateUIWithData() {
    try {
        const coursesListElement = document.getElementById('courses-list');
        const studySessionsTableElement = document.getElementById('study-sessions-table');
        
        if (coursesListElement) {
            showLoading('courses-list', 'Loading your courses...');
        }
        
        if (studySessionsTableElement) {
            const tableBody = studySessionsTableElement.querySelector('tbody');
            if (tableBody) {
                showTableLoadingWithTimeout(tableBody, 'Loading your study sessions...', 7);
            }
        }
        
        // Fetch data with increased timeout to prevent quick timeout errors
        const fetchCoursesPromise = Promise.race([
            fetchCourses(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch courses timeout')), 20000))
        ]).catch(err => {
            console.error('Error fetching courses:', err);
            return [];
        });
        
        const fetchSessionsPromise = Promise.race([
            fetchStudySessions(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch sessions timeout')), 20000))
        ]).catch(err => {
            console.error('Error fetching sessions:', err);
            return [];
        });
        
        // Fetch data in parallel
        const [courses, sessions] = await Promise.all([fetchCoursesPromise, fetchSessionsPromise]);
        
        // Populate UI with data - safely
        if (courses && courses.length > 0) {
            renderCourses(courses);
        } else if (coursesListElement) {
            // Show no data message if no courses
            coursesListElement.innerHTML = `
                <div class="no-data-message">
                    <p>No courses found. Add a course to get started!</p>
                </div>
            `;
        }
        
        // Update dependent elements
        populateStudyCourseSelect();
        populateCategoryFilter();
        
        // Ensure the study sessions table is updated even if there are no sessions
        renderStudySessions();
        
        // Add a filter notice to the study buddy section if not already present
        const studyBuddySection = document.getElementById('study-buddy');
        if (studyBuddySection) {
            let filterNotice = studyBuddySection.querySelector('.filter-notice');
            if (!filterNotice) {
                const studySessionsHeading = studyBuddySection.querySelector('.study-sessions h3');
                if (studySessionsHeading) {
                    filterNotice = document.createElement('div');
                    filterNotice.className = 'filter-notice';
                    filterNotice.innerHTML = `
                        <p><i class="fas fa-filter"></i> Filter by course using the dropdown in the form above.</p>
                    `;
                    studySessionsHeading.insertAdjacentElement('afterend', filterNotice);
                }
            }
        }
        
        // Final check to ensure loading indicators are cleared
        setTimeout(() => {
            // Double-check study sessions table - force clear any loading indicators
            const tableBody = studySessionsTableElement?.querySelector('tbody');
            if (tableBody && tableBody.innerHTML.includes('loading-spinner')) {
                if (sessions && sessions.length > 0) {
                    renderStudySessions(); // Try rendering again
                } else {
                    showNoDataMessage(tableBody, 'No study sessions found. Start recording your study sessions!', 7);
                }
            }
            
            // Double-check courses list
            if (coursesListElement && coursesListElement.innerHTML.includes('loading-spinner')) {
                coursesListElement.innerHTML = `
                    <div class="no-data-message">
                        <p>No courses found. Add a course to get started!</p>
                    </div>
                `;
            }
        }, 2000);
        
        // Update other stats and UI elements
        try {
            updateStats();
            showMotivationalMessage();
        } catch (error) {
            console.error('Error updating UI stats:', error);
        }
    } catch (error) {
        console.error('Error updating UI with data:', error);
        showErrorMessage('There was an error loading your data. Please refresh the page.');
        
        // Clear loading indicators in case of error
        clearAllLoadingIndicators();
    }
}

// Helper function to clear all loading indicators
function clearAllLoadingIndicators() {
    // Clear courses list loading
    const coursesListElement = document.getElementById('courses-list');
    if (coursesListElement && coursesListElement.innerHTML.includes('loading-spinner')) {
        coursesListElement.innerHTML = `
            <div class="no-data-message">
                <p>Error loading courses. Please refresh the page.</p>
            </div>
        `;
    }
    
    // Clear study sessions table loading
    const studySessionsTableElement = document.getElementById('study-sessions-table');
    if (studySessionsTableElement) {
        const tableBody = studySessionsTableElement.querySelector('tbody');
        if (tableBody && tableBody.innerHTML.includes('loading-spinner')) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data-message">
                        Error loading study sessions. Please refresh the page.
                    </td>
                </tr>
            `;
        }
    }
}

// Function to fetch courses
async function fetchCourses() {
    try {
        // Show loading state for courses
        const coursesListElement = document.getElementById('courses-list');
        if (coursesListElement) {
            showLoading('courses-list', 'Loading your courses...');
        }
        
        // First try to get courses from local storage to populate UI immediately
        const localCourses = JSON.parse(localStorage.getItem("marnona_courses") || "[]");
        if (localCourses && localCourses.length > 0) {
            // Immediately show local courses to avoid blank UI
            allCourses = localCourses;
            window.allCourses = allCourses;
            
            // Update UI with local data
            renderCourses(allCourses);
        }
        
        // Check for Firebase connection issues
        if (typeof getCachedCourses !== 'function') {
            console.error('Database connection error: getCachedCourses is not a function');
            showErrorMessage('Database connection error. Please reload the page.');
            return localCourses || [];
        }
        
        // Set up a timeout to limit how long we wait for Firebase
        const coursesFetchPromise = getCachedCourses();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Courses fetch timed out')), 10000);
        });
        
        // Race the promises to handle timeout
        const courses = await Promise.race([coursesFetchPromise, timeoutPromise])
            .catch(error => {
                console.error('Error or timeout fetching courses:', error);
                // If we have local courses, return those on timeout
                if (localCourses && localCourses.length > 0) {
                    // Don't show a message here, since we're already showing courses
                    return localCourses;
                }
                return [];
            });
        
        // Update our global state
        if (courses && courses.length > 0) {
            allCourses = courses;
            window.allCourses = allCourses;
            
            // Compare with local courses to see if we need to re-render
            const shouldRerender = JSON.stringify(courses) !== JSON.stringify(localCourses);
            
            if (shouldRerender) {
                // Update UI with fetched data
                renderCourses(allCourses);
            } else {
                // If the courses are the same, just update the stats
                // Remove any loading overlay that might be present
                const loadingOverlay = coursesListElement?.querySelector('.loading-overlay');
                if (loadingOverlay) {
                    coursesListElement.removeChild(loadingOverlay);
                }
                
                // Re-apply stats to ensure they're current
                courses.forEach(course => {
                    updateCourseStats(course.id);
                });
            }
            
            // Always update these
            populateStudyCourseSelect();
            populateCategoryFilter();
        } else if (!localCourses || localCourses.length === 0) {
            // Only show no data message if we don't have local courses either
            if (coursesListElement) {
                coursesListElement.innerHTML = `
                    <div class="no-data-message">
                        <p>No courses found. Add a course to get started!</p>
                    </div>
                `;
            }
        }
        
        return allCourses;
    } catch (error) {
        console.error('Error in fetchCourses:', error);
        // Try to recover with local storage data
        try {
            const localCourses = JSON.parse(localStorage.getItem("marnona_courses") || "[]");
            if (localCourses && localCourses.length > 0) {
                allCourses = localCourses;
                window.allCourses = allCourses;
                
                // If we already have rendered courses, just quietly update the stats
                const coursesListElement = document.getElementById('courses-list');
                const loadingOverlay = coursesListElement?.querySelector('.loading-overlay');
                if (loadingOverlay) {
                    coursesListElement.removeChild(loadingOverlay);
                }
                
                // Re-apply stats to ensure they're current
                localCourses.forEach(course => {
                    updateCourseStats(course.id);
                });
                
                return localCourses;
            }
        } catch (localError) {
            console.error('Error parsing local courses:', localError);
        }
        
        // Return empty array to prevent further errors
        return [];
    }
}

// Function to fetch study sessions
async function fetchStudySessions() {
    try {
        // Show loading state for sessions
        const studySessionsTableElement = document.getElementById('study-sessions-table');
        if (studySessionsTableElement) {
            const tableBody = studySessionsTableElement.querySelector('tbody');
            if (tableBody) {
                showTableLoadingWithTimeout(tableBody, 'Loading your study sessions...', 7);
            }
        }
        
        // First try to get sessions from local storage to populate UI immediately
        const localSessions = JSON.parse(localStorage.getItem("marnona_sessions") || "[]");
        if (localSessions && localSessions.length > 0) {
            // Immediately show local sessions to avoid blank UI
            allSessions = localSessions;
            window.allSessions = allSessions;
            
            // Update UI with local data
            renderStudySessions();
        }
        
        // Check for Firebase connection issues
        if (typeof getCachedSessions !== 'function') {
            console.error('Database connection error: getCachedSessions is not a function');
            showErrorMessage('Database connection error. Please reload the page.');
            return localSessions || [];
        }
        
        // Set up a timeout to limit how long we wait for Firebase
        const sessionsFetchPromise = getCachedSessions();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Sessions fetch timed out')), 10000);
        });
        
        // Race the promises to handle timeout
        const sessions = await Promise.race([sessionsFetchPromise, timeoutPromise])
            .catch(error => {
                console.error('Error or timeout fetching sessions:', error);
                // If we have local sessions, return those on timeout
                if (localSessions && localSessions.length > 0) {
                    showSuccessMessage('Using locally cached sessions. Some data may not be up to date.');
                    return localSessions;
                }
                return [];
            });
        
        // Update our global state
        if (sessions && sessions.length > 0) {
            allSessions = sessions;
            window.allSessions = allSessions;
            
            // Update UI with fetched data
            renderStudySessions();
        }
        
        return allSessions;
    } catch (error) {
        console.error('Error in fetchStudySessions:', error);
        // Try to recover with local storage data
        try {
            const localSessions = JSON.parse(localStorage.getItem("marnona_sessions") || "[]");
            if (localSessions && localSessions.length > 0) {
                allSessions = localSessions;
                window.allSessions = allSessions;
                showSuccessMessage('Using locally cached sessions. Some data may not be up to date.');
                return localSessions;
            }
        } catch (localError) {
            console.error('Error parsing local sessions:', localError);
        }
        
        // Return empty array to prevent further errors
        return [];
    }
}

// Function to update stats
function updateStats() {
  try {
    console.log('Updating all dashboard stats...');
    
    // Clear loading indicators
    document.querySelectorAll('.stat-card p').forEach(statEl => {
      // Only clear if it contains a loading indicator
      if (statEl.querySelector('.loader')) {
        statEl.innerHTML = '0';
      }
    });
    
    // Update individual stats
    updateCourseCount();
    updateStudyHoursCount();
    updateLabsCount();
    updateAchievementsCount();
    
    console.log('All stats updated successfully');
  } catch (error) {
    console.error('Error updating stats:', error);
    
    // Ensure we at least show zeros instead of loading indicators
    document.querySelectorAll('.stat-card p').forEach(statEl => {
      if (statEl.querySelector('.loader')) {
        statEl.innerHTML = '0';
      }
    });
  }
}

// Helper function to check if device is mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

// Helper function to detect iOS devices
function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Apply iOS specific fixes
function applyIOSFixes() {
    if (isIOSDevice()) {
        // Add iOS specific class
        document.body.classList.add('ios-device');
        
        // Fix for 100vh issue on iOS
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Reapply on resize and orientation change
        window.addEventListener('resize', () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        });
        
        // Fix input focusing issues
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                setTimeout(() => {
                    window.scrollTo(0, 0);
                }, 50);
            });
        });
    }
}

// Helper function to handle orientation changes
// Function to update course count
function updateCourseCount() {
    const coursesCountElement = document.getElementById('courses-count');
    if (!coursesCountElement) return;
    
    try {
      const count = allCourses?.length || 0;
      coursesCountElement.textContent = count;
    } catch (error) {
      console.error('Error updating course count:', error);
      coursesCountElement.textContent = '0';
    }
}

// Function to update study hours count
function updateStudyHoursCount() {
  const studyHoursElement = document.getElementById('study-hours');
  if (!studyHoursElement) return;
  
  try {
    // Calculate total study time
    const totalMinutes = (allSessions || []).reduce((total, session) => {
      return total + (parseInt(session.duration) || 0);
    }, 0);
        
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    studyHoursElement.textContent = `${hours}h ${minutes}m`;
  } catch (error) {
    console.error('Error updating study hours count:', error);
    studyHoursElement.textContent = '0h 0m';
  }
}

// Function to update labs count
function updateLabsCount() {
  const labsCountElement = document.getElementById('labs-count');
  if (!labsCountElement) return;
  
  try {
    // Get session with type lab that have status completed
    const completedLabs = (allSessions || []).filter(session => 
      session.type === 'lab' && (session.status === 'completed' || session.status === 'studied')
    ).length;
    
    labsCountElement.textContent = completedLabs;
  } catch (error) {
    console.error('Error updating labs count:', error);
    labsCountElement.textContent = '0';
  }
}

// Function to update achievements count
function updateAchievementsCount() {
    const achievementsCountElement = document.getElementById('achievements-count');
  if (!achievementsCountElement) return;
  
  try {
    // Calculate achievements based on app usage
        let achievementCount = 0;
        
    // Achievement 1: Started using the app
    achievementCount++;
    
    // Achievement 2: Added at least 5 courses
    if (allCourses && allCourses.length >= 5) {
            achievementCount++;
        }
        
    // Achievement 3: Recorded at least 10 study sessions
    if (allSessions && allSessions.length >= 10) {
            achievementCount++;
        }
        
    // Achievement 4: Studied for at least 10 hours total
    const totalMinutes = (allSessions || []).reduce((total, session) => {
      return total + (parseInt(session.duration) || 0);
    }, 0);
    
    if (totalMinutes >= 600) { // 10 hours = 600 minutes
            achievementCount++;
        }
        
    // Achievement 5: Completed at least 3 labs
    const completedLabs = (allSessions || []).filter(session => 
      session.type === 'lab' && session.status === 'completed'
    ).length;
    
    if (completedLabs >= 3) {
      achievementCount++;
    }
    
    // Achievement 6: Revised content at least 5 times
    const revisions = (allSessions || []).reduce((total, session) => {
      return total + (session.revisions ? session.revisions.length : 0);
    }, 0);
    
    if (revisions >= 5) {
            achievementCount++;
        }
        
        achievementsCountElement.textContent = achievementCount;
  } catch (error) {
    console.error('Error updating achievements count:', error);
    achievementsCountElement.textContent = '0';
    }
}

// Toggle sidebar function
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  
  if (!sidebar) return;
  
  // Check if sidebar overlay exists, if not create it
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    
    // Add click event to close sidebar when overlay is clicked
    overlay.addEventListener('click', closeSidebar);
  }
  
  // Toggle sidebar active state
  if (sidebar.classList.contains('active')) {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = ''; // Re-enable scrolling
  } else {
    sidebar.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Make sure sidebar is visible without scrolling
    sidebar.style.top = '0';
    
    // Ensure sidebar nav is visible in mobile view
    const sidebarNav = sidebar.querySelector('.sidebar-nav');
    if (sidebarNav) {
      sidebarNav.classList.add('active');
    }
  }
  
  // Toggle hamburger icon
  const hamburgerBtn = document.getElementById('hamburger-menu');
  if (hamburgerBtn) {
    const icon = hamburgerBtn.querySelector('i');
    if (icon) {
      if (sidebar.classList.contains('active')) {
        icon.className = 'fas fa-times'; // Change to X icon when sidebar is open
      } else {
        icon.className = 'fas fa-bars'; // Change back to bars when sidebar is closed
      }
    }
  }
  
  // Prevent page scrolling when sidebar is open on mobile
  if (window.innerWidth <= 768) {
    if (sidebar.classList.contains('active')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
}

// Close sidebar
function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  if (sidebar) {
    sidebar.classList.remove('active');
    
    // Also ensure sidebar nav is closed
    const sidebarNav = sidebar.querySelector('.sidebar-nav');
    if (sidebarNav) {
      sidebarNav.classList.remove('active');
    }
  }
  
  if (overlay) {
    overlay.classList.remove('active');
  }
  
  // Reset hamburger icon
  const hamburgerBtn = document.getElementById('hamburger-menu');
  if (hamburgerBtn) {
    const icon = hamburgerBtn.querySelector('i');
    if (icon) {
      icon.className = 'fas fa-bars';
    }
  }
  
  document.body.style.overflow = ''; // Re-enable scrolling
}

// Close sidebar when clicking outside
function closeSidebarOnClickOutside(event) {
    // Only handle in mobile view
    if (window.innerWidth > 768) return;
    
    const sidebar = document.querySelector('.sidebar');
    const hamburgerBtn = document.getElementById('hamburger-menu');
    
    if (sidebar && hamburgerBtn) {
        // Check if click is outside sidebar and not on hamburger button
        if (!sidebar.contains(event.target) && !hamburgerBtn.contains(event.target)) {
            closeSidebar();
        }
    }
}

// Function to fetch all labs
async function fetchAllLabs() {
    try {
        // Check for Firebase connection issues
        if (typeof getCachedAllLabs !== 'function') {
            console.error('Database connection error: getCachedAllLabs is not a function');
            return [];
        }
        
        // Use optimized function to fetch labs in parallel for all courses
        const allLabsList = await getCachedAllLabs(allCourses);
        
        // Store in global variable for access throughout the app
        window.labsList = allLabsList;
        
        return allLabsList;
    } catch (error) {
        console.error('Error fetching all labs:', error);
        return [];
    }
}

// Helper function to show loading in tables with timeout handling
function showTableLoadingWithTimeout(tableElement, message = 'Loading...', colSpan = 6) {
  if (!tableElement) return;
  
  // Add a data attribute to track loading start time
  const loadingStartTime = new Date().getTime();
  tableElement.dataset.loadingStartTime = loadingStartTime;
  
  tableElement.innerHTML = `
    <tr>
      <td colspan="${colSpan}" style="text-align: center; padding: 20px;">
        <span class="loader"></span> ${message}
      </td>
    </tr>
  `;
  
  // Set a timeout to clear loading indicators if they persist too long
  setTimeout(() => {
    try {
      // Check if the loading indicator is still showing for this specific loading action
      if (tableElement && tableElement.dataset.loadingStartTime == loadingStartTime) {
        // Try to load from cache or local storage one more time
        if (tableElement === studySessionsTable) {
          // For study sessions table
          const localSessions = JSON.parse(localStorage.getItem("marnona_sessions") || "[]");
          if (localSessions && localSessions.length > 0) {
            // We have some local data, render it
            allSessions = localSessions;
            renderStudySessions();
            return;
          }
        }
        
        // Only show timeout message if there's no content already
        if (tableElement.querySelectorAll('tr').length <= 1) {
          showNoDataMessage(tableElement, 'Loading timed out. Please refresh the page to try again.', colSpan);
        } else {
          // If we have content, silently remove the loading indicator
          const loadingRow = tableElement.querySelector('tr td span.loader');
          if (loadingRow && loadingRow.parentElement && loadingRow.parentElement.parentElement) {
            tableElement.removeChild(loadingRow.parentElement.parentElement);
          }
        }
      }
    } catch (err) {
      console.error('Error handling timeout:', err);
      // Only show the timeout message if there's no content already
      if (tableElement.querySelectorAll('tr').length <= 1) {
        showNoDataMessage(tableElement, 'Loading timed out. Please refresh the page to try again.', colSpan);
      }
    }
  }, 15000); // 15 seconds timeout
}

// Function to setup clickable images
function setupClickableImages() {
  // Get the modal and its components
  const fullscreenModal = document.getElementById('fullscreen-image-modal');
  const fullscreenImage = document.getElementById('fullscreen-image');
  const closeButton = document.querySelector('.close-fullscreen-image');
  
  // Add the clickable-image class to all images we want to be clickable
  const clickableImages = [
    document.querySelector('.profile-image'),
    // Add other images here as needed
  ];
  
  // Filter out any null values (in case images don't exist)
  clickableImages.filter(img => img).forEach(img => {
    makeImageClickable(img);
  });
  
  // Close modal when clicking the close button
  if (closeButton) {
    closeButton.addEventListener('click', function() {
      fullscreenModal.classList.remove('active');
      document.body.style.overflow = ''; // Restore scrolling
    });
  }
  
  // Close modal when clicking outside the image
  if (fullscreenModal) {
    fullscreenModal.addEventListener('click', function(event) {
      if (event.target === fullscreenModal) {
        fullscreenModal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
      }
    });
  }
  
  // Setup global event delegation for images added dynamically
  document.body.addEventListener('click', function(event) {
    // Check if the clicked element is an image with the clickable-image class
    if (event.target.tagName === 'IMG' && event.target.classList.contains('clickable-image')) {
      fullscreenImage.src = event.target.src;
      fullscreenModal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent scrolling while modal is open
    }
  });
}

// Function to make any image clickable
function makeImageClickable(imgElement) {
  if (!imgElement) return;
  
  // Add the clickable-image class for styling
  imgElement.classList.add('clickable-image');
}

// Function to make all images in a container clickable
function makeAllImagesClickable(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  
  const images = container.querySelectorAll('img');
  images.forEach(img => makeImageClickable(img));
}

// Function to handle URL hash changes
function handleUrlHash() {
    const hash = window.location.hash.substring(1); // Remove the # symbol
    
    if (hash) {
        // Find and activate corresponding navigation item
        const navItem = document.querySelector(`.sidebar-nav li[data-section="${hash}"]`);
        if (navItem) {
            // Update active navigation item
            navigationItems.forEach(item => {
                item.classList.remove('active');
            });
            navItem.classList.add('active');
            
            // Show selected section
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === hash) {
                    section.classList.add('active');
                }
            });
            
            // Initialize the section if needed
            if (hash === 'reports') {
                // Get the active time range
                const activeTimeBtn = document.querySelector('.time-btn.active');
                const timeRange = activeTimeBtn ? activeTimeBtn.getAttribute('data-range') : 'week';
                updateReports(timeRange);
            } else if (hash === 'study-buddy') {
                renderStudySessions();
            } else if (hash === 'dashboard') {
                initializeDashboard();
            }
        }
    } else {
        // Default to dashboard
        navigationItems.forEach(item => {
            if (item.dataset.section === 'dashboard') {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        contentSections.forEach(section => {
            if (section.id === 'dashboard') {
                section.classList.add('active');
                initializeDashboard();
            } else {
                section.classList.remove('active');
            }
        });
    }
}

// Function to setup hash-based navigation
function setupHashNavigation() {
    navigationItems.forEach(item => {
        const originalClickHandler = item.onclick;
        
        // Replace the click handler with one that updates the URL hash
        item.onclick = function(event) {
            const sectionId = this.dataset.section;
            
            // Update URL hash without triggering hashchange event
            history.pushState(null, null, `#${sectionId}`);
            
            // Call the original click handler if it exists
            if (typeof originalClickHandler === 'function') {
                originalClickHandler.call(this, event);
            }
        };
    });
}

// Rest of your existing functions... 