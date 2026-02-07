// Get view type from URL path
const path = window.location.pathname;
const viewType = path.includes('accepted') ? 'accepted' :
                 path.includes('completed') ? 'completed' :
                 path.includes('pending') ? 'pending' : null;

let currentPage = 1;
const itemsPerPage = 20;
let allData = [];
let filteredData = [];

// View configurations
const viewConfigs = {
  accepted: {
    title: 'Total Accepted Donations',
    icon: 'fa-check-circle',
    columns: [
      { key: 'id', label: 'ID', width: '10%' },
      { key: 'itemType', label: 'Item Type', width: '12%' },
      { key: 'quantity', label: 'Quantity', width: '10%' },
      { key: 'donorName', label: 'Donor', width: '15%' },
      { key: 'donorPhone', label: 'Phone', width: '12%' },
      { key: 'pickupAddress', label: 'Location', width: '18%' },
      { key: 'status', label: 'Status', width: '10%', isStatus: true },
      { key: 'matchedAt', label: 'Accepted On', width: '13%', isDate: true }
    ],
    filters: [
      { key: 'status', label: 'Status', type: 'select', options: ['all', 'matched', 'completed'] },
      { key: 'search', label: 'Search', type: 'text', placeholder: 'Search by donor, item, or location...' }
    ]
  },
  completed: {
    title: 'Completed Donations',
    icon: 'fa-check-double',
    columns: [
      { key: 'id', label: 'ID', width: '10%' },
      { key: 'itemType', label: 'Item Type', width: '12%' },
      { key: 'quantity', label: 'Quantity', width: '10%' },
      { key: 'donorName', label: 'Donor', width: '15%' },
      { key: 'donorPhone', label: 'Phone', width: '12%' },
      { key: 'pickupAddress', label: 'Location', width: '18%' },
      { key: 'matchedAt', label: 'Accepted On', width: '10%', isDate: true },
      { key: 'completedAt', label: 'Completed On', width: '13%', isDate: true }
    ],
    filters: [
      { key: 'search', label: 'Search', type: 'text', placeholder: 'Search by donor, item, or location...' }
    ]
  },
  pending: {
    title: 'Pending Pickup Donations',
    icon: 'fa-clock',
    columns: [
      { key: 'id', label: 'ID', width: '10%' },
      { key: 'itemType', label: 'Item Type', width: '12%' },
      { key: 'quantity', label: 'Quantity', width: '10%' },
      { key: 'donorName', label: 'Donor', width: '15%' },
      { key: 'donorPhone', label: 'Phone', width: '12%' },
      { key: 'pickupAddress', label: 'Location', width: '18%' },
      { key: 'hasPickupTask', label: 'Volunteer Task', width: '10%', isBoolean: true },
      { key: 'matchedAt', label: 'Accepted On', width: '13%', isDate: true }
    ],
    filters: [
      { key: 'hasPickupTask', label: 'Volunteer Task', type: 'select', options: ['all', 'yes', 'no'] },
      { key: 'search', label: 'Search', type: 'text', placeholder: 'Search by donor, item, or location...' }
    ]
  }
};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  if (!viewType || !viewConfigs[viewType]) {
    window.location.href = '/ngo-dashboard';
    return;
  }

  const config = viewConfigs[viewType];
  
  // Set page title and icon
  document.getElementById('pageTitle').textContent = config.title;
  document.getElementById('headerIcon').className = `fas ${config.icon}`;
  document.title = `${config.title} - DaanSetu NGO`;

  // Setup filters
  setupFilters(config.filters);

  // Load data
  await loadData();
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
async function loadData() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    const response = await fetch('/api/donations/history', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load data');
    }

    const result = await response.json();
    const donations = result.donations || [];

    // Filter based on view type
    if (viewType === 'accepted') {
      // All accepted donations (matched or completed)
      allData = donations.filter(d => d.status === 'matched' || d.status === 'completed');
    } else if (viewType === 'completed') {
      // Only completed donations
      allData = donations.filter(d => d.status === 'completed');
    } else if (viewType === 'pending') {
      // Only matched (pending pickup) donations
      allData = donations.filter(d => d.status === 'matched');
    }

    filteredData = [...allData];
    
    document.getElementById('loadingSpinner').style.display = 'none';
    
    if (allData.length === 0) {
      document.getElementById('emptyState').style.display = 'block';
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
      if (filter.key === 'hasPickupTask') {
        // Special handling for boolean filter
        const boolValue = value === 'yes';
        filteredData = filteredData.filter(item => !!item.hasPickupTask === boolValue);
      } else {
        filteredData = filteredData.filter(item => {
          const itemValue = (item[filter.key] || '').toString().toLowerCase();
          return itemValue === value;
        });
      }
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

  // Render rows
  tableBody.innerHTML = pageData.map(item => `
    <tr>
      ${config.columns.map(col => {
        let value = item[col.key] || '-';
        
        if (col.isDate && value !== '-') {
          value = formatDate(value);
        } else if (col.isStatus) {
          value = `<span class="status-badge status-${value}">${value}</span>`;
        } else if (col.isBoolean) {
          const boolValue = !!item[col.key];
          const statusClass = boolValue ? 'status-matched' : 'status-cancelled';
          const statusText = boolValue ? 'Yes' : 'No';
          value = `<span class="status-badge ${statusClass}">${statusText}</span>`;
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
      } else if (col.isBoolean) {
        value = !!item[col.key] ? 'Yes' : 'No';
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
  a.download = `ngo-${viewType}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Format date
function formatDate(timestamp) {
  if (!timestamp) return '-';
  
  let date;
  if (timestamp._seconds) {
    date = new Date(timestamp._seconds * 1000);
  } else if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
