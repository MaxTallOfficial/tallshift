import type {AuthLocale} from './auth-copy';

/** Plain text only. The server adds its validated URL and localized expiration, and escapes any HTML. */
export interface AuthEmailMessageCopy {subject: string; title: string; intro: string; action: string; expires: string; ignore: string}
export const authEmailCopy: Record<AuthLocale, {verification: AuthEmailMessageCopy; passwordReset: AuthEmailMessageCopy}> = {
  en: {
    verification: {subject: 'Confirm your email for Tallshift', title: 'Confirm your email address', intro: 'You requested a Tallshift account using this email address. Open the link below to confirm that it belongs to you.', action: 'Confirm email', expires: 'This link expires at:', ignore: 'If you did not request this account, ignore this email.'},
    passwordReset: {subject: 'Reset your Tallshift password', title: 'Set a new password', intro: 'A password reset was requested for your Tallshift account. Open the link below to choose a new password.', action: 'Set new password', expires: 'This link expires at:', ignore: 'If you did not request a password reset, ignore this email. Your password will stay the same.'},
  },
  ru: {
    verification: {subject: 'Подтвердите почту для Tallshift', title: 'Подтвердите адрес почты', intro: 'Для этого адреса запросили создание аккаунта Tallshift. Откройте ссылку ниже, чтобы подтвердить, что почта принадлежит вам.', action: 'Подтвердить почту', expires: 'Ссылка действует до:', ignore: 'Если вы не запрашивали создание аккаунта, проигнорируйте это письмо.'},
    passwordReset: {subject: 'Смена пароля Tallshift', title: 'Задайте новый пароль', intro: 'Для вашего аккаунта Tallshift запросили смену пароля. Откройте ссылку ниже, чтобы задать новый пароль.', action: 'Задать новый пароль', expires: 'Ссылка действует до:', ignore: 'Если вы не запрашивали смену пароля, проигнорируйте это письмо. Ваш пароль останется прежним.'},
  },
  vi: {
    verification: {subject: 'Xác nhận email cho Tallshift', title: 'Xác nhận địa chỉ email', intro: 'Có yêu cầu tạo tài khoản Tallshift bằng địa chỉ email này. Mở liên kết bên dưới để xác nhận địa chỉ thuộc về bạn.', action: 'Xác nhận email', expires: 'Liên kết hết hạn lúc:', ignore: 'Nếu bạn không yêu cầu tạo tài khoản, hãy bỏ qua email này.'},
    passwordReset: {subject: 'Đặt lại mật khẩu Tallshift', title: 'Đặt mật khẩu mới', intro: 'Có yêu cầu đặt lại mật khẩu cho tài khoản Tallshift của bạn. Mở liên kết bên dưới để chọn mật khẩu mới.', action: 'Đặt mật khẩu mới', expires: 'Liên kết hết hạn lúc:', ignore: 'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.'},
  },
};
