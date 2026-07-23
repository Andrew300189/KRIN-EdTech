// Sample data
const assignments = [
  { title: 'React Hooks Project', course: 'Web Development 101', dueDate: new Date(2026, 6, 25), urgent: false },
  { title: 'Database Schema Design', course: 'Database Design', dueDate: new Date(2026, 6, 26), urgent: true },
  { title: 'Algorithm Challenge', course: 'Data Structures', dueDate: new Date(2026, 6, 27), urgent: false },
  { title: 'Code Review - API', course: 'Advanced JavaScript', dueDate: new Date(2026, 6, 28), urgent: true },
  { title: 'Quiz: ES6 Features', course: 'Advanced JavaScript', dueDate: new Date(2026, 6, 24), urgent: true }
];

const announcements = [
  { type: 'info', message: 'Midterm exams scheduled for next month. Study materials available in course resources.' },
  { type: 'success', message: 'Congratulations! You have maintained a 3.8+ GPA this semester.' },
  { type: 'warning', message: 'Database Design course: Lecture 15 has been rescheduled to Friday at 3 PM.' },
  { type: 'info', message: 'New discussion forum opened for group project collaboration.' }
];

// Calculate days until due date
function daysUntilDue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateOnly = new Date(dueDate);
  dueDateOnly.setHours(0, 0, 0, 0);
  const diff = dueDateOnly - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Format date
function formatDate(date) {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Render assignments
function renderAssignments() {
  const container = document.getElementById('assignments');
  container.innerHTML = assignments
    .sort((a, b) => a.dueDate - b.dueDate)
    .map(assignment => {
      const daysLeft = daysUntilDue(assignment.dueDate);
      const isOverdue = daysLeft < 0;
      const className = assignment.urgent || isOverdue ? 'urgent' : '';
      const deadlineText = isOverdue ? `Overdue by ${Math.abs(daysLeft)} days` : `Due in ${daysLeft} days`;
      
      return `
        <div class="assignment-item ${className}">
          <div class="assignment-title">${assignment.title}</div>
          <div class="assignment-deadline ${isOverdue ? 'overdue' : ''}">
            ${assignment.course} • ${formatDate(assignment.dueDate)} (${deadlineText})
          </div>
        </div>
      `;
    })
    .join('');
}

// Render announcements
function renderAnnouncements() {
  const container = document.getElementById('notifications');
  container.innerHTML = announcements
    .map(announcement => `
      <div class="notification-item ${announcement.type}">
        ${announcement.message}
      </div>
    `)
    .join('');
}

// Render calendar
function renderCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  // Set month display
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
  
  // Get first day and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';
  
  // Day headers
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayHeaders.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = day;
    calendar.appendChild(header);
  });
  
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day';
    emptyDay.style.visibility = 'hidden';
    calendar.appendChild(emptyDay);
  }
  
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    
    // Check if today
    if (day === today.getDate()) {
      dayElement.classList.add('today');
    }
    
    // Check if assignment due
    const hasEvent = assignments.some(a => {
      const aDate = new Date(a.dueDate);
      return aDate.getFullYear() === year && aDate.getMonth() === month && aDate.getDate() === day;
    });
    
    if (hasEvent) {
      dayElement.classList.add('has-event');
    }
    
    dayElement.textContent = day;
    calendar.appendChild(dayElement);
  }
}

// Initialize dashboard
function initDashboard() {
  renderAssignments();
  renderAnnouncements();
  renderCalendar();
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

// Update every minute
setInterval(() => {
  renderAssignments();
}, 60000);
