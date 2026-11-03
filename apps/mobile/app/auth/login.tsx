import { Ionicons } from '@expo/vector-icons';
import { otpRequestSchema, type AuthTokens, type PublicUser } from '@aduva/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/stores/auth';

/** SMS OTP ile giriş / üyelik (tek akış). E-posta ve Apple/Google butonları Aşama 5'te. */
export default function Login() {
  const { t } = useTranslation();
  const setSession = useAuth((s) => s.setSession);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [kvkk, setKvkk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const send = () =>
    run(async () => {
      const parsed = otpRequestSchema.safeParse({ phone });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      await api('/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) });
      setStep('code');
    });

  const verify = () =>
    run(async () => {
      const res = await api<AuthTokens & { user: PublicUser }>('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, code }) });
      await setSession(res);
      router.back();
    });

  const input = 'h-14 rounded-xl bg-surface border border-line px-4 text-fg text-lg';
  const canSend = phone.length >= 10 && kvkk && !busy;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 px-6">
        <Pressable onPress={() => router.back()} hitSlop={16} className="self-end mt-2" accessibilityLabel="Kapat">
          <Ionicons name="close" size={28} color="#F5F6F7" />
        </Pressable>
        <Text className="text-fg text-3xl font-extrabold mt-6 mb-8">{t('auth.title')}</Text>

        {step === 'phone' ? (
          <>
            <Text className="text-fg-muted mb-2">{t('auth.phone')}</Text>
            <TextInput className={input} keyboardType="phone-pad" placeholder="5XX XXX XX XX" placeholderTextColor="#5b6470" value={phone} onChangeText={setPhone} maxLength={14} autoFocus />
            <Pressable onPress={() => setKvkk(!kvkk)} className="flex-row items-start mt-5" accessibilityRole="checkbox" accessibilityState={{ checked: kvkk }}>
              <Ionicons name={kvkk ? 'checkbox' : 'square-outline'} size={24} color={kvkk ? '#E10600' : '#9AA3AE'} />
              <Text className="text-fg-muted flex-1 ml-3 text-sm leading-5">{t('auth.kvkk')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="text-fg-muted mb-2">{t('auth.codeSent', { phone })}</Text>
            <TextInput className={`${input} tracking-[8px] text-center`} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} value={code} onChangeText={setCode} autoFocus />
          </>
        )}

        {error && <Text className="text-primary mt-4">{error}</Text>}

        <Pressable
          disabled={step === 'phone' ? !canSend : code.length !== 6 || busy}
          onPress={step === 'phone' ? send : verify}
          className="bg-primary rounded-2xl h-14 items-center justify-center mt-8 disabled:opacity-40"
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">{step === 'phone' ? t('auth.sendCode') : t('auth.verify')}</Text>}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
