// Get view type from URL path
const path = window.location.pathname;
const viewType = path.includes('completed') ? 'completed' :
                 path.includes('active') ? 'active' :
                 path.includes('cancelled') ? 'cancelled' :
                 path.includes('ngos-helped') ? 'ngos-helped' :
                 path.includes('all') ? 'all' : null;

let currentPage = 1;
const itemsPerPage = 20;
let allData = [];
let filteredData = [];

// View configurations for volunteer
const viewConfigs = {
  all: {
    title: 'All Tasks',
    icon: 'fa-tasks',
    endpoint: '/api/volunteers/history',
    columns: [
      { key: 'id', label: 'ID', width: '10%' },
      { key: 'title', label: 'Task Title', width: '20%' },
      { key: 'type', label: 'Type', width: '10%' },
      { key: 'location', label: 'Location', width: '15%' },
      { key: 'status', label: 'Status', width: '10%', isStatus: true },
      { key: 'assignedAt', label: 'Assigned', width: '15%', isDate: true },
      { key: 'ngoName', label: 'NGO', width: '20%' }
    ],
    filters: [
      { key: 'status', label: 'Status', type: 'select', options: ['all', 'assigned', 'completed'] },
      { key: 'search', label: 'Search', type: 'text', placeholder: 'Search by task title or NGO...' }
    ]
  },
  completed: {
    title: 'Completed Tasks',
    icon: 'fa-check-circle',
    endpoint: '/api/volunteers/history',
    columns: [
      { key: 'id', label: 'ID', width: '10%' },
      { key: 'title', label: 'Task Title', width: '20%' },
      { key: 'type', label: 'Type', width: '10%' },
      { key: 'location', label: 'Location', width: '15%' },
      { key: 'completedAt', label: 'Completed', width: '15%', isDate: true },
      { key: 'ngoName', label: 'NGO', width: '30%' }
    ],
    filters: [
      { key: 'search', label: 'Search', type: 'text', placeholder: 'Search by task title or NGO...' }
    ]
  },
  active: {
    title: 'Active Tasks',
    icon: 'fa-clock',
    endpoint: '/api/volunteers/history',
    columns: [
      { key: 'id', label: 'ID', width: '10%' },
      { key: 'title', label: 'Task Title', width: '20%' },
      { key: 'type', label: 'Type', width: '10%' },
      { key: 'location', label: 'Location', width: '15%' },
      { key: 'status', label: 'Status', width: '10%', isStatus: true },
      { key: 'assignedAt', label: 'Assigned', width: '15%', isDate: true },
      { key: 'ngoName', label: 'NGO', width: '20%' }
    ],
    filters: [
      { key: 'search', label: 'Search', type: 'text', placeholder: 'Search by task title or NGO...' }
    ]
  },
  'ngos-helped': {
    title: 'NGOs Helped',
    icon: 'fa-hands-helping',
    endpoint: '/api/volunteers/history',
    columns: [
      { key: 'ngoName', label: 'NGO Name', width: '40%' },
      { key: 'taskCount', label: 'Tasks Assigned', width: '20%' },
      { key: 'completedCount', label: 'Tasks Completed', width: '20%' },
      { key: 'lastTask', label: 'Last Task', width: '20%', isDate: true }
    ],
    filters: [
      { key: 'search', label: 'Search', type: 'text', placeholder: 'Search by NGO name...' }
    ]
  }
};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  if (!viewType || !viewConfigs[viewType]) {
    window.location.href = '/volunteer-dashboard';
    return;
  }

  const config = viewConfigs[viewType];
  
  // Set page title and icon
  document.getElementById('pageTitle').textContent = config.title;
  document.getElementById('headerIcon').className = `fas ${config.icon}`;
  document.title = `${config.title} - DaanSetu Volunteer`;

  // Setup filters
  setupFilters(config.filters);

  // Load data
  await loadData(config.endpoint);
});

// Setup filters
function setupFilters(filters) {
  const filtersGrid = document.getElementById('filtersGrid');
  filtersGrid.innerHTML = '';

  filters.forEach(filter => {
    const filterItem = document.createElement('div');
    filterItem.className = 'filter-item';

    const label = document.createElement('label');
    label.textContent = filter.label;
    filterItem.appendChild(label);

    if (filter.type === 'select') {
      const select = document.createElement('select');
      select.id = `filter-${filter.key}`;
      select.addEventListener('change', applyFilters);

      filter.options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option;
        optionEl.textContent = option.charAt(0).toUpperCase() + option.slice(1);
        select.appendChild(optionEl);
      });

      filterItem.appendChild(select);
    } else if (filter.type === 'text') {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `filter-${filter.key}`;
      input.placeholder = filter.placeholder || '';
      input.addEventListener('input', applyFilters);
      filterItem.appendChild(input);
    }

    filtersGrid.appendChild(filterItem);
  });
}

// Load data from API
async function loadData(endpoint) {
  try {
    console.log('Loading data from:', endpoint);
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      window.location.href = '/';
      return;
    }

    console.log('Making API request...');
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API error:', errorData);
      throw new Error(errorData.message || 'Failed to load data');
    }

    const data = await response.json();
    console.log('Data received:', data);
    
    // Process data based on view type
    if (viewType === 'ngos-helped') {
      // Aggregate data by NGO for NGOs helped view
      const ngoMap = new Map();
      
      (data.tasks || []).forEach(task => {
        // More robust check for NGO data
        const hasNgoData = task.ngoName && task.ngoId;
        console.log('Processing task for NGO aggregation:', { 
          taskId: task.id, 
          hasNgoData, 
          ngoName: task.ngoName, 
          ngoId: task.ngoId,
          status: task.status
        });
        
        if (hasNgoData) {
          if (!ngoMap.has(task.ngoId)) {
            ngoMap.set(task.ngoId, {
              ngoName: task.ngoName,
              taskCount: 0,
              completedCount: 0,
              lastTask: null
            });
          }
          
          const ngoData = ngoMap.get(task.ngoId);
          ngoData.taskCount++;
          
          if (task.status === 'completed') {
            ngoData.completedCount++;
          }
          
          const taskDate = task.completedAt || task.assignedAt || task.createdAt;
          
          // Fix the date comparison logic
          if (taskDate) {
            // Convert Firestore timestamp to JavaScript Date
            let jsDate;
            if (taskDate._seconds) {
              jsDate = new Date(taskDate._seconds * 1000);
            } else if (taskDate.seconds) {
              jsDate = new Date(taskDate.seconds * 1000);
            } else {
              jsDate = new Date(taskDate);
            }
            
            // Compare with existing lastTask date
            if (!ngoData.lastTask) {
              ngoData.lastTask = taskDate;
            } else {
              // Convert existing lastTask to JavaScript Date for comparison
              let existingDate;
              if (ngoData.lastTask._seconds) {
                existingDate = new Date(ngoData.lastTask._seconds * 1000);
              } else if (ngoData.lastTask.seconds) {
                existingDate = new Date(ngoData.lastTask.seconds * 1000);
              } else {
                existingDate = new Date(ngoData.lastTask);
              }
              
              // Update if this task is more recent
              if (jsDate > existingDate) {
                ngoData.lastTask = taskDate;
              }
            }
          }
        }
      });
      
      allData = Array.from(ngoMap.values());
      console.log('NGOs helped data processed:', allData);
      
      // If we're in demo mode and there's no data, add some mock data for testing
      if (allData.length === 0) {
        console.log('No NGO data found, checking if we should add demo data');
        // Check if we're in demo mode by looking for specific indicators
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('Adding demo data for NGOs helped view');
          // Add some demo data for testing
          allData = [
            {
              ngoName: 'Helping Hands Foundation',
              taskCount: 5,
              completedCount: 3,
              lastTask: { _seconds: Math.floor(Date.now() / 1000) - 86400 } // 1 day ago
            },
            {
              ngoName: 'Community Care Center',
              taskCount: 3,
              completedCount: 2,
              lastTask: { _seconds: Math.floor(Date.now() / 1000) - 172800 } // 2 days ago
            },
            {
              ngoName: 'Food for All NGO',
              taskCount: 7,
              completedCount: 6,
              lastTask: { _seconds: Math.floor(Date.now() / 1000) - 432000 } // 5 days ago
            }
          ];
        }
      }
    } else if (viewType === 'completed') {
      // Filter for completed tasks only
      allData = (data.tasks || []).filter(task => task.status === 'completed');
      
      // If we're in demo mode and there's no data, add some mock data for testing
      if (allData.length === 0) {
        console.log('No completed tasks found, checking if we should add demo data');
        // Check if we're in demo mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('Adding demo data for completed tasks view');
          // Add some demo data for testing
          allData = [
            {
              id: 'demo-completed-1',
              title: 'Food Distribution',
              type: 'distribution',
              location: '123 Main St, City',
              completedAt: { _seconds: Math.floor(Date.now() / 1000) - 86400 },
              ngoName: 'Helping Hands Foundation',
              status: 'completed'
            },
            {
              id: 'demo-completed-2',
              title: 'Clothing Pickup',
              type: 'pickup',
              location: '456 Oak Ave, City',
              completedAt: { _seconds: Math.floor(Date.now() / 1000) - 172800 },
              ngoName: 'Community Care Center',
              status: 'completed'
            }
          ];
        }
      }
    } else if (viewType === 'active') {
      // Filter for active tasks (assigned)
      allData = (data.tasks || []).filter(task => task.status === 'assigned');
      
      // If we're in demo mode and there's no data, add some mock data for testing
      if (allData.length === 0) {
        console.log('No active tasks found, checking if we should add demo data');
        // Check if we're in demo mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('Adding demo data for active tasks view');
          // Add some demo data for testing
          allData = [
            {
              id: 'demo-active-1',
              title: 'Book Sorting',
              type: 'sorting',
              location: '789 Pine St, City',
              status: 'assigned',
              assignedAt: { _seconds: Math.floor(Date.now() / 1000) - 3600 },
              ngoName: 'Education First NGO'
            },
            {
              id: 'demo-active-2',
              title: 'Toy Distribution',
              type: 'distribution',
              location: '321 Elm St, City',
              status: 'assigned',
              assignedAt: { _seconds: Math.floor(Date.now() / 1000) - 7200 },
              ngoName: 'Children First Foundation'
            }
          ];
        }
      }
    } else {
      // All tasks
      allData = data.tasks || [];
      
      // If we're in demo mode and there's no data, add some mock data for testing
      if (allData.length === 0) {
        console.log('No tasks found, checking if we should add demo data');
        // Check if we're in demo mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('Adding demo data for all tasks view');
          // Add some demo data for testing
          allData = [
            {
              id: 'demo-all-1',
              title: 'Food Distribution',
              type: 'distribution',
              location: '123 Main St, City',
              status: 'completed',
              assignedAt: { _seconds: Math.floor(Date.now() / 1000) - 86400 },
              completedAt: { _seconds: Math.floor(Date.now() / 1000) - 43200 },
              ngoName: 'Helping Hands Foundation'
            },
            {
              id: 'demo-all-2',
              title: 'Clothing Pickup',
              type: 'pickup',
              location: '456 Oak Ave, City',
              status: 'assigned',
              assignedAt: { _seconds: Math.floor(Date.now() / 1000) - 172800 },
              ngoName: 'Community Care Center'
            }
          ];
        }
      }
    }

    console.log('Processed data count:', allData.length);
    filteredData = [...allData];
    
    document.getElementById('loadingSpinner').style.display = 'none';
    
    if (allData.length === 0) {
      document.getElementById('emptyState').style.display = 'block';
      // Update the empty state message to be more informative
      const emptyStateMessage = document.querySelector('#emptyState p');
      if (emptyStateMessage) {
        if (viewType === 'ngos-helped') {
          emptyStateMessage.innerHTML = 'You haven\'t worked with any NGOs yet.<br>Complete tasks to see NGOs you\'ve helped here.';
        } else {
          emptyStateMessage.textContent = 'You haven\'t accepted any tasks yet. Accept tasks to get started!';
        }
      }
    } else {
      document.getElementById('tableContainer').style.display = 'block';
      renderTable();
    }
  } catch (error) {
    console.error('Error loading data:', error);
    document.getElementById('loadingSpinner').innerHTML = `
      <i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i>
      <h3 style="color: #2d3748; margin-top: 1rem;">Failed to Load Data</h3>
      <p style="color: #4a5568;">${error.message}</p>
      <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">
        Try Again
      </button>
    `;
  }
}

// Apply filters
function applyFilters() {
  const config = viewConfigs[viewType];
  filteredData = [...allData];

  config.filters.forEach(filter => {
    const filterEl = document.getElementById(`filter-${filter.key}`);
    if (!filterEl) return;

    const value = filterEl.value.toLowerCase();

    if (filter.type === 'select' && value !== 'all') {
      filteredData = filteredData.filter(item => {
        const itemValue = (item[filter.key] || '').toString().toLowerCase();
        return itemValue === value;
      });
    } else if (filter.type === 'text' && value) {
      filteredData = filteredData.filter(item => {
        return Object.values(item).some(val => 
          (val || '').toString().toLowerCase().includes(value)
        );
      });
    }
  });

  currentPage = 1;
  renderTable();
}

// Render table
function renderTable() {
  const config = viewConfigs[viewType];
  const tableHead = document.getElementById('tableHead');
  const tableBody = document.getElementById('tableBody');
  
  console.log('Rendering table for view:', viewType);
  console.log('Config:', config);
  console.log('Filtered data:', filteredData);

  // Render headers
  tableHead.innerHTML = `
    <tr>
      ${config.columns.map(col => `<th style="width: ${col.width}">${col.label}</th>`).join('')}
    </tr>
  `;

  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageData = filteredData.slice(startIndex, endIndex);
  
  console.log('Page data:', pageData);

  // Render rows
  tableBody.innerHTML = pageData.map(item => `
    <tr>
      ${config.columns.map(col => {
        let value = item[col.key] || '-';
        
        if (col.isDate && value !== '-') {
          value = formatDate(value);
        } else if (col.isStatus) {
          value = `<span class="status-badge status-${value}">${value}</span>`;
        } else if (col.key === 'id') {
          value = value.substring(0, 12) + '...';
        }
        
        return `<td>${value}</td>`;
      }).join('')}
    </tr>
  `).join('');

  // Update pagination
  updatePagination();
}

// Update pagination
function updatePagination() {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// Change page
function changePage(direction) {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const newPage = currentPage + direction;
  
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Export data to CSV
function exportData() {
  const config = viewConfigs[viewType];
  
  // Create CSV content
  const headers = config.columns.map(col => col.label).join(',');
  const rows = filteredData.map(item => {
    return config.columns.map(col => {
      let value = item[col.key] || '';
      if (col.isDate && value) {
        value = formatDate(value);
      }
      // Escape commas and quotes
      value = value.toString().replace(/"/g, '""');
      return `"${value}"`;
    }).join(',');
  }).join('\n');

  const csv = headers + '\n' + rows;

  // Create download link
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${viewType}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Format date
function formatDate(timestamp) {
  console.log('Formatting timestamp:', timestamp);
  
  if (!timestamp) return '-';
  
  let date;
  if (timestamp._seconds) {
    date = new Date(timestamp._seconds * 1000);
  } else if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }
  
  console.log('Formatted date:', date);

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}