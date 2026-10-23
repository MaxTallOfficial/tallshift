/** Live, local design-system specimens. No account, payment or export service. */
export function initSpecimens(root, { getConfig, onNotice = () => {} }) {
  const id = `ds-${Math.random().toString(36).slice(2, 9)}`;
  const abort = new AbortController();
  const { signal } = abort;
  const state = { pending: false, action: false, checked: true, guides: false, density: 'comfortable', intensity: 45, activeTab: 0, selected: new Set(['surface']), fieldTouched: false, disposed: false };
  const refs = {};
  const bindings = [];
  const options = {
    ru: {
      eyebrow: 'ЖИВАЯ СИСТЕМА / 14 СЕМЕЙСТВ', title: 'Красиво — во всех состояниях.', lead: 'Нажимайте, вводите, меняйте. Это настоящие элементы одного визуального языка.',
      actions: 'Действия', field: 'Текстовое поле', search: 'Поиск', tabs: 'Вкладки', checkbox: 'Выбор', switch: 'Переключатель', select: 'Селект', slider: 'Диапазон', tile: 'Образцы материала', tooltip: 'Подсказка', toast: 'Обратная связь', accordion: 'Раскрытие', dialog: 'Диалог', code: 'Конфигурация',
      primary: 'Испытать действие', activated: 'Действие выполнено', pending: 'В ожидании…', secondary: 'Вторичное', disabled: 'Недоступно', togglePending: 'Показать ожидание', selected: 'Выбрано', unselected: 'Выбрать', actionStatus: 'Действие изменило локальное состояние.', stateOnly: 'Ожидание — отдельный демонстрационный режим, без запроса к серверу.',
      project: 'Название проекта', placeholder: 'Например, новая коллекция', fieldHelper: 'От 3 до 60 символов. Значение остаётся в этом стенде.', fieldError: 'Введите название: минимум 3 символа.', validate: 'Проверить поле', chars: 'символов',
      searchLabel: 'Найти материал', searchPlaceholder: 'Поверхность, движение, шрифт…', clear: 'Очистить поиск', results: 'Найдено', noResults: 'Таких материалов нет. Попробуйте другой запрос.',
      preview: 'Образец', rules: 'Правила', tokens: 'Токены', tabPreviewTitle: 'Форма следует за выбором.', tabPreviewBody: 'Вкладки активируются кликом или клавишами Enter / Пробел. Стрелки перемещают фокус.', tabRulesTitle: 'Одна система. Разная интенсивность.', tabRulesBody: 'Цель остаётся на месте. Текст читается сразу. Движение помогает понять смену состояния.', tabTokensTitle: 'Настройки сохраняют связь.', tabTokensBody: 'Смена направления и акцента обновляет весь стенд. Введённый текст и фокус сохраняются.',
      checkboxLabel: 'Добавить инструкции', checkboxHelp: 'Независимый флажок с реальным состоянием.', switchLabel: 'Показать направляющие', switchHelp: 'Меняет декоративную сетку в образцах.', on: 'Вкл.', off: 'Выкл.',
      density: 'Плотность образцов', comfortable: 'Свободно', compact: 'Компактно', densityHelp: 'Меняет интервалы образцов; область нажатия остаётся удобной.', amplitude: 'Выразительность', amplitudeHelp: 'Настраивает форму в пределах образца, не двигая элементы управления.',
      tileSurface: 'Поверхность', tileSurfaceDesc: 'Плотная плоскость и глубина.', tileMotion: 'Движение', tileMotionDesc: 'Слои, которые находят ритм.', tileType: 'Типографика', tileTypeDesc: 'Контраст масштаба и формы.', tileToggle: 'Изменить выбор материала',
      tipLabel: 'Что меняется?', tipBody: 'Акцент, материал и характер шрифта. Сценарий остаётся прежним.', tipHelp: 'Доступна при наведении, фокусе и нажатии. Esc скрывает подсказку.',
      save: 'Сохранить выбор в сеансе', saved: 'Выбор сохранён в этом сеансе:', savedEmpty: 'без материалов', dismiss: 'Скрыть сообщение', toastHelp: 'Это локальная обратная связь. Данные никуда не отправляются.',
      detailsOne: 'Зачем проверять состояния?', detailsOneBody: 'Характер бренда должен сохраняться в ошибке, ожидании и фокусе. Красивой обложки для этого недостаточно.', detailsTwo: 'Как устроено движение?', detailsTwoBody: 'Эффекты оболочки подчиняются выбранной интенсивности и системному Reduced Motion. Смысл и управление остаются доступны без анимации.',
      openDialog: 'Рассмотреть систему', dialogTitle: 'Сначала язык. Затем экраны.', dialogBody: 'Это проверка типографики, плотности, состояний и материала. Готовые страницы продукта будут проработаны после выбора направления.', close: 'Вернуться к стенду', dialogNote: 'Закрытие: кнопка или Esc. Фокус вернётся к действию открытия.',
      copy: 'Копировать JSON', copying: 'Копирование…', copied: 'Конфигурация скопирована.', copyError: 'Не удалось скопировать. Выделите JSON и скопируйте вручную.', codeNote: 'Текущий стиль стенда. Это конфигурация арт-направления, без продуктовых интеграций.', configLabel: 'JSON текущего визуального направления',
    },
    en: {
      eyebrow: 'LIVE SYSTEM / 14 FAMILIES', title: 'Character in every state.', lead: 'Press, type, adjust. Real controls, speaking one visual language.',
      actions: 'Actions', field: 'Text field', search: 'Search', tabs: 'Tabs', checkbox: 'Checkbox', switch: 'Switch', select: 'Select', slider: 'Range', tile: 'Material specimens', tooltip: 'Tooltip', toast: 'Feedback', accordion: 'Disclosure', dialog: 'Dialog', code: 'Configuration',
      primary: 'Try this action', activated: 'Action complete', pending: 'Pending…', secondary: 'Secondary', disabled: 'Unavailable', togglePending: 'Show pending state', selected: 'Selected', unselected: 'Select', actionStatus: 'The action changed local state.', stateOnly: 'Pending is a separate demonstration mode, without a server request.',
      project: 'Project name', placeholder: 'For example, a new collection', fieldHelper: '3–60 characters. Your value stays in this specimen.', fieldError: 'Enter a name with at least 3 characters.', validate: 'Validate field', chars: 'characters',
      searchLabel: 'Find a material', searchPlaceholder: 'Surface, motion, type…', clear: 'Clear search', results: 'Found', noResults: 'No matching materials. Try another search.',
      preview: 'Specimen', rules: 'Principles', tokens: 'Tokens', tabPreviewTitle: 'Form follows selection.', tabPreviewBody: 'Activate tabs with a click, Enter or Space. Arrow keys move focus.', tabRulesTitle: 'One system. Different intensity.', tabRulesBody: 'The target stays put. Text is readable immediately. Motion explains a state change.', tabTokensTitle: 'Settings stay connected.', tabTokensBody: 'Direction and accent changes update the whole specimen. Your text and focus are preserved.',
      checkboxLabel: 'Include instructions', checkboxHelp: 'An independent checkbox with real state.', switchLabel: 'Show guides', switchHelp: 'Changes the decorative grid inside specimens.', on: 'On', off: 'Off',
      density: 'Specimen density', comfortable: 'Spacious', compact: 'Compact', densityHelp: 'Changes specimen spacing while preserving comfortable targets.', amplitude: 'Expression', amplitudeHelp: 'Adjusts the shape inside the specimen without moving controls.',
      tileSurface: 'Surface', tileSurfaceDesc: 'A solid plane with depth.', tileMotion: 'Motion', tileMotionDesc: 'Layers finding their rhythm.', tileType: 'Type', tileTypeDesc: 'Scale, form and contrast.', tileToggle: 'Toggle material selection',
      tipLabel: 'What changes?', tipBody: 'Accent, material and typographic character. The task stays the same.', tipHelp: 'Available on hover, focus and press. Esc dismisses the tooltip.',
      save: 'Save selection for this session', saved: 'Saved for this session:', savedEmpty: 'no materials', dismiss: 'Dismiss message', toastHelp: 'Local feedback only. No data is sent anywhere.',
      detailsOne: 'Why test the states?', detailsOneBody: 'Brand character should survive errors, pending states and focus. A beautiful cover cannot prove that.', detailsTwo: 'How does motion work?', detailsTwoBody: 'Shell effects follow your intensity setting and system Reduced Motion. Meaning and controls remain available without animation.',
      openDialog: 'Inspect the system', dialogTitle: 'Language first. Screens next.', dialogBody: 'A check of typography, density, states and material. Product pages follow after the direction is chosen.', close: 'Back to the specimen', dialogNote: 'Close with the button or Esc. Focus returns to the opening control.',
      copy: 'Copy JSON', copying: 'Copying…', copied: 'Configuration copied.', copyError: 'Could not copy. Select the JSON and copy it manually.', codeNote: 'The current art-direction configuration. No product integrations.', configLabel: 'Current visual-direction JSON',
    },
  };
  const t = () => options[getConfig().locale === 'en' ? 'en' : 'ru'];
  const listen = (node, event, fn, extra = {}) => node.addEventListener(event, fn, { ...extra, signal });
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const bind = (node, key, attribute) => { bindings.push({ node, key, attribute }); return node; };
  const text = (tag, className, key) => bind(el(tag, className), key);
  const button = (className, key) => { const node = text('button', `ds-button ${className}`, key); node.type = 'button'; return node; };
  const section = (number, key, classes = '') => {
    const node = el('section', `ds-specimen ds-specimen--${key} ${classes}`);
    const heading = el('div', 'ds-specimen-heading');
    heading.append(el('span', 'ds-specimen-number', String(number).padStart(2, '0')), text('h3', '', key));
    node.append(heading);
    grid.append(node);
    return node;
  };

  root.classList.add('ds-lab');
  const intro = el('div', 'ds-intro');
  intro.append(text('p', 'ds-eyebrow', 'eyebrow'), text('h2', 'ds-title', 'title'), text('p', 'ds-intro-copy', 'lead'));
  const grid = el('div', 'ds-grid');
  root.replaceChildren(intro, grid);

  // 01. Buttons: a real local action, an explicit pending-state specimen, and selection.
  const actions = section(1, 'actions', 'ds-span-2');
  const actionRow = el('div', 'ds-action-row');
  refs.primary = button('ds-button--primary', 'primary');
  refs.secondary = button('ds-button--secondary', 'secondary');
  refs.disabled = button('ds-button--secondary', 'disabled'); refs.disabled.disabled = true;
  refs.selectedButton = button('ds-button--quiet', 'selected'); refs.selectedButton.setAttribute('aria-pressed', 'true');
  actionRow.append(refs.primary, refs.secondary, refs.disabled, refs.selectedButton);
  const pendingLabel = el('label', 'ds-checkline');
  refs.pending = el('input'); refs.pending.type = 'checkbox';
  pendingLabel.append(refs.pending, text('span', '', 'togglePending'));
  refs.actionResult = el('p', 'ds-status'); refs.actionResult.setAttribute('role', 'status');
  actions.append(actionRow, pendingLabel, text('p', 'ds-helper', 'stateOnly'), refs.actionResult);
  listen(refs.primary, 'click', () => { state.action = !state.action; render(); });
  listen(refs.secondary, 'click', () => { state.action = false; state.pending = false; refs.pending.checked = false; render(); });
  listen(refs.pending, 'change', () => { state.pending = refs.pending.checked; render(); });
  listen(refs.selectedButton, 'click', () => { refs.selectedButton.setAttribute('aria-pressed', String(refs.selectedButton.getAttribute('aria-pressed') !== 'true')); render(); });

  // 02. A labelled, validated field. No submit or network request.
  const field = section(2, 'field');
  refs.field = el('input', 'ds-input'); refs.field.type = 'text'; refs.field.id = `${id}-name`; refs.field.maxLength = 60; refs.field.minLength = 3; refs.field.required = true; refs.field.autocomplete = 'off';
  bind(refs.field, 'placeholder', 'placeholder');
  const fieldLabel = text('label', 'ds-label', 'project'); fieldLabel.htmlFor = refs.field.id;
  refs.fieldHelper = text('p', 'ds-helper', 'fieldHelper'); refs.fieldHelper.id = `${id}-name-help`;
  refs.fieldError = text('p', 'ds-field-error', 'fieldError'); refs.fieldError.id = `${id}-name-error`; refs.fieldError.hidden = true;
  refs.fieldCount = el('span', 'ds-field-count');
  const fieldMeta = el('div', 'ds-field-meta'); fieldMeta.append(refs.fieldHelper, refs.fieldCount);
  refs.field.setAttribute('aria-describedby', `${refs.fieldHelper.id} ${refs.fieldError.id}`);
  const validate = button('ds-button--text', 'validate');
  field.append(fieldLabel, refs.field, fieldMeta, refs.fieldError, validate);
  listen(refs.field, 'input', renderField);
  listen(refs.field, 'blur', () => { state.fieldTouched = true; renderField(); });
  listen(validate, 'click', () => { state.fieldTouched = true; renderField(); if (refs.field.getAttribute('aria-invalid') === 'true') refs.field.focus(); });

  // 03. Search filters the actual material specimens below.
  const search = section(3, 'search');
  const searchLabel = text('label', 'ds-label', 'searchLabel');
  refs.search = el('input', 'ds-input'); refs.search.type = 'search'; refs.search.id = `${id}-search`; refs.search.autocomplete = 'off'; searchLabel.htmlFor = refs.search.id;
  bind(refs.search, 'searchPlaceholder', 'placeholder');
  const searchRow = el('div', 'ds-search-row'); refs.clear = button('ds-button--icon', 'clear'); refs.clear.textContent = '×'; bindings.pop(); bind(refs.clear, 'clear', 'aria-label');
  refs.searchStatus = el('p', 'ds-helper'); refs.searchStatus.setAttribute('role', 'status');
  searchRow.append(refs.search, refs.clear); search.append(searchLabel, searchRow, refs.searchStatus);
  listen(refs.search, 'input', renderTiles);
  listen(refs.clear, 'click', () => { refs.search.value = ''; renderTiles(); refs.search.focus(); });

  // 04. Manual-activation tabs: arrow keys move focus without changing the panel.
  const tabs = section(4, 'tabs', 'ds-span-2');
  const tablist = el('div', 'ds-tablist'); tablist.setAttribute('role', 'tablist');
  const tabKeys = ['preview', 'rules', 'tokens'];
  refs.tabs = []; refs.panels = [];
  tabKeys.forEach((key, index) => {
    const tab = button('ds-tab', key); tab.setAttribute('role', 'tab'); tab.id = `${id}-tab-${index}`; tab.setAttribute('aria-controls', `${id}-panel-${index}`);
    const panel = el('div', 'ds-tab-panel'); panel.id = `${id}-panel-${index}`; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tab.id); panel.tabIndex = 0;
    panel.append(text('h4', 'ds-panel-title', `tab${key[0].toUpperCase()}${key.slice(1)}Title`), text('p', 'ds-panel-copy', `tab${key[0].toUpperCase()}${key.slice(1)}Body`));
    refs.tabs.push(tab); refs.panels.push(panel); tablist.append(tab);
    listen(tab, 'click', () => { state.activeTab = index; renderTabs(); });
    listen(tab, 'keydown', event => {
      const keyMap = { ArrowRight: (index + 1) % 3, ArrowLeft: (index + 2) % 3, Home: 0, End: 2 };
      if (event.key in keyMap) { event.preventDefault(); refs.tabs.forEach((item, i) => { item.tabIndex = i === keyMap[event.key] ? 0 : -1; }); refs.tabs[keyMap[event.key]].focus(); }
    });
  });
  tabs.append(tablist, ...refs.panels);

  // 05–08. Independent stateful form controls.
  const checkbox = section(5, 'checkbox');
  const checkboxLabel = el('label', 'ds-choice'); refs.checkbox = el('input'); refs.checkbox.type = 'checkbox'; refs.checkbox.checked = state.checked;
  checkboxLabel.append(refs.checkbox, text('span', '', 'checkboxLabel')); checkbox.append(checkboxLabel, text('p', 'ds-helper', 'checkboxHelp'));
  listen(refs.checkbox, 'change', () => { state.checked = refs.checkbox.checked; });

  const switchCard = section(6, 'switch');
  const switchLine = el('div', 'ds-switch-line'); refs.switch = el('button', 'ds-switch'); refs.switch.type = 'button'; refs.switch.setAttribute('role', 'switch'); refs.switch.setAttribute('aria-checked', 'false'); refs.switch.id = `${id}-guides`;
  refs.switch.append(el('span', 'ds-switch-knob')); const switchLabel = text('label', 'ds-label', 'switchLabel'); switchLabel.htmlFor = refs.switch.id; refs.switchState = el('span', 'ds-state-word');
  switchLine.append(switchLabel, refs.switch, refs.switchState); switchCard.append(switchLine, text('p', 'ds-helper', 'switchHelp'));
  listen(refs.switch, 'click', () => { state.guides = !state.guides; render(); });

  const select = section(7, 'select'); const selectLabel = text('label', 'ds-label', 'density'); refs.select = el('select', 'ds-select'); refs.select.id = `${id}-density`; selectLabel.htmlFor = refs.select.id;
  [['comfortable', 'comfortable'], ['compact', 'compact']].forEach(([value, key]) => { const option = text('option', '', key); option.value = value; refs.select.append(option); });
  select.append(selectLabel, refs.select, text('p', 'ds-helper', 'densityHelp'));
  listen(refs.select, 'change', () => { state.density = refs.select.value; render(); });

  const slider = section(8, 'slider'); const rangeTop = el('div', 'ds-range-top'); const rangeLabel = text('label', 'ds-label', 'amplitude'); refs.range = el('input', 'ds-range'); refs.range.type = 'range'; refs.range.min = '0'; refs.range.max = '100'; refs.range.step = '5'; refs.range.value = String(state.intensity); refs.range.id = `${id}-range`; rangeLabel.htmlFor = refs.range.id;
  refs.rangeOutput = el('output', 'ds-range-output'); refs.rangeOutput.htmlFor = refs.range.id;
  rangeTop.append(rangeLabel, refs.rangeOutput); slider.append(rangeTop, refs.range, text('p', 'ds-helper', 'amplitudeHelp'));
  listen(refs.range, 'input', () => { state.intensity = Number(refs.range.value); render(); });

  // 09. Material toggles are buttons, never nested interactive cards.
  const tiles = section(9, 'tile', 'ds-span-3'); const tileGrid = el('div', 'ds-material-grid'); refs.tiles = [];
  ['surface', 'motion', 'type'].forEach(key => {
    const tile = el('button', `ds-material ds-material--${key}`); tile.type = 'button'; tile.dataset.key = key;
    const art = el('span', 'ds-material-art'); art.setAttribute('aria-hidden', 'true');
    if (key === 'type') art.append(el('span', 'ds-type-glyph', 'Аа'));
    else { for (let i = 0; i < 3; i++) art.append(el('span', `ds-material-layer ds-material-layer--${i + 1}`)); }
    const bottom = el('span', 'ds-material-bottom'); const caption = el('span', 'ds-material-caption');
    const keyTitle = `tile${key[0].toUpperCase()}${key.slice(1)}`;
    caption.append(text('strong', '', keyTitle), text('span', 'ds-material-description', `${keyTitle}Desc`));
    const tick = el('span', 'ds-material-tick', '✓'); tick.setAttribute('aria-hidden', 'true'); bottom.append(caption, tick); tile.append(art, bottom);
    tileGrid.append(tile); refs.tiles.push(tile);
    listen(tile, 'click', () => { if (state.selected.has(key)) state.selected.delete(key); else state.selected.add(key); renderTiles(); });
  });
  refs.empty = text('p', 'ds-empty', 'noResults'); refs.empty.hidden = true; tiles.append(tileGrid, refs.empty);

  // 10. Tooltip opens with focus/hover/click and can be dismissed by Escape.
  const tooltip = section(10, 'tooltip'); const tipWrap = el('div', 'ds-tooltip-wrap'); refs.tipTrigger = button('ds-button--secondary', 'tipLabel'); refs.tip = text('div', 'ds-tooltip', 'tipBody'); refs.tip.id = `${id}-tooltip`; refs.tip.setAttribute('role', 'tooltip'); refs.tip.hidden = true; refs.tipTrigger.setAttribute('aria-describedby', refs.tip.id);
  tipWrap.append(refs.tipTrigger, refs.tip); tooltip.append(tipWrap, text('p', 'ds-helper', 'tipHelp'));
  let tipDismissed = false; let pointerInside = false;
  const showTip = () => { tipDismissed = false; refs.tip.hidden = false; };
  const hideTip = () => { refs.tip.hidden = true; };
  listen(tipWrap, 'mouseenter', () => { pointerInside = true; showTip(); });
  listen(tipWrap, 'mouseleave', () => { pointerInside = false; if (document.activeElement !== refs.tipTrigger || tipDismissed) hideTip(); });
  listen(refs.tipTrigger, 'focus', showTip);
  listen(refs.tipTrigger, 'blur', () => { if (!pointerInside) hideTip(); });
  listen(refs.tipTrigger, 'click', showTip);
  listen(refs.tipTrigger, 'keydown', event => { if (event.key === 'Escape') { event.preventDefault(); tipDismissed = true; hideTip(); } });

  // 11. A user-controlled toast with a real in-memory save, no artificial timers.
  const feedback = section(11, 'toast'); const save = button('ds-button--secondary', 'save'); refs.toast = el('div', 'ds-toast'); refs.toast.hidden = true; refs.toastMessage = el('span'); refs.toastMessage.setAttribute('role', 'status'); refs.toastMessage.setAttribute('aria-live', 'polite'); refs.toastMessage.setAttribute('aria-atomic', 'true');
  const dismiss = el('button', 'ds-toast-dismiss', '×'); dismiss.type = 'button'; bind(dismiss, 'dismiss', 'aria-label'); refs.toast.append(refs.toastMessage, dismiss); feedback.append(save, text('p', 'ds-helper', 'toastHelp'), refs.toast);
  let savedSelection = null;
  const renderSaved = () => { if (savedSelection === null) return; const names = savedSelection.map(key => t()[`tile${key[0].toUpperCase()}${key.slice(1)}`]); refs.toastMessage.textContent = `${t().saved} ${names.length ? names.join(', ') : t().savedEmpty}`; };
  listen(save, 'click', () => { savedSelection = [...state.selected]; refs.toast.hidden = false; renderSaved(); });
  listen(dismiss, 'click', () => { refs.toast.hidden = true; save.focus(); });

  // 12. Native details preserve open state across visual changes.
  const disclosure = section(12, 'accordion', 'ds-span-2');
  [['detailsOne', 'detailsOneBody'], ['detailsTwo', 'detailsTwoBody']].forEach(([headingKey, bodyKey]) => { const details = el('details', 'ds-details'); const summary = text('summary', '', headingKey); details.append(summary, text('p', '', bodyKey)); disclosure.append(details); });

  // 13. Native modal dialog with explicit focus return.
  const dialogCard = section(13, 'dialog'); refs.openDialog = button('ds-button--primary', 'openDialog'); refs.dialog = el('dialog', 'ds-dialog'); refs.dialog.setAttribute('aria-labelledby', `${id}-dialog-title`); refs.dialog.setAttribute('aria-describedby', `${id}-dialog-body`);
  const dialogEyebrow = text('p', 'ds-eyebrow', 'eyebrow'); const dialogTitle = text('h3', 'ds-dialog-title', 'dialogTitle'); dialogTitle.id = `${id}-dialog-title`; const dialogBody = text('p', 'ds-dialog-body', 'dialogBody'); dialogBody.id = `${id}-dialog-body`; const closeDialog = button('ds-button--primary', 'close'); closeDialog.autofocus = true;
  refs.dialog.append(dialogEyebrow, dialogTitle, dialogBody, text('p', 'ds-helper', 'dialogNote'), closeDialog); dialogCard.append(refs.openDialog, refs.dialog);
  listen(refs.openDialog, 'click', () => { if (!refs.dialog.open) refs.dialog.showModal(); });
  listen(closeDialog, 'click', () => refs.dialog.close());
  listen(refs.dialog, 'close', () => { if (!state.disposed) refs.openDialog.focus(); });

  // 14. Safe, selectable token JSON; clipboard completion is never simulated.
  const codeCard = section(14, 'code', 'ds-span-3'); const codeTop = el('div', 'ds-code-top'); refs.copy = button('ds-button--secondary', 'copy'); codeTop.append(text('p', 'ds-helper', 'codeNote'), refs.copy);
  const pre = el('pre', 'ds-code'); pre.tabIndex = 0; bind(pre, 'configLabel', 'aria-label'); refs.code = el('code'); pre.append(refs.code); codeCard.append(codeTop, pre); refs.copyStatus = el('p', 'ds-status'); refs.copyStatus.setAttribute('role', 'status'); codeCard.append(refs.copyStatus);
  let copying = false;
  listen(refs.copy, 'click', async () => {
    if (copying) return; copying = true; refs.copy.disabled = true; refs.copy.textContent = t().copying;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(refs.code.textContent);
      if (!state.disposed) { refs.copyStatus.dataset.tone = 'success'; refs.copyStatus.textContent = t().copied; onNotice(t().copied); }
    } catch {
      if (!state.disposed) { refs.copyStatus.dataset.tone = 'error'; refs.copyStatus.textContent = t().copyError; onNotice(t().copyError); pre.focus(); }
    } finally {
      copying = false; if (!state.disposed) { refs.copy.disabled = false; refs.copy.textContent = t().copy; }
    }
  });

  function renderField() {
    const invalid = state.fieldTouched && refs.field.value.trim().length < 3;
    refs.field.setAttribute('aria-invalid', String(invalid)); refs.fieldError.hidden = !invalid;
    refs.fieldCount.textContent = `${refs.field.value.length}/60 ${t().chars}`;
  }
  function renderTabs() {
    refs.tabs.forEach((tab, index) => { const selected = index === state.activeTab; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; refs.panels[index].hidden = !selected; });
  }
  function renderTiles() {
    const query = refs.search.value.trim().toLocaleLowerCase(); let count = 0;
    refs.tiles.forEach(tile => {
      const key = tile.dataset.key; const keyTitle = `tile${key[0].toUpperCase()}${key.slice(1)}`;
      const haystack = `${t()[keyTitle]} ${t()[`${keyTitle}Desc`]} ${key}`.toLocaleLowerCase();
      tile.hidden = !haystack.includes(query); if (!tile.hidden) count++;
      tile.setAttribute('aria-pressed', String(state.selected.has(key)));
      tile.setAttribute('aria-label', `${t().tileToggle}: ${t()[keyTitle]}`);
    });
    refs.empty.hidden = count !== 0; refs.clear.disabled = query.length === 0;
    refs.searchStatus.textContent = `${t().results}: ${count} / 3`;
  }
  function render() {
    const config = getConfig(); const strings = t();
    root.lang = config.locale === 'en' ? 'en' : 'ru';
    root.dataset.motion = config.motion || 'subtle'; root.dataset.guides = String(state.guides); root.dataset.density = state.density;
    root.style.setProperty('--ds-expression', String(state.intensity / 100));
    bindings.forEach(({ node, key, attribute }) => { if (attribute) node.setAttribute(attribute, strings[key] ?? key); else node.textContent = strings[key] ?? key; });
    refs.primary.textContent = state.pending ? strings.pending : state.action ? strings.activated : strings.primary;
    refs.primary.disabled = state.pending; refs.primary.setAttribute('aria-busy', String(state.pending));
    refs.selectedButton.textContent = refs.selectedButton.getAttribute('aria-pressed') === 'true' ? strings.selected : strings.unselected;
    refs.actionResult.textContent = state.action ? strings.actionStatus : '';
    refs.switch.setAttribute('aria-checked', String(state.guides)); refs.switch.setAttribute('aria-label', strings.switchLabel); refs.switchState.textContent = state.guides ? strings.on : strings.off;
    refs.rangeOutput.value = `${state.intensity}%`; refs.range.setAttribute('aria-valuetext', `${state.intensity}%`);
    try { refs.code.textContent = JSON.stringify(config, null, 2); } catch { refs.code.textContent = JSON.stringify({ direction: config.direction, accent: config.accent, locale: config.locale, motion: config.motion }, null, 2); }
    if (copying) refs.copy.textContent = strings.copying;
    renderField(); renderTabs(); renderTiles(); renderSaved();
  }
  listen(window, 'formrift:stylechange', render);
  render();
  return () => { state.disposed = true; abort.abort(); if (refs.dialog.open) refs.dialog.close(); root.replaceChildren(); root.classList.remove('ds-lab'); delete root.dataset.motion; delete root.dataset.guides; delete root.dataset.density; root.style.removeProperty('--ds-expression'); };
}
