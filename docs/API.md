# 📡 API Documentation — Date Request Platform

Base URL: `https://yourdomain.com/api/v1`

All authenticated routes require:
```
Authorization: Bearer <access_token>
```

---

## 🔐 Authentication

### POST /auth/register
Create a new sender account.

**Body:**
```json
{
  "fullName": "Shuvo Ahmed",
  "username": "shuvo123",
  "email": "shuvo@example.com",
  "password": "SecurePass@123"
}
```

**Response 201:**
```json
{
  "access_token": "eyJ...",
  "user": { "id": "uuid", "fullName": "Shuvo Ahmed", "role": "sender" }
}
```

---

### POST /auth/login
**Body:**
```json
{ "identifier": "shuvo@example.com", "password": "SecurePass@123", "rememberMe": true }
```
**Response 200:** Same as register.

---

### POST /auth/logout
Clears refresh token cookie. No body required.

---

### POST /auth/refresh
Uses `refresh_token` httpOnly cookie. Returns new `access_token`.

---

### POST /auth/forgot-password
```json
{ "email": "user@example.com" }
```

---

### POST /auth/reset-password/:token
```json
{ "password": "NewSecurePass@123" }
```

---

### GET /auth/check-username?username=shuvo123
```json
{ "available": true }
```

---

### GET /auth/me *(auth)*
Returns current user info.

---

### PATCH /auth/me *(auth)*
```json
{ "fullName": "New Name", "email": "new@email.com", "currentPassword": "old", "newPassword": "new" }
```

---

## 💌 Date Requests *(auth required)*

### GET /requests
Returns all requests owned by current user.

**Response:**
```json
{
  "requests": [
    {
      "id": 1, "uuid": "...", "token": "XK9mPq2vR7",
      "isActive": true, "viewCount": 24, "responseCount": 3,
      "createdAt": "2026-06-27T..."
    }
  ],
  "total": 1
}
```

---

### POST /requests
```json
{
  "secretLetter": "I made this just for you 💕",
  "themeColor": "#FF6B9D"
}
```
**Response 201:** Returns created request with `token`.

---

### GET /requests/:id *(uuid)*
Returns single request detail.

---

### PUT /requests/:id
```json
{ "secretLetter": "Updated letter", "themeColor": "#C23B77", "isActive": false }
```

---

### DELETE /requests/:id
**Response:** `{ "message": "Request deleted successfully" }`

---

### GET /requests/:id/analytics
```json
{
  "foods":     { "Pizza": 5, "Sushi": 3 },
  "places":    { "Coffee Shop": 4 },
  "activities":{ "Movie Night": 6 },
  "responsesOverTime": [{ "label": "Jun 27", "count": 2 }],
  "avgLoveMeter": 87.5,
  "total": 8
}
```

---

## 🌐 Public Routes *(no auth)*

### GET /public/date/:token
Load date request page data for receiver.
```json
{
  "id": 1, "senderName": "Shuvo Ahmed",
  "themeColor": "#FF6B9D", "secretLetter": "..."
}
```

---

### POST /public/date/:token/respond
Submit receiver's response.
```json
{
  "receiverName": "Sarah",
  "selectedFoods": ["Pizza", "Sushi"],
  "selectedActivity": "Movie Night",
  "selectedPlace": "Coffee Shop",
  "selectedDate": "2026-06-27T00:00:00.000Z",
  "selectedTime": "7:30 PM",
  "loveMeter": 98,
  "personalMessage": "Can't wait! ❤️"
}
```
**Response 201:** `{ "message": "Response submitted!", "responseId": "uuid" }`

---

### POST /public/date/:token/view
Log a page view. No body required.

---

## 💬 Responses *(auth required)*

### GET /responses?requestId=uuid
List responses for owned requests. `requestId` is optional.

### GET /responses/:id
Get single response detail (must own the parent request).

---

## 📊 Dashboard *(auth required)*

### GET /dashboard/stats
```json
{
  "totalRequests": 5, "totalViews": 124, "totalResponses": 18,
  "yesRate": 89, "unreadNotifications": 3
}
```

### GET /dashboard/notifications
```json
{
  "notifications": [{ "uuid": "...", "message": "💌 Someone responded!", "isRead": false }],
  "unreadCount": 3
}
```

### PATCH /dashboard/notifications/:id/read
Mark single notification as read.

### PATCH /dashboard/notifications/read-all
Mark all notifications as read.

### GET /dashboard/export?format=csv&requestId=uuid
Download CSV or HTML export of responses.

---

## 👑 Admin Routes *(admin role required)*

### GET /admin/stats
Platform-wide statistics.

### GET /admin/analytics
Aggregated data across all requests/responses.

---

### GET /admin/users?page=1&limit=20&status=active&search=shuvo
### GET /admin/users/:id
### PATCH /admin/users/:id/suspend
```json
{ "suspended": true }
```
### DELETE /admin/users/:id

---

### GET /admin/requests?limit=50&status=active
### DELETE /admin/requests/:id

---

### GET /admin/responses?page=1&limit=20&status=confirmed&device=mobile&search=Sarah
### GET /admin/responses/:id
### PATCH /admin/responses/:id/status
```json
{ "status": "confirmed" }
```
### DELETE /admin/responses/:id

---

### GET /admin/export?type=users|responses&format=csv|json|pdf

### GET /admin/logs?action=login&date=2026-06-27&limit=50

---

### GET  /admin/settings/notifications
### POST /admin/settings/notifications
```json
{
  "telegramBotToken": "123:ABC",
  "telegramChatId": "-100123",
  "adminEmail": "admin@domain.com",
  "discordWebhook": "https://discord.com/api/webhooks/..."
}
```
### POST /admin/settings/notifications/test

### GET  /admin/settings/platform
### POST /admin/settings/platform
```json
{ "siteName": "DateRequest", "maxRequests": 0, "maintenance": false }
```

### DELETE /admin/danger/clear-responses
### DELETE /admin/danger/clear-logs

---

## ⚡ WebSocket Events

Connect: `ws://yourdomain.com/ws?token=<access_token>`

### Server → Client Events

**new_response**
```json
{
  "type": "new_response",
  "data": {
    "responseId": "uuid",
    "senderName": "Shuvo",
    "receiverName": "Sarah",
    "loveMeter": 98,
    "selectedPlace": "Coffee Shop",
    "country": "BD"
  }
}
```

---

## ❌ Error Responses

All errors return:
```json
{ "message": "Human-readable error description" }
```

| Status | Meaning                        |
|--------|--------------------------------|
| 400    | Bad request / Validation error |
| 401    | Unauthorized / Token expired   |
| 403    | Forbidden / Suspended          |
| 404    | Resource not found             |
| 409    | Conflict (duplicate)           |
| 429    | Rate limit exceeded            |
| 500    | Internal server error          |

**Token expired response:**
```json
{ "message": "Token expired", "code": "TOKEN_EXPIRED" }
```
Client should call `POST /auth/refresh` to get a new access token.

---

## 🔒 Rate Limits

| Route Group | Limit       |
|-------------|-------------|
| `/auth/*`   | 10 req/min  |
| `/public/*` | 30 req/min  |
| `/api/v1/*` | 100 req/min |
