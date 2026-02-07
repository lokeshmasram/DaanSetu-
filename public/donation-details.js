// Get donation ID from URL
const urlParams = new URLSearchParams(window.location.search);
const donationId = urlParams.get('id');

// DOM elements
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const detailsContent = document.getElementById('detailsContent');

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  if (!donationId) {
    showError('No donation ID provided');
    return;
  }

  await loadDonationDetails();
});

// Load donation details
async function loadDonationDetails() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    // Fetch donation details
    const donationResponse = await fetch(`/api/donations/${donationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!donationResponse.ok) {
      const errorData = await donationResponse.json();
      console.error('Donation API error:', errorData);
      throw new Error(errorData.message || 'Failed to load donation details');
    }

    const donation = await donationResponse.json();
    console.log('Donation loaded:', donation);

    // Check if donation is matched or completed
    if (donation.status !== 'matched' && donation.status !== 'completed') {
      showError('This donation has not been accepted by an NGO yet');
      return;
    }

    // Fetch NGO details
    const ngoResponse = await fetch(`/api/ngos/details/${donation.matchedNgoId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!ngoResponse.ok) {
      const errorData = await ngoResponse.json();
      console.error('NGO API error:', errorData);
      throw new Error(errorData.message || 'Failed to load NGO details');
    }

    const ngoData = await ngoResponse.json();
    console.log('NGO data loaded:', ngoData);

    // Fetch NGO statistics
    const statsResponse = await fetch(`/api/ngos/statistics/${donation.matchedNgoId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    let ngoStats = {
      totalDonations: 0,
      completedDonations: 0,
      successRate: 0
    };

    if (statsResponse.ok) {
      ngoStats = await statsResponse.json();
    }

    // Fetch volunteer task and details if donation has a pickup task or try to find one anyway
    let volunteerTask = null;
    let volunteerData = null;
    
    try {
      console.log('Attempting to load volunteer task for donation:', donationId);
      console.log('Donation hasPickupTask flag:', donation.hasPickupTask);
      
      // Find the volunteer task for this donation
      const tasksResponse = await fetch(`/api/volunteers/donation-tasks/${donationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (tasksResponse.ok) {
        const taskResult = await tasksResponse.json();
        volunteerTask = taskResult.task;
        console.log('✅ Volunteer task loaded:', volunteerTask);

        // If volunteer is assigned, fetch volunteer details
        if (volunteerTask && volunteerTask.assignedVolunteerId) {
          console.log('Fetching volunteer details for:', volunteerTask.assignedVolunteerId);
          const volunteerResponse = await fetch(`/api/volunteers/${volunteerTask.assignedVolunteerId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (volunteerResponse.ok) {
            volunteerData = await volunteerResponse.json();
            console.log('✅ Volunteer data loaded:', volunteerData);
          } else {
            console.warn('Could not fetch volunteer details:', volunteerResponse.status);
          }
        } else {
          console.log('No volunteer assigned to this task yet');
        }
      } else {
        console.log('No volunteer task found for this donation (HTTP', tasksResponse.status + ')');
      }
    } catch (error) {
      console.warn('Could not load volunteer task:', error);
    }

    // Display all data
    displayDonationDetails(donation);
    displayNGODetails(ngoData);
    displayNGOStatistics(ngoStats);
    displayTimeline(donation);
    
    if (volunteerTask && volunteerData) {
      displayVolunteerDetails(volunteerTask, volunteerData);
    }

    // Hide loading, show content
    loadingSpinner.style.display = 'none';
    detailsContent.style.display = 'block';

  } catch (error) {
    console.error('Error loading details:', error);
    showError(error.message || 'Failed to load donation details');
  }
}

// Display donation details
function displayDonationDetails(donation) {
  document.getElementById('itemType').textContent = capitalizeFirst(donation.itemType);
  document.getElementById('quantity').textContent = donation.quantity;
  document.getElementById('description').textContent = donation.description || 'No description provided';
  document.getElementById('pickupAddress').textContent = donation.pickupAddress;

  const statusBadge = document.getElementById('status');
  statusBadge.textContent = getStatusText(donation.status);
  statusBadge.className = `status-badge ${donation.status}`;
}

// Display NGO details
function displayNGODetails(ngo) {
  document.getElementById('ngoName').textContent = ngo.name;
  document.getElementById('ngoRegistrationId').textContent = ngo.registrationId || 'N/A';
  document.getElementById('ngoAddress').textContent = ngo.address || 'N/A';
  document.getElementById('ngoEmail').textContent = ngo.email;
  document.getElementById('ngoPhone').textContent = ngo.phone;
}

// Display NGO statistics
function displayNGOStatistics(stats) {
  document.getElementById('totalDonations').textContent = stats.totalDonations;
  document.getElementById('completedDonations').textContent = stats.completedDonations;
  document.getElementById('successRate').textContent = stats.successRate + '%';
}

// Display volunteer details
function displayVolunteerDetails(task, volunteer) {
  const volunteerCard = document.getElementById('volunteerCard');
  if (volunteerCard) {
    volunteerCard.style.display = 'block';
  }
  
  // Get volunteer name from volunteer data (could be in different fields)
  const volunteerName = volunteer.volunteer?.name || volunteer.name || 'Unknown Volunteer';
  
  document.getElementById('volunteerName').textContent = volunteerName;
  document.getElementById('volunteerTaskType').textContent = capitalizeFirst(task.type || 'N/A');
  document.getElementById('volunteerTaskLocation').textContent = task.location || 'N/A';
  document.getElementById('volunteerTaskDate').textContent = formatDate(task.date) || 'N/A';
  document.getElementById('volunteerEmail').textContent = volunteer.volunteer?.email || volunteer.email || 'N/A';
  document.getElementById('volunteerPhone').textContent = volunteer.volunteer?.phone || volunteer.phone || 'N/A';
}

// Display timeline
function displayTimeline(donation) {
  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';

  const events = [];

  // Donation created
  if (donation.createdAt) {
    events.push({
      date: formatDate(donation.createdAt),
      title: 'Donation Created',
      description: 'You listed this donation on DaanSetu',
      completed: true
    });
  }

  // Donation matched
  if (donation.matchedAt) {
    events.push({
      date: formatDate(donation.matchedAt),
      title: 'Accepted by NGO',
      description: `${donation.ngoName} accepted your donation`,
      completed: true
    });
  }

  // Donation picked up
  if (donation.pickedUpAt) {
    events.push({
      date: formatDate(donation.pickedUpAt),
      title: 'Picked Up',
      description: 'Donation was picked up by volunteer',
      completed: true
    });
  }

  // Donation received
  if (donation.receivedAt) {
    events.push({
      date: formatDate(donation.receivedAt),
      title: 'Received by NGO',
      description: 'NGO confirmed receipt of donation',
      completed: true
    });
  }

  // Donation completed
  if (donation.completedAt) {
    events.push({
      date: formatDate(donation.completedAt),
      title: 'Donation Completed',
      description: 'Thank you for your generosity!',
      completed: true
    });
  }

  // Render timeline items
  events.forEach(event => {
    const item = document.createElement('div');
    item.className = `timeline-item ${event.completed ? 'completed' : ''}`;
    item.innerHTML = `
      <div class="timeline-date">${event.date}</div>
      <div class="timeline-title">${event.title}</div>
      <div class="timeline-desc">${event.description}</div>
    `;
    timeline.appendChild(item);
  });
}

// Helper functions
function showError(message) {
  loadingSpinner.style.display = 'none';
  errorText.textContent = message;
  errorMessage.style.display = 'block';
}

function goBack() {
  // Check if this page was opened in a new window from donor dashboard
  const urlParams = new URLSearchParams(window.location.search);
  const from = urlParams.get('from');
  
  if (from === 'donor-dashboard') {
    // Close this window since it was opened in a new window
    window.close();
  } else {
    // Navigate back to donor dashboard
    window.location.href = '/donor-dashboard';
  }
}

function getStatusText(status) {
  const statusMap = {
    available: 'Available',
    matched: 'Accepted',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  return statusMap[status] || status;
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  
  let date;
  if (timestamp._seconds) {
    date = new Date(timestamp._seconds * 1000);
  } else if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
