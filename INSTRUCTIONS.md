# Marnona's Study Buddy - User Guide

## Introduction

Welcome to Marnona's Study Buddy, your personalized companion for tracking progress in pharmacy school. This application helps you organize courses, track study sessions, visualize progress, and get AI assistance with pharmacy topics.

## Setup Instructions

### Prerequisites
- NodeJS installed (v14+ recommended)
- Modern web browser (Chrome, Firefox, Edge, etc.)

### Starting the Application
1. Open your terminal
2. Navigate to the application folder
3. Run the local web server:
   ```
   npm start
   ```
4. Open your browser and navigate to: http://localhost:8080

> **Note**: The application must be run through a web server to avoid CORS issues. Do not attempt to open the HTML file directly.

## Login & Offline Mode

When you first open the application, you'll be greeted with a login screen:

- **Sign In**: If you have an account, enter your email and password.
- **New User**: If you don't have an account, simply enter your preferred email and password, and an account will be created for you automatically.
- **Offline Mode**: Click the "Continue Offline" button to use the app without an internet connection. Your data will be stored locally in your browser.

## Dashboard

The dashboard provides a quick overview of your study progress:

- **Stats**: View your total courses, study hours, labs completed, and achievements
- **Activity Charts**: Visualize your study patterns and course progress
- **Recent Activity**: See your latest study sessions and revisions

## Courses

This section allows you to manage your pharmacy courses:

### Viewing Courses
- All your courses are displayed in a grid format with their code, name, and description
- Use the search box to find specific courses by name or code
- Filter courses by category using the dropdown menu

### Adding a New Course
1. Click the "+ Add Course" button
2. Enter the course details:
   - **Course Code**: The unique identifier (e.g., PHCM101)
   - **Course Name**: The full name of the course
   - **Description** (optional): A brief description of the course content
   - **Category** (optional): Select or auto-detect from the course code
3. Click "Save Course" to add it to your collection

### Course Details
Click on any course card to view detailed information, including:
- Course statistics
- Associated study sessions
- Options to start a new study session

## Study Buddy

This section helps you track your study sessions and revisions:

### Creating a Study Session
1. Select a course from the dropdown
2. Choose a session type (Lecture or Lab)
3. Enter a descriptive session name
4. Set the duration in minutes
5. Click "Start Session" to begin tracking

### Managing Sessions
- View all your sessions in the table below the form
- Record revisions for each session to track your progress
- Delete sessions you no longer need

### Recording Revisions
1. Click the "Record Revision" button next to a session
2. Enter the details of your revision:
   - Duration
   - Notes
   - Comprehension level
3. Submit to add it to your revision history

## AI Help

Get assistance with pharmacy topics using the AI chat assistant:

1. Type your question in the chat box
2. Click the send button or press Enter
3. The AI will respond with helpful information about pharmacy topics

Examples of questions you can ask:
- "Can you explain the mechanism of action for ACE inhibitors?"
- "What is the difference between first-order and zero-order kinetics?"
- "How do I remember the classification of antidepressants?"

## Reports

Analyze your study patterns and progress over time:

- **Time Range**: Switch between weekly, monthly, and semester views
- **Study Time Distribution**: See how your study time is distributed across courses
- **Revision Frequency**: Track how often you revise different topics
- **Sessions by Course**: Compare your focus across different subjects
- **Progress Over Time**: Visualize your improvement trajectory
- **Study Insights**: Get personalized recommendations to optimize your study habits

## Working Offline

The application works even without an internet connection:

- All data is cached locally in your browser
- New data is saved locally when offline
- When you reconnect, data will automatically sync with the cloud

## Troubleshooting

### Common Issues

1. **CORS Errors**: Always run the application through the provided web server (npm start)
2. **Database Connection Errors**: If you encounter database issues, try:
   - Refreshing the page
   - Using offline mode until connectivity is restored
   - Checking your internet connection

3. **Data Not Appearing**: If your courses or sessions don't appear:
   - Check if you're using filters that might be hiding content
   - Try refreshing the page
   - Use the "Continue Offline" mode to access local data

## Data Privacy

Your study data is:
- Stored securely in your Firebase account
- Available on any device when you sign in
- Never shared with third parties
- Backed up locally in your browser for offline use

## Adding Pharmacy Course Data

To quickly populate your application with pharmacy courses:

1. Python script (requires Python and Firebase Admin SDK):
   - Install required packages: `pip install firebase-admin`
   - Edit the firebase-key.json file with your credentials
   - Run `python populate_courses.py`
   - Choose option 3 to populate all predefined courses

2. Manually (through the UI):
   - Navigate to the Courses section
   - Click "+ Add Course"
   - Enter course details
   - Repeat for each course

---

We hope Marnona's Study Buddy helps you excel in your pharmacy studies!
If you encounter any issues or have suggestions, feel free to provide feedback. 