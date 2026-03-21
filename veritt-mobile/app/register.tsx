import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { getApiErrorMessage } from '@/utils/error.utils';
import { useIsDesktopWeb } from '@/hooks/useIsDesktopWeb';

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const isRegistering = useAuthStore((state) => state.isRegistering);
  const isDesktopWeb = useIsDesktopWeb();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState<'fullName' | 'email' | 'password' | null>(null);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Faltan datos', 'Completa todos los campos.');
      return;
    }

    try {
      await register({ fullName, email, password });
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos crear tu cuenta.'));
    }
  };

  const inputClass = (field: 'fullName' | 'email' | 'password') =>
    `rounded-veritt border bg-veritt-surface px-4 pt-[14px] pb-[10px] ${
      focusedField === field ? 'border-veritt-borderStrong' : 'border-veritt-border'
    }`;

  const headerSection = (
    <View className="md:w-full md:max-w-xl">
      <View className="gap-2.5">
        <Text className="text-[12px] font-bold uppercase tracking-eyebrow text-veritt-mutedStrong">
          VERITT
        </Text>

        <Text className="text-[40px] font-extrabold tracking-tightHero text-veritt-text md:text-5xl">
          Crea tu acceso.
        </Text>

        <Text className="text-[15px] leading-[22px] text-veritt-muted md:text-base md:leading-7">
          Empieza con una cuenta y configura tu operación.
        </Text>
      </View>
    </View>
  );

  const formSection = (
    <View className="gap-4 md:w-full md:max-w-xl">
      <View className={inputClass('fullName')}>
        <Text className="mb-2 text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
          Nombre completo
        </Text>
        <TextInput
          className="py-1.5 text-[16px] text-veritt-text outline-none"
          placeholder="Veritt Owner"
          placeholderTextColor="#666666"
          value={fullName}
          onChangeText={setFullName}
          onFocus={() => setFocusedField('fullName')}
          onBlur={() => setFocusedField(null)}
          selectionColor="#FFFFFF"
        />
      </View>

      <View className={inputClass('email')}>
        <Text className="mb-2 text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
          Correo electrónico
        </Text>
        <TextInput
          className="py-1.5 text-[16px] text-veritt-text outline-none"
          placeholder="owner@veritt.app"
          placeholderTextColor="#666666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          selectionColor="#FFFFFF"
        />
      </View>

      <View className={inputClass('password')}>
        <Text className="mb-2 text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
          Contraseña
        </Text>
        <TextInput
          className="py-1.5 text-[16px] text-veritt-text outline-none"
          placeholder="••••••••"
          placeholderTextColor="#666666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          selectionColor="#FFFFFF"
        />
      </View>
    </View>
  );

  const actionsSection = (
    <View className="gap-5 md:w-full md:max-w-xl">
      <TouchableOpacity
        className={`h-[58px] items-center justify-center rounded-veritt bg-white ${
          isRegistering ? 'opacity-70' : ''
        }`}
        onPress={handleRegister}
        disabled={isRegistering}
        activeOpacity={0.9}
      >
        {isRegistering ? (
          <ActivityIndicator color="#000000" />
        ) : (
          <Text className="text-[16px] font-extrabold text-black">
            Crear cuenta
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/login')}>
        <Text className="text-center text-[14px] text-veritt-muted">
          ¿Ya tienes cuenta?{' '}
          <Text className="font-bold text-veritt-text">Inicia sesión</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isDesktopWeb) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-veritt-bg"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.desktopViewport}>
          <View style={styles.desktopContent}>
            {headerSection}
            {formSection}
            {actionsSection}
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-veritt-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 justify-between px-6 pt-[90px] pb-10 md:items-center">
        {headerSection}
        {formSection}
        {actionsSection}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  desktopViewport: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  desktopContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 36,
  },
});
