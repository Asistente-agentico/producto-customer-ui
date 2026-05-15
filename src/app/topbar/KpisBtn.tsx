import { IconChartBar } from '@tabler/icons-react';
import ToggleButton from './ToggleButton';
import { useUiToggles } from '@/stores/uiToggles';
import { useCapabilities } from '@/stores/capabilities';

/**
 * "KPI" — toggle on/off que controla la KpiBand inline (sobre el chat).
 * Solo se renderiza si el módulo KPIs está habilitado (handoff §3.5).
 */
export default function KpisBtn() {
  const on = useUiToggles((s) => s.kpiBandOpen);
  const toggle = useUiToggles((s) => s.toggleKpiBand);
  const kpisEnabled = useCapabilities((s) => s.capabilities?.modulos.kpis?.enabled === true);

  if (!kpisEnabled) return null;
  return <ToggleButton on={on} onClick={toggle} icon={<IconChartBar size={12} />} label="KPI" />;
}
