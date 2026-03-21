import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useAuthStore } from '@/store/auth.store';
import { getApiErrorMessage } from '@/utils/error.utils';
import { VrittHeader } from '@/components/ui/VrittHeader';
import { VrittInput } from '@/components/ui/VrittInput';
import { VrittButton } from '@/components/ui/VrittButton';
import { useIsDesktopWeb } from '@/hooks/useIsDesktopWeb';

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const isLoggingIn = useAuthStore((state) => state.isLoggingIn);
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = useIsDesktopWeb();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateAnim]);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      Alert.alert('Faltan datos', 'Ingresa tu correo y contraseña.');
      return;
    }

    try {
      await login({
        email: normalizedEmail,
        password,
      });

      router.replace('/(tabs)');
    } catch (error) {
      console.error('LOGIN ERROR:', error);
      Alert.alert('Error', getApiErrorMessage(error, 'No pudimos iniciar sesión.'));
    }
  };

  const headerSection = (
    <View className="md:w-full md:max-w-xl">
      <VrittHeader
        title="Entra a lo que sigue."
        subtitle="Gestión moderna, segura y hecha para operar mejor."
      />
    </View>
  );

  const formSection = (
    <View className="gap-4 md:w-full md:max-w-xl">
      <VrittInput
        label="Correo electrónico"
        placeholder="tu@empresa.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoggingIn}
        returnKeyType="next"
      />

      <VrittInput
        label="Contraseña"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoggingIn}
        returnKeyType="done"
        onSubmitEditing={handleLogin}
      />

      <TouchableOpacity disabled={isLoggingIn} activeOpacity={0.8}>
        <Text className="self-end text-[13px] font-semibold text-[#B8B8B8]">
          ¿Olvidaste tu contraseña?
        </Text>
      </TouchableOpacity>
    </View>
  );

  const actionsSection = (
    <View className="gap-5 md:w-full md:max-w-xl">
      <VrittButton
        label="Continuar"
        loading={isLoggingIn}
        onPress={handleLogin}
      />

      <TouchableOpacity
        onPress={() => router.push('/register')}
        disabled={isLoggingIn}
        activeOpacity={0.8}
      >
        <Text className="text-center text-[14px] text-veritt-muted">
          ¿No tienes cuenta?{' '}
          <Text className="font-bold text-veritt-text">Crear cuenta</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isWeb) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-veritt-bg"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.webScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.webViewport,
              isDesktopWeb ? styles.webViewportDesktop : styles.webViewportResponsive,
              {
                opacity: fadeAnim,
                transform: [{ translateY: translateAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.webContent,
                isDesktopWeb ? styles.webContentDesktop : styles.webContentResponsive,
              ]}
            >
              {headerSection}
              {formSection}
              {actionsSection}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-veritt-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View
        className="flex-1 justify-between px-6 pt-[90px] pb-10 md:items-center"
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: translateAnim }],
        }}
      >
        {headerSection}
        {formSection}
        {actionsSection}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  webScrollContent: {
    flexGrow: 1,
  },
  webViewport: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  webViewportDesktop: {
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  webViewportResponsive: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 28,
  },
  webContent: {
    width: '100%',
    alignSelf: 'center',
  },
  webContentDesktop: {
    maxWidth: 560,
    gap: 36,
  },
  webContentResponsive: {
    maxWidth: 500,
    gap: 28,
  },
});
