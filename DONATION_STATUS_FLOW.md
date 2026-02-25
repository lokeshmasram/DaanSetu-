# Donation Status Flow

## Overview
This document explains the complete donation lifecycle and status transitions in the DaanSetu platform.

## Donation Status States

### 1. **pending** (Initial State)
- **When**: Donor creates a new donation
- **Description**: Donation is waiting for an NGO to accept it
- **Visible to**: NGOs within 15km radius
- **Actions available**:
  - Donor: Can cancel the donation
  - NGO: Can view and accept the donation

### 2. **accepted**
- **When**: NGO accepts the donation
- **Description**: NGO has committed to collecting the donation
- **Notifications**: Donor receives real-time notification and email
- **Fields updated**:
  - `status`: "accepted"
  - `matchedNgoId`: ID of the accepting NGO
  - `acceptedAt`: Timestamp
- **Actions available**:
  - Donor: Mark as picked up
  - NGO: View donation details

### 3. **picked_up**
- **When**: Donor confirms the donation has been picked up by NGO
- **Description**: Items have been collected from donor
- **Notifications**: NGO receives real-time notification
- **Fields updated**:
  - `status`: "picked_up"
  - `pickedUpAt`: Timestamp
- **Actions available**:
  - NGO: Mark as received

### 4. **received**
- **When**: NGO confirms receipt of the donation
- **Description**: NGO has received and verified the donated items
- **Notifications**: Donor receives confirmation
- **Fields updated**:
  - `status`: "received"
  - `receivedAt`: Timestamp
- **Actions available**:
  - NGO: Mark as completed

### 5. **completed**
- **When**: NGO marks the donation as distributed/completed
- **Description**: Donation lifecycle is complete
- **Fields updated**:
  - `status`: "completed"
  - `completedAt`: Timestamp
- **Impact**: Counts toward platform statistics

### 6. **cancelled**
- **When**: Donor cancels before NGO acceptance
- **Description**: Donation request has been cancelled
- **Restrictions**: Can only cancel donations in "pending" state
- **Fields updated**:
  - `status`: "cancelled"
  - `cancelledAt`: Timestamp
  - `cancelledBy`: Donor ID

## Status Transition Rules

```
pending → accepted → picked_up → received → completed
   ↓
cancelled (only from pending state)
```

## API Endpoints

### Create Donation
- **Route**: `POST /api/donations/list`
- **Initial Status**: "pending"
- **Notifications**: Real-time to nearby NGOs

### View Available Donations (NGO)
- **Route**: `GET /api/donations/available`
- **Filters**: Status = "pending", within 15km
- **Returns**: Sorted by distance

### Accept Donation (NGO)
- **Route**: `POST /api/donations/:donationId/accept`
- **Requirements**:
  - User must be NGO
  - NGO must be verified
  - Donation status must be "pending"
- **Updates**: Status to "accepted", sets matchedNgoId and acceptedAt
- **Notifications**: 
  - Socket.IO event to donor
  - Email to donor with NGO details

### Mark as Picked Up (Donor)
- **Route**: `POST /api/donations/:donationId/picked-up`
- **Requirements**: Status must be "accepted"
- **Updates**: Status to "picked_up"

### Mark as Received (NGO)
- **Route**: `POST /api/donations/:donationId/received`
- **Requirements**: Status must be "picked_up"
- **Updates**: Status to "received"

### Mark as Completed (NGO)
- **Route**: `POST /api/donations/:donationId/complete`
- **Requirements**: Matched NGO only
- **Updates**: Status to "completed"

### Cancel Donation (Donor)
- **Route**: `POST /api/donations/:donationId/cancel`
- **Requirements**: 
  - Must be donation owner
  - Status must be "pending"
- **Updates**: Status to "cancelled"

## Key Changes (Recent Updates)

### Status Terminology Updates
- **Old**: "available" → **New**: "pending"
- **Old**: "matched" → **New**: "accepted"

### Rationale
- "pending" better describes donations waiting for NGO acceptance
- "accepted" clearly indicates NGO commitment
- More intuitive status progression for users

## Database Fields

```javascript
{
  donorId: string,
  donorName: string,
  donorPhone: string,
  itemType: string,
  quantity: string,
  description: string,
  pickupAddress: string,
  coordinates: { lat: number, lng: number },
  status: "pending" | "accepted" | "picked_up" | "received" | "completed" | "cancelled",
  matchedNgoId: string | null,
  createdAt: Timestamp,
  acceptedAt: Timestamp | null,
  pickedUpAt: Timestamp | null,
  receivedAt: Timestamp | null,
  completedAt: Timestamp | null,
  cancelledAt: Timestamp | null,
  cancelledBy: string | null
}
```

## Real-time Notifications

### New Donation Created
- **Event**: "new-donation"
- **Recipients**: NGOs within 15km
- **Data**: Donation details + distance

### Donation Accepted
- **Event**: "donationAccepted"
- **Recipient**: Donor
- **Data**: { donationId, ngoName, message }

### Donation Picked Up
- **Event**: "donation-picked-up"
- **Recipient**: Matched NGO
- **Data**: { donationId, message }

### Donation Received
- **Event**: "donation-received"
- **Recipient**: Donor
- **Data**: { donationId, message }

### Donation Cancelled
- **Event**: "donation-cancelled"
- **Recipient**: Donor
- **Data**: { donationId, message }

## Email Notifications

### Donation Accepted Email
- **Recipient**: Donor
- **Trigger**: NGO accepts donation
- **Content**:
  - Donation details (ID, type, quantity)
  - NGO information (name, phone, address)
  - Confirmation message

---

**Last Updated**: February 13, 2026
**Version**: 2.0
