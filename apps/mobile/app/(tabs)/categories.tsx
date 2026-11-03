import { useTranslation } from 'react-i18next';
import { ComingSoon } from '../../src/components/ComingSoon';

export default function Categories() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.categories')} icon="grid" />;
}
