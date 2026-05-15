import { IconClock } from '@tabler/icons-react';
import ToggleButton from './ToggleButton';
import { useUiToggles } from '@/stores/uiToggles';
import { useTranslation } from 'react-i18next';

/**
 * "Última" — toggle puro on/off (sin dropdown). Click activa, click
 * cierra. Si está ON, el chat muestra la última conversación
 * precargada (lógica vive en ChatPage en PR 6).
 */
export default function UltimaConvBtn() {
  const on = useUiToggles((s) => s.ultimaOpen);
  const toggle = useUiToggles((s) => s.toggleUltima);
  const { t } = useTranslation();
  return (
    <ToggleButton
      on={on}
      onClick={toggle}
      icon={<IconClock size={12} />}
      label={t('topbar.ultima', { defaultValue: 'Última' })}
    />
  );
}
