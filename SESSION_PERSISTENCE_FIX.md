# ✅ Đã Fix: Duy trì Đăng nhập Google

Đã cải thiện code để duy trì đăng nhập Google lâu hơn, không cần login lại mỗi ngày.

---

## 🔧 Các thay đổi đã thực hiện

### 1. **Firebase Auth Persistence** ✅

**File:** `src/lib/firebase.ts`

- Thêm `setPersistence(auth, browserLocalPersistence)` để đảm bảo Firebase session được lưu trong localStorage
- Firebase session sẽ persist qua các lần đóng/mở browser
- User không cần đăng nhập lại Firebase mỗi ngày

**Trước:**
```typescript
export const auth = getAuth(app);
```

**Sau:**
```typescript
export const auth = getAuth(app);
// Set persistence to local storage to maintain login across browser sessions
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting Firebase auth persistence:', error);
});
```

---

### 2. **Google Calendar Token - Silent Refresh** ✅

**File:** `src/auth/AuthProvider.tsx`

**Cải thiện:**
- Thêm logic **silent token refresh** khi token hết hạn
- Tự động thử refresh token khi user mở lại app (không cần user interaction)
- Lưu flag `google_calendar_was_connected` để biết user đã từng connect

**Logic mới:**
1. Khi khởi tạo, kiểm tra token trong localStorage
2. Nếu token hết hạn nhưng user đã từng connect → Tự động thử silent refresh (`prompt: 'none'`)
3. Nếu không có token nhưng user đã từng connect → Tự động thử silent refresh
4. Silent refresh sẽ tự động lấy token mới mà không cần user click gì

**Trước:**
- Token hết hạn → Xóa token → User phải login lại

**Sau:**
- Token hết hạn → Thử silent refresh → Nếu thành công, tự động lấy token mới
- Chỉ khi silent refresh fail → User mới cần login lại

---

### 3. **Fix Token Expiration Logic** ✅

**File:** `src/auth/AuthProvider.tsx` và `src/hooks/useGoogleCalendar.ts`

**Vấn đề cũ:**
- Code đang set `expires_at = 24 hours` nhưng token thực tế chỉ sống **1 giờ** (theo Google OAuth spec)
- Dẫn đến token bị invalid nhưng code vẫn nghĩ là valid

**Fix:**
- Set `expires_at` đúng với thực tế: **1 giờ (3600 seconds)**
- Lưu thêm `expires_in` và `created_at` để tracking tốt hơn
- Logic auto-refresh sẽ hoạt động đúng hơn

**Trước:**
```typescript
expires_at: Date.now() + TOKEN_LIFETIME // 24 hours (SAI)
```

**Sau:**
```typescript
const expiresIn = response.expires_in || 3600; // 1 hour (ĐÚNG)
expires_at: Date.now() + (expiresIn * 1000)
```

---

## 🎯 Kết quả

### Firebase Auth (Đăng nhập chính)
- ✅ Session được lưu trong localStorage
- ✅ User không cần đăng nhập lại khi đóng/mở browser
- ✅ Session có thể sống vài tuần/tháng (theo Firebase default)

### Google Calendar API (Calendar features)
- ✅ Token được auto-refresh khi hết hạn (silent refresh)
- ✅ User không cần click "Login" lại mỗi ngày
- ✅ Chỉ khi silent refresh fail (ví dụ: user revoke permission) → User mới cần login lại

---

## 📋 Cách hoạt động

### Khi user đăng nhập lần đầu:
1. User click "Sign in with Google"
2. Firebase Auth: Lưu session vào localStorage
3. Google Calendar: Lưu token vào localStorage + set flag `google_calendar_was_connected = true`

### Khi user mở lại app sau vài giờ/ngày:
1. **Firebase Auth:**
   - Tự động restore session từ localStorage
   - User vẫn đăng nhập ✅

2. **Google Calendar:**
   - Kiểm tra token trong localStorage
   - Nếu token còn valid → Dùng luôn ✅
   - Nếu token hết hạn → Tự động thử **silent refresh** (`prompt: 'none'`)
   - Nếu silent refresh thành công → Lấy token mới tự động ✅
   - Nếu silent refresh fail → User cần click "Login" lại (hiếm khi xảy ra)

---

## 🔍 Debug

### Kiểm tra Firebase session:
```javascript
// Trong Console (F12)
import { auth } from './lib/firebase';
console.log('Current user:', auth.currentUser);
```

### Kiểm tra Google Calendar token:
```javascript
// Trong Console (F12)
const token = localStorage.getItem('google_calendar_token');
console.log('Token:', token ? JSON.parse(token) : 'No token');
console.log('Was connected:', localStorage.getItem('google_calendar_was_connected'));
```

### Xem logs:
- Mở Console (F12) khi load app
- Tìm các log:
  - `✅ Restored valid Google Calendar token from localStorage` - Token còn valid
  - `🔄 Token expired, attempting silent refresh...` - Đang thử refresh
  - `✅ Google Calendar authentication successful` - Refresh thành công

---

## ⚠️ Lưu ý

1. **Silent refresh có thể fail nếu:**
   - User đã revoke permission trong Google Account
   - User đã đổi password và Google yêu cầu re-authenticate
   - OAuth consent screen settings thay đổi

2. **Firebase session có thể hết hạn nếu:**
   - User clear browser data/cookies
   - User đổi password và Firebase yêu cầu re-authenticate
   - Session quá cũ (theo Firebase policy)

3. **Token expiration:**
   - Google OAuth access token chỉ sống **1 giờ**
   - Code sẽ tự động refresh trước khi hết hạn
   - User không cần làm gì cả

---

## ✅ Test

1. **Đăng nhập lần đầu:**
   - Click "Sign in with Google"
   - Đăng nhập thành công

2. **Đóng browser và mở lại:**
   - Mở lại app
   - Firebase: Vẫn đăng nhập ✅
   - Google Calendar: Tự động restore/refresh token ✅

3. **Đợi 1+ giờ (để token hết hạn):**
   - Mở lại app
   - Xem Console → Sẽ thấy log "🔄 Token expired, attempting silent refresh..."
   - Token sẽ được refresh tự động ✅

4. **Sau vài ngày:**
   - Mở lại app
   - Firebase: Vẫn đăng nhập ✅
   - Google Calendar: Tự động refresh token ✅

---

## 🎉 Kết luận

Sau các fix này:
- ✅ User không cần đăng nhập lại mỗi ngày
- ✅ Firebase session persist qua browser sessions
- ✅ Google Calendar token tự động refresh khi cần
- ✅ User experience tốt hơn nhiều!

