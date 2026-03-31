# Frontend - BTL HDV

Frontend cho he thong BTL HDV duoc xay dung bang React + Vite + TailwindCSS.

## Tong quan

Ung dung hien tai tap trung vao nhom man hinh xac thuc:

- Dang nhap
- Dang ky
- Quen mat khau
- Dat lai mat khau theo token

## Cong nghe su dung

- React 19
- Vite 8
- React Router DOM 7
- Axios
- TailwindCSS 3
- ESLint 9

## Cau truc thu muc chinh

```text
frontend/
	src/
		pages/
			Login.jsx
			Register.jsx
			ForgotPassword.jsx
			ResetPassword.jsx
		App.jsx
		main.jsx
```

## Dinh tuyen hien tai

- `/login`: Trang dang nhap
- `/register`: Trang dang ky
- `/forgotpassword`: Trang quen mat khau
- `/resetpassword/:token`: Trang dat lai mat khau
- `/`: Tu dong dieu huong ve `/login`

## Chay local

Yeu cau:

- Node.js 20+
- npm

Lenh chay:

```bash
cd frontend
npm install
npm run dev
```

Frontend mac dinh chay tai:

- `http://localhost:3000`

## Build production

```bash
cd frontend
npm run build
npm run preview
```

## Chay bang Docker Compose

Tai thu muc goc du an:

```bash
docker compose up --build
```

Service frontend duoc map cong:

- `3000:3000`

## Bien moi truong

Trong `docker-compose.yml`, frontend dang su dung:

- `VITE_USER_SERVICE_URL=http://localhost:3001/api/users`

Neu chay local va can mo rong them API, co the tao file `.env` trong thu muc `frontend` voi cac bien `VITE_*`.

## Ghi chu

- `ResetPassword.jsx` dang goi truc tiep endpoint: `http://localhost:3001/api/users/resetpassword/:token`.
- Cac trang `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx` hien chu yeu la giao dien, chua ket noi day du voi backend.
