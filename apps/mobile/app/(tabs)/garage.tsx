import { useTranslation } from 'react-i18next';
import { ComingSoon } from '../../src/components/ComingSoon';

export default function Garage() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.garage')} icon="car-sport" />;
}
