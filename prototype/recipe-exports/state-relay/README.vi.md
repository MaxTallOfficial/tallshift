# State Relay / A001@0.1.0-prototype

Mẫu React + TypeScript hoạt động cục bộ, theo giấy phép MIT. Sao chép toàn bộ thư mục và import SelectedExample.tsx. Cấu hình mặc định: EN, subtle, #3569ed, 120ms. Hỗ trợ EN/RU/VI. ZIP được tạo chứa cấu hình đã chọn trong Studio.

Cài đặt: INSTALL.vi.md. Tích hợp: INTEGRATE.vi.md. Giấy phép: LICENSE.txt. Không thêm thư viện chuyển động ở runtime; dự án cung cấp React 19.3.1. Các phiên bản khác chưa được kiểm tra riêng.

`Example.tsx` thực hiện thao tác sao chép thật. “Lỗi · mô phỏng” được ghi rõ là kịch bản cục bộ. Không dùng timer để kéo dài pending; kết quả thành công đã cũ không ghi đè lỗi mới hơn. Off/reduce tắt chuyển động, giữ thông tin và tiêu điểm bàn phím.

Kiểm thử controller thuần: Node 24+, `node --test controller.test.mjs`. Build Next.js/Vite và kiểm tra trình duyệt được thực hiện riêng; kết quả thực tế được ghi trong báo cáo bản mẫu. Đây chưa phải bản phát hành production của toàn bộ thư viện.
