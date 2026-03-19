import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
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

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const isLoggingIn = useAuthStore((state) => state.isLoggingIn);

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
        <View className="md:w-full md:max-w-xl">
          <VrittHeader
            title="Entra a lo que sigue."
            subtitle="Gestión moderna, segura y hecha para operar mejor."
          />
        </View>

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
      </Animated.View>
    </KeyboardAvoidingView>
  );
}