import { useTranslation } from 'react-i18next';
import { ComingSoon } from '../../src/components/ComingSoon';

export default function Cart() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.cart')} icon="cart" />;
}
