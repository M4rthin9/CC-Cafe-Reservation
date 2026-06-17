# Admin Dashboard & User Management Fixes Plan

## Overview
This plan addresses:
1. Fix user management fetching from GAS
2. Add role selection for new users in user management
3. Remove chatbot from booking.html, status.html, and admin.html
4. Enhance settings and notifications functionality
5. Additional dashboard improvements

---

## 1. Fix User Management - Role Fetching Issue

### Current Problem
The `fetchRolesList()` function (admin.js:2805-2823) has issues:
- `populateRoleDropdown()` expects `data.roles.map(r => r.roleName)` but receives `role.roleName`
- The `loadAddUserTable()` doesn't handle errors gracefully

### Fix
- Update `populateRoleDropdown()` to handle both array formats
- Add proper loading/error states to user management table
- Ensure roles are fetched before rendering the add user form

---

## 2. Remove Chatbot from All Pages

### Files to modify:
**booking.html:**
- Remove `<link rel="stylesheet" href="src/css/chatbot.css">` (line 12)
- Remove chat-button HTML (lines 303-304)
- Remove chat-modal HTML (lines 305-323)
- Remove `<script src="src/js/chatbot.js" defer></script>` (line 325)

**status.html:**
- Remove `<link rel="stylesheet" href="src/css/chatbot.css">` (line 11)
- Remove chat-button HTML (lines 98-115)
- Remove `<script src="src/js/chatbot.js" defer></script>` (line 117)

**admin.html:**
- Remove `<link rel="stylesheet" href="src/css/chatbot.css">` (line 9)
- Remove chat-button HTML (lines 505-522)
- Remove `<script src="src/js/chatbot.js" defer></script>` (line 525)

---

## 3. Enhance Settings Page

### Current Settings (admin.html:440-466)
- Page size selection
- Notification toggle

### Proposed Additions to admin.html:
Add after existing settings in view-settings:
```html
<div style="font-size:14px;font-weight:600;margin:16px 0 12px;border-top:1px solid var(--border);padding-top:16px;">🔔 การแจ้งเตือนเพิ่มเติม</div>
<div style="margin-bottom:14px;display:flex;align-items:center;gap:10px;">
  <input type="checkbox" id="settingsEmailNotif" style="cursor:pointer;">
  <label for="settingsEmailNotif" style="font-size:13px;cursor:pointer;">แจ้งเตือนทางอีเมล (เมื่อมีการจองใหม่)</label>
</div>
<div style="margin-bottom:14px;display:flex;align-items:center;gap:10px;">
  <input type="checkbox" id="settingsSoundNotif" style="cursor:pointer;">
  <label for="settingsSoundNotif" style="font-size:13px;cursor:pointer;">เสียงแจ้งเตือน</label>
</div>

<div style="font-size:14px;font-weight:600;margin:16px 0 12px;border-top:1px solid var(--border);padding-top:16px;">🎨 การแสดงผล</div>
<div style="margin-bottom:14px;display:flex;align-items:center;gap:10px;">
  <input type="checkbox" id="settingsDarkMode" style="cursor:pointer;">
  <label for="settingsDarkMode" style="font-size:13px;cursor:pointer;">โหมดมืด</label>
</div>
```

### Update admin.js renderSettingsView() and saveSettings():
- Add new settings fields handling
- Add localStorage persistence for new settings

---

## 4. Fix Notification Panel

### Current Issue
- Notification panel element missing from admin.html
- Needs proper toggle functionality

### Fix
Add notification panel HTML to admin.html (after notifBell):
```html
<div class="notif-panel" id="notifPanel" style="display:none;position:absolute;top:40px;right:0;background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:8px;width:300px;max-height:400px;overflow-y:auto;z-index:999;">
</div>
```

---

## 5. Update User Management Role Fetching

### Fix in admin.js populateRoleDropdown():
```javascript
function populateRoleDropdown(roles) {
  const select = document.getElementById('addUserRole');
  select.innerHTML = '<option value="">เลือกบทบาท</option>';
  roles.forEach(role => {
    const option = document.createElement('option');
    // Handle both formats: role.roleName or role.name
    const roleName = role.roleName || role.name || role;
    option.value = roleName;
    option.textContent = roleName;
    select.appendChild(option);
  });
}
```

---

## Implementation Order

1. **Remove chatbot** from all three HTML files
2. **Fix user management role fetching** in admin.js
3. **Add notification panel HTML** to admin.html
4. **Enhance settings page** with additional options
5. **Update settings JavaScript** to handle new fields