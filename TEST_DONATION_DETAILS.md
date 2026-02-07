# Quick Test Guide - Donation Details Feature

## How to Test the New Donation Details Page

### Prerequisites
1. Server is running: `node server.js`
2. You have a donor account
3. You have at least one donation that has been accepted by an NGO

---

## Test Scenario 1: View Accepted Donation Details

### Steps:
1. **Login as Donor**
   - Go to `http://localhost:3001`
   - Login with donor credentials

2. **Navigate to Dashboard**
   - You should see your donor dashboard
   - Look at the "Recent Donations" section

3. **Identify Accepted Donation**
   - Find a donation with status "Accepted" (green badge)
   - Notice the hint text: "Click to view full details and NGO information"
   - Notice the cursor changes to pointer on hover

4. **Click the Donation Card**
   - Click anywhere on the accepted donation card
   - You should be redirected to `/donation-details?id=DONATION_ID`

5. **Verify Details Page Loads**
   - Loading spinner should appear briefly
   - Page should load with two columns:
     - **Left:** Donation details
     - **Right:** NGO details

6. **Check Donation Information**
   - ✅ Item type displays correctly
   - ✅ Quantity displays correctly
   - ✅ Description shows (or "No description provided")
   - ✅ Pickup location shows
   - ✅ Status badge shows "Accepted" in green

7. **Check Timeline**
   - ✅ "Donation Created" event shows with date
   - ✅ "Accepted by NGO" event shows with NGO name and date
   - ✅ Timeline has visual line connecting events
   - ✅ Completed events have green indicator

8. **Check NGO Information**
   - ✅ Organization name displays
   - ✅ Registration ID shows (or "N/A")
   - ✅ Address displays
   - ✅ Email shows in contact section
   - ✅ Phone shows in contact section

9. **Check NGO Statistics**
   - ✅ Three stat boxes display:
     - Total Donations
     - Completed Donations
     - Success Rate (percentage)
   - ✅ Numbers are accurate
   - ✅ Boxes have hover effect (lift up)

10. **Test Back Button**
    - Click "Back to Dashboard" button
    - Should return to donor dashboard
    - Dashboard should still show all donations

---

## Test Scenario 2: View Completed Donation

### Steps:
1. Find a donation with status "Completed"
2. Click the donation card
3. Verify details page loads
4. **Additional Timeline Events:**
   - ✅ "Picked Up" event (if applicable)
   - ✅ "Received by NGO" event (if applicable)
   - ✅ "Donation Completed" event with date
5. Status badge should show "Completed" in gray

---

## Test Scenario 3: Available Donation (Old Behavior)

### Steps:
1. Find a donation with status "Available"
2. Click the donation card
3. **Expected:** Modal opens (old behavior)
4. **Should NOT:** Navigate to details page
5. This ensures backward compatibility

---

## Test Scenario 4: Error Handling

### Test 4A: Invalid Donation ID
1. Manually navigate to: `http://localhost:3001/donation-details?id=invalid123`
2. **Expected:**
   - Error message displays
   - Shows: "Failed to load donation details"
   - Back button still works

### Test 4B: No Donation ID
1. Navigate to: `http://localhost:3001/donation-details`
2. **Expected:**
   - Error message: "No donation ID provided"
   - Back button works

### Test 4C: Donation Not Accepted
1. Get ID of an available donation
2. Navigate to: `http://localhost:3001/donation-details?id=AVAILABLE_DONATION_ID`
3. **Expected:**
   - Error message: "This donation has not been accepted by an NGO yet"

---

## Test Scenario 5: Responsive Design

### Desktop (1920x1080)
1. Open page on desktop
2. **Check:**
   - ✅ Two columns side-by-side
   - ✅ Cards have equal width
   - ✅ Stat boxes in 3-column grid
   - ✅ All content readable

### Tablet (768x1024)
1. Resize browser or use DevTools
2. **Check:**
   - ✅ Columns still side-by-side (if space allows)
   - ✅ Layout adjusts gracefully

### Mobile (375x667)
1. Resize to mobile size
2. **Check:**
   - ✅ Columns stack vertically
   - ✅ Donation details on top
   - ✅ NGO details below
   - ✅ Stat boxes stack vertically
   - ✅ All text readable
   - ✅ Back button accessible

---

## Test Scenario 6: Visual Elements

### Animations
- ✅ Page slides in smoothly on load
- ✅ Loading spinner rotates
- ✅ Stat boxes lift on hover
- ✅ Back button shifts left on hover

### Colors
- ✅ Background gradient (purple)
- ✅ Cards are white with shadow
- ✅ Headers have purple gradient
- ✅ Status badge colors correct
- ✅ Timeline line is purple
- ✅ Icons display correctly

### Typography
- ✅ Headers are bold and large
- ✅ Labels are semi-bold
- ✅ Values are readable
- ✅ Font sizes appropriate
- ✅ Icons align with text

---

## Test Scenario 7: Performance

### Load Time
1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to donation details page
4. **Check:**
   - ✅ Page loads in < 2 seconds
   - ✅ 3 API calls made (donations, ngos/details, ngos/statistics)
   - ✅ No failed requests
   - ✅ No console errors

### Browser Console
1. Open console (F12)
2. Navigate through the feature
3. **Check:**
   - ✅ No JavaScript errors
   - ✅ No warnings
   - ✅ API responses logged (if debug enabled)

---

## Test Scenario 8: Multiple Browsers

### Chrome
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors

### Firefox
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors

### Safari
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors

### Edge
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors

---

## Test Scenario 9: Data Accuracy

### NGO Statistics Verification
1. Note the NGO ID from donation
2. Manually check database:
   - Count donations where `matchedNgoId = NGO_ID`
   - Count donations where `matchedNgoId = NGO_ID AND status = 'completed'`
   - Calculate success rate: (completed / total) * 100
3. **Verify:** Numbers match what's displayed

### Timeline Verification
1. Check donation document in database
2. **Verify each timestamp:**
   - createdAt → "Donation Created"
   - matchedAt → "Accepted by NGO"
   - pickedUpAt → "Picked Up"
   - receivedAt → "Received by NGO"
   - completedAt → "Donation Completed"
3. **Verify:** Dates format correctly

---

## Test Scenario 10: Security

### Authentication
1. Logout from application
2. Try to access: `http://localhost:3001/donation-details?id=DONATION_ID`
3. **Expected:** Redirected to login page

### Authorization
1. Login as different donor
2. Try to access another donor's donation details
3. **Expected:** Error or no data (depends on API implementation)

---

## Expected Results Summary

### ✅ Success Criteria
- Accepted/completed donations are clickable
- Details page loads without errors
- All donation information displays correctly
- All NGO information displays correctly
- Statistics calculate accurately
- Timeline shows all events
- Page is responsive on all devices
- Animations are smooth
- Back button works
- Error handling is graceful
- No console errors

### ❌ Failure Indicators
- Page doesn't load
- Missing information
- Incorrect statistics
- Timeline missing events
- Layout breaks on mobile
- Console errors
- Slow load times (> 5 seconds)
- Back button doesn't work

---

## Quick Verification Checklist

Use this for rapid testing:

```
[ ] Login as donor
[ ] See accepted donation in list
[ ] Click donation card
[ ] Details page loads
[ ] Donation info correct
[ ] NGO info correct
[ ] Statistics display
[ ] Timeline shows events
[ ] Back button works
[ ] Mobile responsive
[ ] No console errors
```

---

## Reporting Issues

If you find bugs, please document:

1. **What you did:** Step-by-step actions
2. **What you expected:** Expected behavior
3. **What happened:** Actual behavior
4. **Browser:** Chrome/Firefox/Safari/Edge + version
5. **Device:** Desktop/Tablet/Mobile
6. **Screenshots:** If applicable
7. **Console errors:** Copy from DevTools

---

## Sample Test Data

### Create Test Scenario
If you need test data:

1. **Create a donation** (as donor)
2. **Accept it** (as NGO)
3. **Now test** the details page

### Multiple Donations
For NGO statistics testing:
1. Create 5 donations
2. Have NGO accept all 5
3. Mark 3 as completed
4. **Expected stats:**
   - Total: 5
   - Completed: 3
   - Success Rate: 60%

---

**Happy Testing! 🧪**

*If all tests pass, the feature is ready for production!* ✅
