# A001 — cài đặt / React + TypeScript

Phiên bản mã nguồn: 0.1.0-prototype. Đây là mẫu hoạt động cục bộ, chưa phải bản phát hành production của toàn bộ thư viện. Mã nguồn gốc của mẫu này dùng giấy phép MIT; giấy phép đó không áp dụng cho các tài liệu khác của sản phẩm.

## File và phụ thuộc

Cần React có `useSyncExternalStore` (React 18+) và TypeScript. Không cần thêm gói runtime, thư viện chuyển động, script từ xa hoặc tài nguyên hình ảnh. Cấu hình Vite React/TS và Next.js tiêu chuẩn hỗ trợ CSS Modules. Phiên bản và kết quả build thực tế được ghi trong báo cáo kiểm tra bản mẫu; có mã nguồn không có nghĩa là mọi phiên bản React/Next/Vite đều đã được kiểm tra.

Sao chép toàn bộ thư mục vào `src/recipes/state-relay/` hoặc thư mục component hiện có của dự án. Giữ nguyên các đường dẫn sau:

```text
state-relay/
  Example.tsx
  SelectedExample.tsx
  config.json
  src/createStateRelay.ts
  src/useStateRelay.ts
  src/StateRelay.module.css
```

Các hàm hỗ trợ cục bộ đã có trong gói. `SelectedExample.tsx` dùng cấu hình đã chọn; `Example.tsx` là ví dụ hoàn chỉnh, có thể tái sử dụng với giá trị mặc định. Có thể import controller riêng, không cần giao diện mẫu.

## Vite

Trong ứng dụng React/TS hiện có:

```tsx
import SelectedExample from './recipes/state-relay/SelectedExample';
export default function Screen() {
  return <SelectedExample />;
}
```

Điều chỉnh đường dẫn import theo cấu trúc thư mục của dự án. Không cài lại React hoặc cập nhật dự án lên latest chỉ để dùng mẫu này.

## Next.js App Router

Import cùng component `SelectedExample` vào trang hoặc component khác. Ví dụ và hook đã có `'use client'`; trang vẫn có thể là Server Component. API trình duyệt chỉ chạy trong trình xử lý sự kiện. SSR hiển thị nút có ngữ nghĩa ở trạng thái `idle`; snapshot đầu tiên khi hydrate khớp với phía server. Thao tác sao chép cần JavaScript: không dùng component này làm cách duy nhất để truy cập dữ liệu quan trọng.

## Thao tác của ứng dụng

```tsx
'use client';
import { useStateRelay } from './src/useStateRelay';

export function SaveButton() {
  const { state, statusMessage, controller } = useStateRelay('Sẵn sàng lưu');
  async function save() {
    if (state === 'pending') return;
    await controller.run(async (signal) => {
      const response = await fetch('/api/save', { method: 'POST', signal });
      if (!response.ok) throw new Error('Máy chủ từ chối lưu');
    }, { pending: 'Đang lưu', success: 'Đã lưu', error: 'Không thể lưu' });
  }
  return <>
    <button type="button" aria-disabled={state === 'pending'} aria-busy={state === 'pending'} onClick={() => void save()}>Lưu</button>
    <p role="status" aria-live="polite" aria-atomic="true">{statusMessage}</p>
  </>;
}
```

Đoạn mã này minh họa API thao tác. Để có chuyển động trực quan, dùng cấu trúc các lớp giao diện và import CSS trong `Example.tsx` đầy đủ. `run()` bắt đầu ngay, không chờ hiệu ứng. Chỉ chuyển sang `success` khi Promise được cung cấp hoàn tất thành công. `fetch` không tự reject với HTTP 4xx/5xx: ứng dụng phải kiểm tra `response.ok`.

## Quy tắc điều khiển

- `begin(message?)` lập tức phát trạng thái `pending` và trả về ticket có `requestId` cùng `AbortSignal`.
- `settle(ticket, 'success' | 'error', message?)` chỉ nhận kết quả của ticket hiện tại. Kết quả trùng lặp hoặc đã cũ bị bỏ qua; phương thức trả về `false`.
- `run(operation, messages?)` trả về `{status:'success',value}`, `{status:'error',error}` hoặc `{status:'stale'}`. Lỗi reject của thao tác được xử lý. Phương thức không cung cấp backend, phân quyền hoặc logic nghiệp vụ.
- `reset(message?)` / `cancel(message?)` vô hiệu hóa ticket hiện tại và trở về `idle`. `AbortSignal` chỉ dừng được thao tác hỗ trợ nó. Clipboard không hỗ trợ hủy: kết quả đến muộn bị bỏ qua, nhưng nội dung có thể đã được ghi vào bộ nhớ tạm.
- `destroy()` giải phóng vĩnh viễn một controller dùng độc lập. Sau đó phải tạo instance mới. React hook dùng `cancel` có thể tái sử dụng khi cleanup; React gỡ subscription. Chu kỳ setup/cleanup/setup của Strict Mode vẫn được hỗ trợ.
- `subscribe`, `getSnapshot`, `getServerSnapshot` cung cấp store cục bộ. Không quét DOM, tạo RAF, timer, observer hoặc listener toàn cục.
- Replay, scrub, pause và reverse không áp dụng cho phản hồi trạng thái. Reset là thao tác rõ ràng của người dùng. Thông báo lỗi không tự biến mất theo timer.

## Cấu hình và khả năng truy cập

`locale`: `en`, `ru` hoặc `vi`, mặc định `en`; `accent`: chỉ nhận `#RRGGBB`; `motion`: `off`, `subtle`, `expressive`. Thời gian chuyển mặc định là 120ms / 180ms. Chỉ báo chỉ xoay khi thao tác thật còn `pending`, không hiển thị phần trăm giả. CSS phản hồi ngay khi `prefers-reduced-motion` thay đổi. Off/reduce tắt chuyển động và xoay nhưng giữ biểu tượng pending tĩnh, văn bản và kết quả.

Ví dụ giữ nguyên vùng nhấn của nút bằng các nhãn xếp chồng trong grid. `aria-disabled` giữ tiêu điểm bàn phím; trình xử lý sự kiện chặn kích hoạt lặp lại khi pending. Vùng trạng thái `aria-live` thông báo kết quả. Các bản sao trang trí của nhãn được ẩn khỏi cây trợ năng. Tab, Space, Enter và cảm ứng cùng dùng một nút `button` gốc. Tiêu điểm và thao tác nghiệp vụ không phải chờ CSS.

Khi thay nhãn, giữ vùng đã chừa sẵn và kiểm tra văn bản dài EN/RU/VI ở mức thu phóng 200%. Đổi ngôn ngữ không cần đo kích thước hoặc listener resize. CSS Modules cô lập tên class. Giữ kiểu `:focus-visible`; không áp dụng transform của ứng dụng lên các lớp icon/label trang trí.

## Kiểm tra

1. Dùng Clipboard trên HTTPS hoặc localhost. Chỉ báo thành công sau khi `writeText` thành công; từ chối quyền phải hiển thị lỗi.
2. Chọn “Lỗi · mô phỏng”: thông báo phải ghi rõ đây là lỗi cục bộ, không gửi request đến server.
3. Kiểm tra hai instance, thao tác nhanh liên tiếp, đổi kịch bản khi pending, reset và unmount. Thành công đến muộn không được ghi đè lỗi mới hơn.
4. Tắt chuyển động và đổi tùy chọn giảm chuyển động của hệ điều hành trong lúc pending. Kiểm tra bàn phím, cảm ứng, chiều rộng 320–1440px và cả EN/RU/VI.
5. Chạy typecheck/build của dự án đích cho Next.js và Vite. Chỉ ghi một nền tảng là đã kiểm tra khi có kết quả thực tế.
6. Kiểm thử controller thuần: Node 24+, chạy `node --test controller.test.mjs` trong thư mục gói. Các test này kiểm tra race và cleanup, không thay thế kiểm tra trên trình duyệt.

Clipboard có thể hoàn tất trước khi trình duyệt hiển thị một frame pending. Không thêm thời gian chờ tối thiểu giả.
