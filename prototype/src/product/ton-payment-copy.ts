import type {ProductLocale} from './routes';

/** Future checkout copy only. Importing this dictionary does not enable payments. */
export interface TonPaymentCopy {
  title: string;
  lead: string;
  assetLabel: string;
  networkLabel: string;
  addressLabel: string;
  amountLabel: string;
  commentLabel: string;
  expiresLabel: string;
  invoiceLabel: string;
  tonLabel: string;
  usdtLabel: string;
  network: string;
  copyAddress: string;
  copyAmount: string;
  copyComment: string;
  copied: string;
  copyFailed: string;
  feesHelp: string;
  commentHelp: string;
  noCommentHelp: string;
  networkHelp: string;
  updatesHelp: string;
  statusUnavailable: string;
  recoveryHelp: string;
  newInvoice: string;
  viewOrder: string;
  download: string;
  statuses: Record<'waiting' | 'confirming' | 'paid' | 'ready' | 'review' | 'expired' | 'unavailable' | 'deliveryFailed', {title: string; body: string}>;
  reviewReasons: Record<'underpaid' | 'overpaid' | 'late' | 'missingComment' | 'wrongNetwork', string>;
}

const en: TonPaymentCopy = {
  title: 'Pay through the TON network',
  lead: 'Send the selected currency from a wallet or exchange that supports it on TON. Use the exact payment details for this order.',
  assetLabel: 'Currency',
  networkLabel: 'Network',
  addressLabel: 'Recipient address',
  amountLabel: 'Amount to arrive',
  commentLabel: 'Payment comment',
  expiresLabel: 'Send before',
  invoiceLabel: 'Payment request number',
  tonLabel: 'TON',
  usdtLabel: 'USDT on TON',
  network: 'TON',
  copyAddress: 'Copy address',
  copyAmount: 'Copy amount',
  copyComment: 'Copy comment',
  copied: 'Copied',
  copyFailed: 'Could not copy. Select the value and copy it manually.',
  feesHelp: 'Pay the transfer fee separately. Check the amount the recipient will receive: it must match the amount shown here.',
  commentHelp: 'Copy the whole comment into the transfer’s comment or memo field. It links the transfer to this order.',
  noCommentHelp: 'If the withdrawal form has no comment or memo field, do not send this payment yet. Use a supported transfer method or ask support how to proceed.',
  networkHelp: 'Use the TON network and the currency shown in this payment request. For USDT, do not choose TRC20, ERC20 or another network.',
  updatesHelp: 'The status updates automatically while this page is open. You can also return to this order in your account.',
  statusUnavailable: 'Could not refresh the payment status. This does not mean the payment failed. Do not send it again; try checking the order later.',
  recoveryHelp: 'For a payment review, keep the order number and transaction hash. Never send your recovery phrase or private key.',
  newInvoice: 'Get new payment details',
  viewOrder: 'Open order',
  download: 'Download files',
  statuses: {
    waiting: {title: 'Waiting for payment', body: 'Send the selected currency using the details below. If you have already sent it, wait for the status to update.'},
    confirming: {title: 'Confirming the transfer', body: 'The transfer has been found. We are checking its details and confirmation on the network. Do not pay again.'},
    paid: {title: 'Payment received', body: 'Your payment is confirmed. File access is being prepared. No further payment is needed.'},
    ready: {title: 'Files are available', body: 'Your payment is confirmed and the purchased files are ready to download.'},
    review: {title: 'Payment needs review', body: 'The transfer could not be matched to this payment request automatically. Do not send another payment while it is being reviewed.'},
    expired: {title: 'Payment request expired', body: 'Do not send a new transfer using these details. If you have already sent one, do not pay again: check the order status or request a review. Otherwise, get new payment details.'},
    unavailable: {title: 'Payments are not available yet', body: 'Do not send funds. The payment service is not connected yet.'},
    deliveryFailed: {title: 'Payment received; files are unavailable', body: 'Your payment is confirmed, but file access could not be prepared. Do not pay again. Keep the order number for support.'},
  },
  reviewReasons: {
    underpaid: 'The amount received is below the requested amount. Do not send the difference until the payment has been reviewed.',
    overpaid: 'The amount received is above the requested amount. The payment needs review.',
    late: 'The transfer arrived after the payment deadline. The payment needs review; do not pay again.',
    missingComment: 'The transfer has no matching payment comment. Keep its transaction hash and request a review.',
    wrongNetwork: 'A transfer on another network cannot be credited to this TON payment request automatically. Request a review before sending anything else.',
  },
};

const ru: TonPaymentCopy = {
  title: 'Оплата через сеть TON',
  lead: 'Отправьте выбранную валюту из кошелька или с биржи, которые поддерживают её в сети TON. Используйте точные реквизиты этого заказа.',
  assetLabel: 'Валюта',
  networkLabel: 'Сеть',
  addressLabel: 'Адрес получателя',
  amountLabel: 'Должно поступить',
  commentLabel: 'Комментарий к переводу',
  expiresLabel: 'Отправьте до',
  invoiceLabel: 'Номер счёта',
  tonLabel: 'TON',
  usdtLabel: 'USDT в сети TON',
  network: 'TON',
  copyAddress: 'Скопировать адрес',
  copyAmount: 'Скопировать сумму',
  copyComment: 'Скопировать комментарий',
  copied: 'Скопировано',
  copyFailed: 'Не удалось скопировать. Выделите значение и скопируйте вручную.',
  feesHelp: 'Оплатите комиссию перевода отдельно. Проверьте сумму, которую получит адресат: она должна совпасть с указанной здесь.',
  commentHelp: 'Скопируйте комментарий целиком в поле «Комментарий» или memo при отправке. По нему мы свяжем перевод с этим заказом.',
  noCommentHelp: 'Если в форме вывода нет поля для комментария или memo, пока не отправляйте этот платёж. Выберите подходящий способ перевода или уточните порядок оплаты у поддержки.',
  networkHelp: 'Выберите сеть TON и валюту, указанную в этом счёте. Для USDT не выбирайте TRC20, ERC20 или другую сеть.',
  updatesHelp: 'Пока страница открыта, статус обновляется автоматически. К заказу можно вернуться и через кабинет.',
  statusUnavailable: 'Не удалось обновить статус оплаты. Это не означает, что платёж не прошёл. Не отправляйте деньги повторно; проверьте заказ позже.',
  recoveryHelp: 'Для разбора платежа сохраните номер заказа и хеш перевода. Никому не отправляйте seed-фразу или приватный ключ.',
  newInvoice: 'Получить новые реквизиты',
  viewOrder: 'Открыть заказ',
  download: 'Скачать файлы',
  statuses: {
    waiting: {title: 'Ожидаем оплату', body: 'Отправьте выбранную валюту по реквизитам ниже. Если уже отправили, дождитесь обновления статуса.'},
    confirming: {title: 'Подтверждаем перевод', body: 'Перевод найден. Проверяем реквизиты и подтверждение в сети. Не оплачивайте повторно.'},
    paid: {title: 'Оплата получена', body: 'Ваш платёж подтверждён. Готовим доступ к файлам. Доплачивать не нужно.'},
    ready: {title: 'Файлы доступны', body: 'Ваш платёж подтверждён. Купленные файлы готовы к скачиванию.'},
    review: {title: 'Нужно проверить платёж', body: 'Не удалось автоматически сопоставить перевод с этим счётом. Пока идёт проверка, не отправляйте ещё один платёж.'},
    expired: {title: 'Срок оплаты счёта истёк', body: 'Не отправляйте новый перевод по этим реквизитам. Если уже отправили, не платите повторно: проверьте статус заказа или запросите разбор платежа. Если не отправляли, получите новые реквизиты.'},
    unavailable: {title: 'Оплата пока недоступна', body: 'Не отправляйте средства. Платёжный сервис ещё не подключён.'},
    deliveryFailed: {title: 'Оплата получена, файлы недоступны', body: 'Ваш платёж подтверждён, но доступ к файлам подготовить не удалось. Не платите повторно. Сохраните номер заказа для обращения в поддержку.'},
  },
  reviewReasons: {
    underpaid: 'Поступило меньше указанной суммы. Не отправляйте доплату до проверки платежа.',
    overpaid: 'Поступило больше указанной суммы. Платёж нужно проверить.',
    late: 'Перевод поступил после срока оплаты. Платёж нужно проверить; не оплачивайте повторно.',
    missingComment: 'В переводе нет комментария, совпадающего со счётом. Сохраните хеш перевода и запросите разбор платежа.',
    wrongNetwork: 'Перевод в другой сети не может автоматически оплатить этот счёт в TON. Запросите разбор платежа, прежде чем отправлять что-либо ещё.',
  },
};

const vi: TonPaymentCopy = {
  title: 'Thanh toán qua mạng TON',
  lead: 'Gửi loại tiền đã chọn từ ví hoặc sàn hỗ trợ loại tiền đó trên mạng TON. Dùng đúng thông tin thanh toán của đơn hàng này.',
  assetLabel: 'Loại tiền',
  networkLabel: 'Mạng',
  addressLabel: 'Địa chỉ nhận',
  amountLabel: 'Số tiền cần nhận đủ',
  commentLabel: 'Nội dung chuyển tiền',
  expiresLabel: 'Gửi trước',
  invoiceLabel: 'Mã yêu cầu thanh toán',
  tonLabel: 'TON',
  usdtLabel: 'USDT trên mạng TON',
  network: 'TON',
  copyAddress: 'Sao chép địa chỉ',
  copyAmount: 'Sao chép số tiền',
  copyComment: 'Sao chép nội dung chuyển tiền',
  copied: 'Đã sao chép',
  copyFailed: 'Không sao chép được. Hãy chọn giá trị và sao chép thủ công.',
  feesHelp: 'Trả phí chuyển tiền riêng. Kiểm tra số tiền bên nhận sẽ nhận: số tiền đó phải khớp với số tiền hiển thị ở đây.',
  commentHelp: 'Sao chép toàn bộ nội dung vào ô ghi chú hoặc memo khi gửi. Nội dung này giúp liên kết khoản chuyển với đơn hàng.',
  noCommentHelp: 'Nếu biểu mẫu rút tiền không có ô ghi chú hoặc memo, chưa gửi khoản thanh toán này. Chọn cách chuyển phù hợp hoặc hỏi bộ phận hỗ trợ cách thanh toán.',
  networkHelp: 'Chọn mạng TON và đúng loại tiền trong yêu cầu này. Với USDT, không chọn TRC20, ERC20 hoặc mạng khác.',
  updatesHelp: 'Trạng thái tự cập nhật khi trang này đang mở. Bạn cũng có thể mở lại đơn hàng trong tài khoản.',
  statusUnavailable: 'Không cập nhật được trạng thái thanh toán. Điều này không có nghĩa là thanh toán thất bại. Đừng gửi lại; hãy kiểm tra đơn hàng sau.',
  recoveryHelp: 'Để kiểm tra khoản thanh toán, hãy giữ mã đơn hàng và mã giao dịch. Không gửi cụm từ khôi phục hoặc khóa riêng tư cho bất kỳ ai.',
  newInvoice: 'Lấy thông tin thanh toán mới',
  viewOrder: 'Mở đơn hàng',
  download: 'Tải tệp',
  statuses: {
    waiting: {title: 'Đang chờ thanh toán', body: 'Gửi loại tiền đã chọn theo thông tin bên dưới. Nếu đã gửi, hãy chờ trạng thái cập nhật.'},
    confirming: {title: 'Đang xác nhận giao dịch', body: 'Đã tìm thấy khoản chuyển. Chúng tôi đang kiểm tra thông tin và xác nhận trên mạng. Đừng thanh toán lại.'},
    paid: {title: 'Đã nhận thanh toán', body: 'Thanh toán đã được xác nhận. Quyền tải tệp đang được chuẩn bị. Bạn không cần trả thêm.'},
    ready: {title: 'Đã có thể tải tệp', body: 'Thanh toán đã được xác nhận và các tệp đã mua sẵn sàng để tải.'},
    review: {title: 'Cần kiểm tra khoản thanh toán', body: 'Chưa thể tự động khớp khoản chuyển với yêu cầu này. Đừng gửi khoản thanh toán khác trong khi chờ kiểm tra.'},
    expired: {title: 'Yêu cầu thanh toán đã hết hạn', body: 'Đừng gửi khoản chuyển mới theo thông tin này. Nếu đã gửi, đừng thanh toán lại: kiểm tra trạng thái đơn hàng hoặc yêu cầu kiểm tra giao dịch. Nếu chưa gửi, lấy thông tin thanh toán mới.'},
    unavailable: {title: 'Chưa thể thanh toán', body: 'Đừng gửi tiền. Dịch vụ thanh toán chưa được kết nối.'},
    deliveryFailed: {title: 'Đã nhận tiền, chưa thể tải tệp', body: 'Thanh toán đã được xác nhận, nhưng chưa chuẩn bị được quyền tải tệp. Đừng thanh toán lại. Giữ mã đơn hàng để liên hệ hỗ trợ.'},
  },
  reviewReasons: {
    underpaid: 'Số tiền nhận được thấp hơn số tiền yêu cầu. Đừng gửi phần còn thiếu trước khi khoản thanh toán được kiểm tra.',
    overpaid: 'Số tiền nhận được cao hơn số tiền yêu cầu. Cần kiểm tra khoản thanh toán.',
    late: 'Khoản chuyển đến sau hạn thanh toán. Cần kiểm tra khoản thanh toán; đừng thanh toán lại.',
    missingComment: 'Khoản chuyển không có nội dung khớp với yêu cầu thanh toán. Giữ mã giao dịch và yêu cầu kiểm tra.',
    wrongNetwork: 'Khoản chuyển trên mạng khác không thể tự động thanh toán yêu cầu TON này. Hãy yêu cầu kiểm tra trước khi gửi thêm.',
  },
};

export const tonPaymentCopy: Record<ProductLocale, TonPaymentCopy> = {en, ru, vi};
