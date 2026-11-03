import { Redirect } from 'expo-router';
import { usePrefs } from '../src/stores/auth';

export default function Index() {
  const done = usePrefs((s) => s.onboardingDone);
  return <Redirect href={done ? '/(tabs)' : '/onboarding'} />;
}
