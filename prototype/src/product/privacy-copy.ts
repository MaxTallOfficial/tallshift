/**
 * Data page copy. Every statement mirrors code or deployment configuration:
 * src/server/auth/{policy,security,store,engine}.ts, migrations/0002_auth.sql,
 * wrangler.production.jsonc (Resend endpoint) and ProductApp.tsx (favorites in localStorage).
 * Change this text together with that code. Legal details of the operator await Max Tall's decision.
 */
import type {ProductLocale} from './routes';

export interface PrivacyItem {term: string; text: string}
export interface PrivacySection {id: string; heading: string; body?: string[]; items?: PrivacyItem[]; links?: {label: string; href: string}[]}
export interface PrivacyCopy {navLabel: string; title: string; lead: string; updated: string; sections: PrivacySection[]}

const resendPolicy = 'https://resend.com/legal/privacy-policy';
const cloudflarePolicy = 'https://www.cloudflare.com/privacypolicy/';
const support = 'mailto:support@tallshift.com';

export const privacyCopy: Record<ProductLocale, PrivacyCopy> = {
  ru: {
    navLabel: 'Какие данные мы храним',
    title: 'Какие данные хранит Tallshift',
    lead: 'Каталог, документация и бесплатные примеры работают без аккаунта. Здесь перечислено, что сохраняется, если вы создаёте аккаунт, сколько это хранится и как удалить аккаунт.',
    updated: 'Обновлено 27 ноября 2026 года.',
    sections: [
      {id: 'without-account', heading: 'Без аккаунта', body: [
        'Избранное хранится только в вашем браузере (localStorage) и не отправляется на сервер Tallshift. Чтобы стереть его, уберите материалы из избранного или очистите данные сайта в настройках браузера.',
      ]},
      {id: 'account-data', heading: 'Что хранится, если вы создали аккаунт', items: [
        {term: 'Email', text: 'Нужен для входа и для писем: подтверждения адреса и смены пароля.'},
        {term: 'Пароль', text: 'Хранится только хеш — необратимый отпечаток пароля, вычисленный алгоритмом scrypt. Сам пароль не сохраняется.'},
        {term: 'Сессии входа', text: 'Ключ сессии хранится в виде хеша SHA-256. Вместе с сессией сохраняются IP-адрес и название браузера (user-agent) устройства, с которого вы вошли.'},
        {term: 'Ссылки из писем', text: 'Одноразовые ссылки подтверждения и смены пароля хранятся в виде хеша SHA-256.'},
        {term: 'Счётчики попыток', text: 'Чтобы защитить вход от подбора пароля, мы считаем попытки по IP-адресу и по email. Ключ счётчика хранится в виде хеша SHA-256.'},
      ]},
      {id: 'cookies', heading: 'Cookie', body: [
        'Tallshift ставит два технических cookie: cookie входа (до 30 дней) и cookie защиты форм от подделки запросов (2 часа). Рекламных cookie нет.',
      ]},
      {id: 'retention', heading: 'Сколько хранятся данные', items: [
        {term: 'Аккаунт и email', text: 'Пока вы не удалите аккаунт.'},
        {term: 'Сессия входа', text: 'Перестаёт действовать через 30 дней после входа или через 7 дней без активности, что наступит раньше. Запись о сессии удаляется при выходе, смене пароля или удалении аккаунта.'},
        {term: 'Ссылки из писем', text: 'Подтверждение адреса действует 24 часа, смена пароля — 1 час. После использования ссылка перестаёт работать.'},
        {term: 'Счётчики попыток', text: 'Каждый счётчик действует 10 минут, затем начинается заново.'},
      ]},
      {id: 'processors', heading: 'Кто обрабатывает данные', items: [
        {term: 'Cloudflare', text: 'Хостинг сайта и база данных D1, в которой лежат перечисленные выше данные.'},
        {term: 'Resend', text: 'Отправляет письма подтверждения и смены пароля. Получает ваш email и текст письма. Письма отправляются из региона Токио. Сколько Resend хранит данные, указано в его политике конфиденциальности.'},
        {term: 'Cloudflare Web Analytics', text: 'Сейчас включена. Считает посещения страниц и не ставит cookie.'},
      ], links: [
        {label: 'Политика конфиденциальности Resend', href: resendPolicy},
        {label: 'Политика конфиденциальности Cloudflare', href: cloudflarePolicy},
      ]},
      {id: 'delete', heading: 'Как удалить аккаунт', body: [
        'Войдите и откройте «Кабинет» → «Удалить аккаунт», затем введите пароль. Аккаунт, email, хеш пароля, все сессии и ссылки из писем удаляются сразу и без восстановления. Письмо для этого не нужно.',
        'Если на аккаунте есть записи о покупках, удалить его можно через support@tallshift.com.',
        'Избранное в браузере при этом не затрагивается. Письма, которые уже отправил Resend, и журналы Cloudflare хранятся по правилам этих сервисов.',
      ]},
      {id: 'contact', heading: 'Кто отвечает за данные', body: [
        'Max Tall, автор Tallshift. Юридические реквизиты будут добавлены на эту страницу позже.',
      ], links: [{label: 'Вопросы о данных: support@tallshift.com', href: support}]},
    ],
  },
  en: {
    navLabel: 'What data we keep',
    title: 'What data Tallshift keeps',
    lead: 'The catalog, documentation and free examples work without an account. This page lists what is stored if you create an account, how long it is kept and how to delete your account.',
    updated: 'Updated November 27, 2026.',
    sections: [
      {id: 'without-account', heading: 'Without an account', body: [
        'Saved items are kept only in your browser (localStorage) and are not sent to the Tallshift server. To erase them, remove items from Saved or clear this site’s data in your browser settings.',
      ]},
      {id: 'account-data', heading: 'What is stored when you create an account', items: [
        {term: 'Email address', text: 'Used to sign in and for emails that confirm your address or reset your password.'},
        {term: 'Password', text: 'Only a hash is stored: an irreversible fingerprint of the password, computed with scrypt. The password itself is never saved.'},
        {term: 'Sign-in sessions', text: 'The session key is stored as a SHA-256 hash. The IP address and browser name (user agent) of the device you signed in from are stored with the session.'},
        {term: 'Email links', text: 'One-time confirmation and password reset links are stored as SHA-256 hashes.'},
        {term: 'Attempt counters', text: 'To protect sign-in against password guessing, we count attempts per IP address and per email address. The counter key is stored as a SHA-256 hash.'},
      ]},
      {id: 'cookies', heading: 'Cookies', body: [
        'Tallshift sets two technical cookies: a sign-in cookie (up to 30 days) and a form protection cookie against forged requests (2 hours). There are no advertising cookies.',
      ]},
      {id: 'retention', heading: 'How long data is kept', items: [
        {term: 'Account and email', text: 'Until you delete your account.'},
        {term: 'Sign-in session', text: 'Stops working 30 days after sign-in or after 7 days without activity, whichever comes first. The session record is deleted when you sign out, reset your password or delete your account.'},
        {term: 'Email links', text: 'Address confirmation works for 24 hours, password reset for 1 hour. A link stops working once used.'},
        {term: 'Attempt counters', text: 'Each counter lasts 10 minutes and then starts over.'},
      ]},
      {id: 'processors', heading: 'Who processes the data', items: [
        {term: 'Cloudflare', text: 'Hosts the site and the D1 database that holds the data listed above.'},
        {term: 'Resend', text: 'Sends confirmation and password reset emails. Receives your email address and the message text. Emails are sent from the Tokyo region. How long Resend keeps data is described in its privacy policy.'},
        {term: 'Cloudflare Web Analytics', text: 'Currently on. Counts page visits and sets no cookies.'},
      ], links: [
        {label: 'Resend privacy policy', href: resendPolicy},
        {label: 'Cloudflare privacy policy', href: cloudflarePolicy},
      ]},
      {id: 'delete', heading: 'How to delete your account', body: [
        'Sign in, open Account → Delete account and enter your password. Your account, email address, password hash, all sessions and email links are deleted immediately and cannot be restored. No email is needed.',
        'If the account has purchase records, it can be deleted through support@tallshift.com.',
        'Saved items in your browser are not affected. Emails already sent by Resend and Cloudflare logs are kept under those services’ own rules.',
      ]},
      {id: 'contact', heading: 'Who is responsible for the data', body: [
        'Max Tall, the author of Tallshift. Legal details will be added to this page later.',
      ], links: [{label: 'Questions about your data: support@tallshift.com', href: support}]},
    ],
  },
  vi: {
    navLabel: 'Dữ liệu chúng tôi lưu',
    title: 'Tallshift lưu những dữ liệu nào',
    lead: 'Danh mục, tài liệu và các ví dụ miễn phí dùng được mà không cần tài khoản. Trang này liệt kê những gì được lưu khi bạn tạo tài khoản, lưu trong bao lâu và cách xóa tài khoản.',
    updated: 'Cập nhật ngày 27 tháng 11 năm 2026.',
    sections: [
      {id: 'without-account', heading: 'Khi không có tài khoản', body: [
        'Mục đã lưu chỉ nằm trong trình duyệt của bạn (localStorage) và không được gửi đến máy chủ Tallshift. Để xóa, hãy bỏ các mục khỏi danh sách đã lưu hoặc xóa dữ liệu của trang trong cài đặt trình duyệt.',
      ]},
      {id: 'account-data', heading: 'Dữ liệu được lưu khi bạn tạo tài khoản', items: [
        {term: 'Email', text: 'Dùng để đăng nhập và nhận email xác nhận địa chỉ hoặc đặt lại mật khẩu.'},
        {term: 'Mật khẩu', text: 'Chỉ lưu giá trị băm — dấu vân tay không thể đảo ngược của mật khẩu, tạo bằng thuật toán scrypt. Bản thân mật khẩu không được lưu.'},
        {term: 'Phiên đăng nhập', text: 'Khóa phiên được lưu dưới dạng băm SHA-256. Địa chỉ IP và tên trình duyệt (user agent) của thiết bị bạn đăng nhập được lưu cùng phiên.'},
        {term: 'Liên kết trong email', text: 'Liên kết dùng một lần để xác nhận và đặt lại mật khẩu được lưu dưới dạng băm SHA-256.'},
        {term: 'Bộ đếm lượt thử', text: 'Để bảo vệ đăng nhập khỏi việc dò mật khẩu, chúng tôi đếm lượt thử theo địa chỉ IP và theo email. Khóa bộ đếm được lưu dưới dạng băm SHA-256.'},
      ]},
      {id: 'cookies', heading: 'Cookie', body: [
        'Tallshift đặt hai cookie kỹ thuật: cookie đăng nhập (tối đa 30 ngày) và cookie bảo vệ biểu mẫu khỏi yêu cầu giả mạo (2 giờ). Không có cookie quảng cáo.',
      ]},
      {id: 'retention', heading: 'Dữ liệu được lưu trong bao lâu', items: [
        {term: 'Tài khoản và email', text: 'Cho đến khi bạn xóa tài khoản.'},
        {term: 'Phiên đăng nhập', text: 'Hết hiệu lực sau 30 ngày kể từ khi đăng nhập hoặc sau 7 ngày không hoạt động, tùy điều nào đến trước. Bản ghi phiên bị xóa khi bạn đăng xuất, đặt lại mật khẩu hoặc xóa tài khoản.'},
        {term: 'Liên kết trong email', text: 'Liên kết xác nhận địa chỉ có hiệu lực 24 giờ, đặt lại mật khẩu 1 giờ. Liên kết hết hiệu lực sau khi dùng.'},
        {term: 'Bộ đếm lượt thử', text: 'Mỗi bộ đếm kéo dài 10 phút rồi bắt đầu lại.'},
      ]},
      {id: 'processors', heading: 'Ai xử lý dữ liệu', items: [
        {term: 'Cloudflare', text: 'Lưu trữ trang web và cơ sở dữ liệu D1 chứa các dữ liệu nêu trên.'},
        {term: 'Resend', text: 'Gửi email xác nhận và đặt lại mật khẩu. Nhận địa chỉ email của bạn và nội dung thư. Email được gửi từ khu vực Tokyo. Thời gian Resend lưu dữ liệu được nêu trong chính sách quyền riêng tư của Resend.'},
        {term: 'Cloudflare Web Analytics', text: 'Hiện đang bật. Đếm lượt xem trang và không đặt cookie.'},
      ], links: [
        {label: 'Chính sách quyền riêng tư của Resend', href: resendPolicy},
        {label: 'Chính sách quyền riêng tư của Cloudflare', href: cloudflarePolicy},
      ]},
      {id: 'delete', heading: 'Cách xóa tài khoản', body: [
        'Đăng nhập, mở Tài khoản → Xóa tài khoản rồi nhập mật khẩu. Tài khoản, email, giá trị băm mật khẩu, mọi phiên và liên kết trong email bị xóa ngay và không thể khôi phục. Không cần email để làm việc này.',
        'Nếu tài khoản có lịch sử mua hàng, có thể xóa qua support@tallshift.com.',
        'Mục đã lưu trong trình duyệt không bị ảnh hưởng. Email Resend đã gửi và nhật ký của Cloudflare được lưu theo quy định của các dịch vụ đó.',
      ]},
      {id: 'contact', heading: 'Ai chịu trách nhiệm về dữ liệu', body: [
        'Max Tall, tác giả của Tallshift. Thông tin pháp lý sẽ được bổ sung vào trang này sau.',
      ], links: [{label: 'Câu hỏi về dữ liệu: support@tallshift.com', href: support}]},
    ],
  },
};
