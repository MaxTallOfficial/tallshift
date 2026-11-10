# Отдельные почтовые ящики, 10.11.2026

Max Tall запросил support@tallshift.com, tallback@tallshift.com, mt@tallshift.com. В уточнении явно выбрал отдельные ящики, а не пересылку всех адресов на Gmail.

Resend уже обслуживает автоматическую отправку сайта и не заменяет обычный почтовый хостинг пользователей. Проверен Zoho Mail Forever Free: один домен, до 5 пользователей, по 5 GB; IMAP/POP/ActiveSync не входят, доступность ограничена data centers. В текущем Chrome видна ссылка на Free signup, регистрационная форма открыта.

Пользователю предложен Zoho Free с объяснением ограничения почтовых приложений. До ответа не регистрировать аккаунт и не менять MX. Никакие ящики ещё не созданы. Существующий Cloudflare Email Routing и записи Resend не менялись в рамках этой задачи. При принятии нового провайдера сначала проверить существующие маршруты и последствия замены MX; не потерять входящую почту mt.tallshift.com.

Источники: https://www.zoho.com/mail/zohomail-pricing.html и https://www.zoho.com/mail/help/adminconsole/subscription.html.

## Итоговое решение и выполненные настройки

Пользователь отменил отдельные ящики: «окей, сделай пересылку. не надо почтовые». Zoho не регистрировался, MX не менялись.

В Cloudflare Email Routing добавлен destination mtalldesign@gmail.com, статус Verified. Созданы три точных правила Send to an email для support@tallshift.com, tallback@tallshift.com и mt@tallshift.com; каждое Active и указывает на mtalldesign@gmail.com. Catch-all остаётся выключенным. Поддомен mt.tallshift.com не менялся.

Проверено по реальному интерфейсу Cloudflare: три правила Active и правильный адрес назначения. Доставка тестового письма через каждое правило отдельно не проверялась. Скриншот: /tmp/tallshift-email-forwarding.png. Это входящая пересылка; отдельные почтовые ящики и отправка из Gmail от этих адресов не создавались.
