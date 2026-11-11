# Thiệp mời tốt nghiệp · Minh Quân

Trang thiệp mời một trang, mobile-first. Vite + React + TypeScript + GSAP.

## Chạy thử

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # kiểm tra kiểu + build ra dist/
```

## Sửa nội dung

Mọi chữ trên thiệp nằm trong [src/content.ts](src/content.ts). Mảng `sections` là các mục thông tin
(Thời gian, Địa điểm...). Khi có địa điểm, sửa `value` của mục `place`. Muốn thêm mục mới, thêm một
object vào mảng, thiệp tự cao thêm.

## Link riêng cho từng bạn

Thêm `?to=Tên` vào cuối link:

```
https://<user>.github.io/<repo>/?to=Thanh%20Mai
```

Không có `?to=` thì thiệp ghi "Mời bạn". Tên dài tối đa 40 ký tự.

## Intro

- Lần đầu mở link: chạy intro (khoảng 7 giây, có nút **Bỏ qua**).
- Sau khi xem xong hoặc bỏ qua, trình duyệt lưu cờ `introSeen` trong localStorage; lần sau vào thẳng thiệp.
- Nút **Intro** ở góc phải dưới để xem lại bất cứ lúc nào.
- Thêm `?intro` vào link để ép chạy intro (tiện khi test).
- Người dùng bật "giảm chuyển động" của hệ điều hành sẽ không thấy intro, chỉ thấy thiệp tĩnh.

Lưu ý: site tĩnh không có backend nên cờ "đã xem" chỉ nằm trên từng trình duyệt/thiết bị, bạn không xem
được ai đã mở link. Muốn thống kê lượt mở cần thêm dịch vụ bên ngoài (ví dụ Google Analytics).

## Deploy lên GitHub Pages (tự động)

1. Tạo repo trên GitHub, đẩy code lên nhánh `main` (nhớ commit cả `package-lock.json`).
2. Vào **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Mỗi lần push lên `main`, workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) tự build và deploy.
   Có thể chạy tay ở tab **Actions → Deploy to GitHub Pages → Run workflow**.
4. Link site nằm ở tab Actions (bước deploy) hoặc Settings → Pages.
