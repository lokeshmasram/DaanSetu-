// Simplified stat button handler - works reliably
(function() {
  'use strict';
  
  // Make this available globally immediately
  window.viewDonationDetailsByCategory = function(category) {
    console.log("🎯 viewDonationDetailsByCategory called with:", category);
    
    // Get token
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login first");
      window.location.href = "/index.html";
      return;
    }
    
    // Show loading notification
    console.log("📡 Fetching donations...");
    
    // Fetch donations
    fetch("/api/donations/history", {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch donations");
      return res.json();
    })
    .then(result => {
      const donations = Array.isArray(result.donations) ? result.donations : [];
      console.log("✅ Got donations:", donations.length);
      
      // Filter by category
      let filtered = [];
      let title = "";
      
      switch(category) {
        case 'total':
          filtered = donations;
          title = "All Donations";
          break;
          
        case 'completed':
          filtered = donations.filter(d => d.status === 'completed');
          title = "Completed Donations";
          break;
          
        case 'pending':
          filtered = donations.filter(d => 
            d.status === 'pending' || 
            d.status === 'available' || 
            d.status === 'accepted' || 
            d.status === 'picked_up' || 
            d.status === 'received'
          );
          title = "Pending Donations";
          break;
          
        case 'cancelled':
          filtered = donations.filter(d => 
            d.status === 'cancelled' || d.status === 'rejected'
          );
          title = "Cancelled Donations";
          break;
          
        case 'ngos-helped':
          // Special handling for NGOs
          const ngosMap = new Map();
          donations.forEach(d => {
            if ((d.status === 'accepted' || d.status === 'picked_up' || 
                 d.status === 'received' || d.status === 'completed') && d.matchedNgoId) {
              if (!ngosMap.has(d.matchedNgoId)) {
                ngosMap.set(d.matchedNgoId, {
                  ngoId: d.matchedNgoId,
                  ngoName: d.ngoName || 'Unknown NGO',
                  donations: []
                });
              }
              ngosMap.get(d.matchedNgoId).donations.push(d);
            }
          });
          
          filtered = Array.from(ngosMap.values()).map(ngo => ({
            ngoName: ngo.ngoName,
            totalDonations: ngo.donations.length,
            completedCount: ngo.donations.filter(d => d.status === 'completed').length,
            matchedCount: ngo.donations.filter(d => d.status !== 'completed').length,
            lastDonation: ngo.donations[ngo.donations.length - 1]?.createdAt
          }));
          title = "NGOs Helped";
          break;
      }
      
      console.log("📊 Filtered:", filtered.length, "items for", category);
      
      // Store in sessionStorage
      try {
        sessionStorage.setItem('detailViewData', JSON.stringify(filtered));
        sessionStorage.setItem('detailViewTitle', title);
        sessionStorage.setItem('detailViewType', category);
        console.log("✅ Data stored in sessionStorage");
        
        // Navigate
        console.log("🚀 Navigating to detail view...");
        window.location.href = '/donor-detail-view.html';
      } catch (e) {
        console.error("❌ Error storing data:", e);
        alert("Error: " + e.message);
      }
    })
    .catch(error => {
      console.error("❌ Error:", error);
      alert("Failed to load donations: " + error.message);
    });
  };
  
  console.log("✅ Simplified stats handler loaded");
})();
