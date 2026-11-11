# Thiệp mời tốt nghiệp · Minh Quân

Trang thiệp mời, mobile-first. Vite + React + TypeScript + GSAP.

## Chạy thử

```bash
npm install
cp .env.example .env      # rồi điền danh sách khách + địa điểm (xem bên dưới)
npm run dev               # http://localhost:5173/cl/thiendat/
npm run build             # kiểm tra kiểu + build ra dist/
```

## Danh sách người nhận và địa điểm (.env)

Hai thứ này **không nằm trong repo**: file `.env` đã được `.gitignore` chặn. Mẫu ở [.env.example](.env.example).

```env
# Mỗi dòng một thiệp:  đường-dẫn | tên | lead (tuỳ chọn) | câu nối (tuỳ chọn)
INVITES="
ityu | Đoàn khoa ITYU | Mời | tham dự lễ tốt nghiệp của
cl
cl/thiendat | Thiên Đạt
vuviet | Vũ Việt
"

VENUE=Nhà hàng Hoa Sen, 123 Nguyễn Văn Cừ, Q.5, TP.HCM
```

- Đường dẫn chỉ dùng `a-z`, `0-9`, `-`, `_` và `/`. `cl/thiendat` cho ra link `https://<site>/cl/thiendat/`.
- Bỏ trống tên thì thiệp ghi "Mời bạn". `lead` mặc định "Mời bạn", câu nối mặc định "đến dự lễ tốt nghiệp của".
- `VENUE` để trống thì thiệp ghi "Sẽ cập nhật sau".
- Thêm người mới: thêm một dòng vào `INVITES`, cập nhật secret trên GitHub (bên dưới), chạy lại workflow.

### Mức bảo mật thực tế

Đây là site tĩnh, nên bất cứ thứ gì hiển thị trên thiệp đều có thể bị xem bởi người mở trang đó. Cách làm hiện tại:

- Danh sách khách và địa chỉ **không có trong repo** và không có trong file JS dùng chung.
- Khi build, mỗi đường dẫn nhận một trang riêng **chỉ chứa dữ liệu của chính nó**. Người mở `/cl/thiendat/` không đọc được tên người khác.
- Địa chỉ chỉ có trong trang của từng người được mời, không có ở trang chủ công khai.
- Link `/cl/thiendat/` đoán được nếu biết tên. Muốn khó đoán hơn, dùng đường dẫn có chuỗi ngẫu nhiên, ví dụ `cl/thiendat-x7k2`.

## Intro

- Lần đầu mở một link: chạy intro (khoảng 7 giây, có nút **Bỏ qua**).
- Xem xong hoặc bỏ qua thì trình duyệt lưu cờ riêng cho link đó trong localStorage; lần sau vào thẳng thiệp.
- Nút **Intro** ở góc phải dưới để xem lại. Thêm `?intro` vào link để ép chạy intro khi test.
- Người bật "giảm chuyển động" của hệ điều hành sẽ không thấy intro, chỉ thấy thiệp tĩnh.
- Cờ "đã xem" chỉ nằm trên từng trình duyệt; site tĩnh không cho bạn biết ai đã mở link.

## Deploy lên GitHub Pages (tự động)

1. Tạo repo **Public**, đẩy code lên nhánh `main` (commit cả `package-lock.json`, **không** commit `.env`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → New repository secret**, tạo hai secret:
   - `INVITES`: dán nguyên nội dung nhiều dòng (không cần dấu ngoặc kép), ví dụ
     ```
     ityu | Đoàn khoa ITYU | Mời | tham dự lễ tốt nghiệp của
     cl/thiendat | Thiên Đạt
     ```
   - `VENUE`: địa chỉ tổ chức.
4. Mỗi lần push lên `main`, [workflow](.github/workflows/deploy.yml) tự build và deploy. Đổi secret xong thì vào
   **Actions → Deploy to GitHub Pages → Run workflow** để build lại.

Nếu chưa tạo secret, build vẫn chạy nhưng mọi link chỉ hiện thiệp chung "Mời bạn".
