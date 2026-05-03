// src/hooks/useTelegram.js
const tg = window.Telegram?.WebApp;

export function useTelegram() {
  const expand   = () => tg?.expand();
  const ready    = () => tg?.ready();
  const close    = () => tg?.close();
  const showAlert   = (msg, cb) => tg?.showAlert(msg, cb);
  const showConfirm = (msg, cb) => tg?.showConfirm(msg, cb);

  const haptic = {
    impact:       (style = 'medium') => tg?.HapticFeedback?.impactOccurred(style),
    notification: (type  = 'success') => tg?.HapticFeedback?.notificationOccurred(type),
    selection:    ()                  => tg?.HapticFeedback?.selectionChanged(),
  };

  const mainButton = {
    show:         (text, fn) => { tg?.MainButton?.setText(text); tg?.MainButton?.show(); tg?.MainButton?.onClick(fn); },
    hide:         ()         => tg?.MainButton?.hide(),
    showProgress: ()         => tg?.MainButton?.showProgress(false),
    hideProgress: ()         => tg?.MainButton?.hideProgress(),
  };

  const backButton = {
    show: (fn) => { tg?.BackButton?.show(); tg?.BackButton?.onClick(fn); },
    hide: ()   => { tg?.BackButton?.hide(); tg?.BackButton?.offClick(); },
  };

  const openLink         = (url) => tg?.openLink(url);
  const openTelegramLink = (url) => tg?.openTelegramLink(url);
  const setHeaderColor   = (color) => tg?.setHeaderColor(color);

  // Deep link referral code from start_param
  const startParam = tg?.initDataUnsafe?.start_param || null;
  const referralCode = startParam?.startsWith('ref_') ? startParam.replace('ref_', '') : null;

  return {
    tg,
    initData:     tg?.initData || '',
    telegramUser: tg?.initDataUnsafe?.user || null,
    colorScheme:  tg?.colorScheme || 'dark',
    isInTelegram: !!tg?.initData,
    referralCode,
    expand, ready, close, showAlert, showConfirm,
    haptic, mainButton, backButton,
    openLink, openTelegramLink, setHeaderColor,
  };
}
