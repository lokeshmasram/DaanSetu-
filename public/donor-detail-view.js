// Get view type from sessionStorage or URL path
let viewType = sessionStorage.getItem('detailViewType');

if (!viewType) {
  // Fallback to URL path detection
  const path = window.location.pathname;
  viewType = path.includes('completed') ? 'completed' :
             path.includes('pending') ? 'pending' :
             path.includes('cancelled') ? 'cancelled' :
             path.includes('ngos-helped') ? 'ngos-helped' :
             path.includes('all') ? 'all' : null;
}

let currentPage = 1;
const itemsPerPage = 20;
let allData = [];
let filteredData = [];

// View configurations for donor
const viewConfigs = {
  total: {
    title: 'All Donations',
    icon: 'fa-gift',
    endpoint: '/api/donations/history',
    columns: [
      { key: 'id', label: 'ID', width: '10%' },
      { key: 'itemType', label: 'Item Type', width: '15%' },
      { key: 'quantity', label: 'Quantity', width: '10%' },
      { key: 'pickupAddress', label: 'Location', width: '20%' },
      { key: 'status', label: 'Status', width: '10%', isStatus: true },
      { key: 'createdAt', label: 'Created', width: '15%', isDate: true },
      { key: 'ngoName', label: 'NGO', width: '20%' }
    ],
    filters: [
      { key: 'status', label: 'Status', type: 'select', options: ['all', 'available', 'matched', 'completed', 'cancelled'] },
      { key: 'search', label: 'Search', type: 'text', placeholder: 'Search by item type or location...' }
    ]
  },
  completed: {
    title: 'Completed Donations',
    icon: 'fa-check-circle',
    endpoint: '/api/donations/history',
    columns: [
      { key: 'id', label: 'ID', width: '8%' },
      { key: 'itemType', label: 'Item Type', width: '12%' },
      { key: 'quantity', label: 'Qty', width: '8%' },
      { key: 'pickupAddress', label: 'Location', width: '18%' },
      { key: 'ngoName', label: 'NGO Name', width: '25%' },
      { key: 'completedAt', label: 'Completed', width: '15%', isDate: true }
    ],
    filters: [
      { key: 'search', label: 'Search', type: 'text', placeholder: 'Search by item type or NGO...' }
    ]
  },
  pending: {
    title: 'Pending Donations',
    icon: 'fa-clock',
    endpoint: '/api/donations/history',
    columns: [
      { key: 'id', label: 'ID', width: '10%' },
      { key: 'itemType', label: 'Item Type', width: '15%' },
      { key: 'quantity', label: 'Quantity', width: '10%' },
      { key: 'pickupAddress', label: 'Location', width: '25%' },
      { key: 'status', label: 'Status', width: '10%', isStatus: true },
      { key: 'createdAt', label: 'Created', width: '15%', isDate: true },
      { key: 'ngoName', label: 'NGO', width: '15%' }
    ],
    filters: [
      { key: 'status', label: 'Status', type: 'select', options: ['all', 'available', 'matched'] },
      { key: 'search', label: 'Search', type: 'text', placeholder: 'Search by item type or NGO...' }
    ]
  },
  cancelled: {
    title: 'Cancelled Donations',
    icon: 'fa-times-circle',
    endpoint: '/api/donations/history',
    columns: [
      { key: 'id', label: 'ID', width: '10%' },
      { key: 'itemType', label: 'Item Type', width: '15%' },
      { key: 'quantity', label: 'Quantity', width: '10%' },
      { key: 'pickupAddress', label: 'Location', width: '25%' },
      { key: 'cancelledAt', label: 'Cancelled', width: '15%', isDate: true },
      { key: 'createdAt', label: 'Created', width: '15%', isDate: true }
    ],
    filters: [
      { key: 'search', label: 'Search', type: 'text', placeholder: 'Search by item type or location...' }
    ]
  },
  'ngos-helped': {
    title: 'NGOs Helped',
    icon: 'fa-hands-helping',
    endpoint: '/api/donations/history',
    columns: [
      { key: 'ngoName', label: 'NGO Name', width: '25%' },
      { key: 'matchedCount', label: 'Donations Matched', width: '20%' },
      { key: 'completedCount', label: 'Donations Completed', width: '20%' },
      { key: 'totalDonations', label: 'Total Donations', width: '15%' },
      { key: 'lastDonation', label: 'Last Donation', width: '20%', isDate: true }
    ],
    filters: [
      { key: 'search', label: 'Search', type: 'text', placeholder: 'Search by NGO name...' }
    ]
  }
};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  console.log("📖 Detail view page loading...");
  console.log("   ViewType:", viewType);
  console.log("   Available configs:", Object.keys(viewConfigs));
  
  if (!viewType || !viewConfigs[viewType]) {
    console.error("❌ Invalid view type:", viewType);
    console.log("⚠️  Redirecting to donor-dashboard...");
    window.location.href = '/donor-dashboard';
    return;
  }

  const config = viewConfigs[viewType];
  console.log("✅ Config loaded for:", viewType);
  
  // Set page title and icon
  const pageTitleEl = document.getElementById('pageTitle');
  const headerIconEl = document.getElementById('headerIcon');
  
  if (pageTitleEl) pageTitleEl.textContent = config.title;
  if (headerIconEl) headerIconEl.className = `fas ${config.icon}`;
  document.title = `${config.title} - DaanSetu Donor`;

  // Setup filters
  setupFilters(config.filters);

  // Check if data is in sessionStorage (from direct navigation)
  const sessionData = sessionStorage.getItem('detailViewData');
  console.log("🔍 Checking sessionStorage for data...");
  console.log("   Data found:", !!sessionData);
  
  if (sessionData) {
    try {
      console.log("📦 Parsing sessionStorage data...");
      const data = JSON.parse(sessionData);
      console.log("✅ Data parsed successfully. Count:", data.length);
      
      allData = data;
      sessionStorage.removeItem('detailViewData'); // Clear after use
      filteredData = [...allData];
      
      const loadingSpinner = document.getElementById('loadingSpinner');
      const tableContainer = document.getElementById('tableContainer');
      const emptyState = document.getElementById('emptyState');
      
      if (loadingSpinner) loadingSpinner.style.display = 'none';
      
      if (allData.length === 0) {
        console.log("⚠️  No data to display");
        if (emptyState) emptyState.style.display = 'block';
      } else {
        console.log("✅ Rendering table with", allData.length, "items");
        if (tableContainer) tableContainer.style.display = 'block';
        renderTable();
      }
    } catch (error) {
      console.error("❌ Error parsing session data:", error);
      await loadData(config.endpoint);
    }
  } else {
    console.log("ℹ️  No sessionStorage data, loading from API...");
    await loadData(config.endpoint);
  }
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
      
      (data.donations || []).forEach(donation => {
        // More robust check for NGO data
        const hasNgoData = donation.ngoName && donation.matchedNgoId;
        console.log('Processing donation for NGO aggregation:', { 
          donationId: donation.id, 
          hasNgoData, 
          ngoName: donation.ngoName, 
          matchedNgoId: donation.matchedNgoId,
          status: donation.status
        });
        
        if (hasNgoData) {
          if (!ngoMap.has(donation.matchedNgoId)) {
            ngoMap.set(donation.matchedNgoId, {
              ngoName: donation.ngoName,
              matchedCount: 0,
              completedCount: 0,
              lastDonation: null
            });
          }
          
          const ngoData = ngoMap.get(donation.matchedNgoId);
          ngoData.matchedCount++;
          
          if (donation.status === 'completed') {
            ngoData.completedCount++;
          }
          
          const donationDate = donation.completedAt || donation.matchedAt || donation.createdAt;
          
          // Fix the date comparison logic
          if (donationDate) {
            // Convert Firestore timestamp to JavaScript Date
            let jsDate;
            if (donationDate._seconds) {
              jsDate = new Date(donationDate._seconds * 1000);
            } else if (donationDate.seconds) {
              jsDate = new Date(donationDate.seconds * 1000);
            } else {
              jsDate = new Date(donationDate);
            }
            
            // Compare with existing lastDonation date
            if (!ngoData.lastDonation) {
              ngoData.lastDonation = donationDate;
            } else {
              // Convert existing lastDonation to JavaScript Date for comparison
              let existingDate;
              if (ngoData.lastDonation._seconds) {
                existingDate = new Date(ngoData.lastDonation._seconds * 1000);
              } else if (ngoData.lastDonation.seconds) {
                existingDate = new Date(ngoData.lastDonation.seconds * 1000);
              } else {
                existingDate = new Date(ngoData.lastDonation);
              }
              
              // Update if this donation is more recent
              if (jsDate > existingDate) {
                ngoData.lastDonation = donationDate;
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
              matchedCount: 5,
              completedCount: 3,
              lastDonation: { _seconds: Math.floor(Date.now() / 1000) - 86400 } // 1 day ago
            },
            {
              ngoName: 'Community Care Center',
              matchedCount: 3,
              completedCount: 2,
              lastDonation: { _seconds: Math.floor(Date.now() / 1000) - 172800 } // 2 days ago
            },
            {
              ngoName: 'Food for All NGO',
              matchedCount: 7,
              completedCount: 6,
              lastDonation: { _seconds: Math.floor(Date.now() / 1000) - 432000 } // 5 days ago
            }
          ];
        }
      }
    } else if (viewType === 'completed') {
      // Filter for completed donations only
      allData = (data.donations || []).filter(donation => donation.status === 'completed');
      
      // If we're in demo mode and there's no data, add some mock data for testing
      if (allData.length === 0) {
        console.log('No completed donations found, checking if we should add demo data');
        // Check if we're in demo mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('Adding demo data for completed donations view');
          // Add some demo data for testing
          allData = [
            {
              id: 'demo-completed-1',
              itemType: 'Clothing',
              quantity: '10 items',
              pickupAddress: '123 Main St, City',
              completedAt: { _seconds: Math.floor(Date.now() / 1000) - 86400 },
              ngoName: 'Helping Hands Foundation',
              status: 'completed'
            },
            {
              id: 'demo-completed-2',
              itemType: 'Food',
              quantity: '20 kg',
              pickupAddress: '456 Oak Ave, City',
              completedAt: { _seconds: Math.floor(Date.now() / 1000) - 172800 },
              ngoName: 'Community Care Center',
              status: 'completed'
            }
          ];
        }
      }
    } else if (viewType === 'pending') {
      // Filter for pending donations (available or matched)
      allData = (data.donations || []).filter(donation => 
        donation.status === 'available' || donation.status === 'matched');
      
      // If we're in demo mode and there's no data, add some mock data for testing
      if (allData.length === 0) {
        console.log('No pending donations found, checking if we should add demo data');
        // Check if we're in demo mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('Adding demo data for pending donations view');
          // Add some demo data for testing
          allData = [
            {
              id: 'demo-pending-1',
              itemType: 'Books',
              quantity: '15 items',
              pickupAddress: '789 Pine St, City',
              status: 'matched',
              createdAt: { _seconds: Math.floor(Date.now() / 1000) - 3600 },
              ngoName: 'Education First NGO'
            },
            {
              id: 'demo-pending-2',
              itemType: 'Toys',
              quantity: '5 items',
              pickupAddress: '321 Elm St, City',
              status: 'available',
              createdAt: { _seconds: Math.floor(Date.now() / 1000) - 7200 },
            }
          ];
        }
      }
    } else if (viewType === 'cancelled') {
      // Filter for cancelled donations only
      allData = (data.donations || []).filter(donation => donation.status === 'cancelled');
      
      // If we're in demo mode and there's no data, add some mock data for testing
      if (allData.length === 0) {
        console.log('No cancelled donations found, checking if we should add demo data');
        // Check if we're in demo mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('Adding demo data for cancelled donations view');
          // Add some demo data for testing
          allData = [
            {
              id: 'demo-cancelled-1',
              itemType: 'Electronics',
              quantity: '3 items',
              pickupAddress: '654 Maple St, City',
              cancelledAt: { _seconds: Math.floor(Date.now() / 1000) - 86400 },
              createdAt: { _seconds: Math.floor(Date.now() / 1000) - 172800 },
              status: 'cancelled'
            }
          ];
        }
      }
    } else {
      // All donations
      allData = data.donations || [];
      
      // If we're in demo mode and there's no data, add some mock data for testing
      if (allData.length === 0) {
        console.log('No donations found, checking if we should add demo data');
        // Check if we're in demo mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('Adding demo data for all donations view');
          // Add some demo data for testing
          allData = [
            {
              id: 'demo-all-1',
              itemType: 'Clothing',
              quantity: '10 items',
              pickupAddress: '123 Main St, City',
              status: 'completed',
              createdAt: { _seconds: Math.floor(Date.now() / 1000) - 86400 },
              ngoName: 'Helping Hands Foundation',
              completedAt: { _seconds: Math.floor(Date.now() / 1000) - 43200 }
            },
            {
              id: 'demo-all-2',
              itemType: 'Food',
              quantity: '20 kg',
              pickupAddress: '456 Oak Ave, City',
              status: 'matched',
              createdAt: { _seconds: Math.floor(Date.now() / 1000) - 172800 },
              ngoName: 'Community Care Center',
              matchedAt: { _seconds: Math.floor(Date.now() / 1000) - 86400 }
            },
            {
              id: 'demo-all-3',
              itemType: 'Books',
              quantity: '15 items',
              pickupAddress: '789 Pine St, City',
              status: 'available',
              createdAt: { _seconds: Math.floor(Date.now() / 1000) - 3600 }
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
          emptyStateMessage.innerHTML = 'You haven\'t worked with any NGOs yet.<br>Complete donations to see NGOs you\'ve helped here.';
        } else {
          emptyStateMessage.textContent = 'You haven\'t made any donations yet. Make your first donation to get started!';
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
  try {
    const config = viewConfigs[viewType];
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    
    console.log('🎨 renderTable() called');
    console.log('   ViewType:', viewType);
    console.log('   Config found:', !!config);
    console.log('   tableHead found:', !!tableHead);
    console.log('   tableBody found:', !!tableBody);
    console.log('   Filtered data count:', filteredData.length);
    
    if (!config || !tableHead || !tableBody) {
      console.error('❌ Missing required elements for table rendering');
      return;
    }

    // Render headers
    try {
      const headers = config.columns.map(col => `<th style="width: ${col.width}">${col.label}</th>`).join('');
      tableHead.innerHTML = `<tr>${headers}</tr>`;
      console.log('✅ Table headers rendered');
    } catch (error) {
      console.error('❌ Error rendering headers:', error);
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    console.log(`📄 Pagination: showing ${pageData.length} items (${startIndex}-${endIndex} of ${filteredData.length})`);

    // Render rows
    try {
      const rows = pageData.map(item => {
        const cells = config.columns.map(col => {
          let value = item[col.key] || '-';
          
          if (col.isDate && value !== '-') {
            value = formatDate(value);
          } else if (col.isStatus) {
            value = `<span class="status-badge status-${value}">${value}</span>`;
          } else if (col.key === 'id') {
            value = value.substring(0, 12) + '...';
          }
          
          return `<td>${value}</td>`;
        }).join('');
        
        return `<tr>${cells}</tr>`;
      }).join('');
      
      tableBody.innerHTML = rows;
      console.log(`✅ Table body rendered with ${pageData.length} rows`);
    } catch (error) {
      console.error('❌ Error rendering rows:', error);
    }

    // Update pagination
    updatePagination();
  } catch (error) {
    console.error('❌ Fatal error in renderTable:', error);
  }
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