import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { useBusinessStore } from '@/store/business.store';

const PAPER_BG = '#F5F2EA';
const INK = '#0A0A0A';

type Suggestion = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const SUGGESTIONS: Suggestion[] = [
  {
    key: 'today',
    label: '¿Cómo va el día operativo?',
    icon: 'sunny-outline',
  },
  {
    key: 'top-products',
    label: '¿Cuáles son mis productos top de esta semana?',
    icon: 'trophy-outline',
  },
  {
    key: 'payroll',
    label: '¿A quién le toca nómina esta quincena?',
    icon: 'cash-outline',
  },
  {
    key: 'inventory',
    label: 'Muéstrame qué insumos están por agotarse',
    icon: 'cube-outline',
  },
  {
    key: 'margin',
    label: '¿Cómo ha cambiado mi margen vs. la semana pasada?',
    icon: 'trending-up-outline',
  },
];

export default function BusinessChatScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const businesses = useBusinessStore((s) => s.businesses);
  const [draft, setDraft] = useState('');

  const activeBusiness = useMemo(
    () => businesses.find((b) => b.id === businessId) ?? null,
    [businesses, businessId],
  );

  const businessName = activeBusiness?.name ?? 'tu negocio';

  const handleSend = () => {
    // Placeholder — aquí irá la llamada al asistente.
    setDraft('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: PAPER_BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={PAPER_BG} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: Platform.OS === 'ios' ? 68 : 52,
            paddingBottom: 200,
            paddingHorizontal: 18,
            gap: 22,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 4,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: 'rgba(10,10,10,0.08)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="arrow-back" size={18} color={INK} />
            </TouchableOpacity>

            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 6,
                backgroundColor: 'rgba(74,124,89,0.14)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#4A7C59',
                }}
              />
              <Text
                style={{
                  color: '#1F3A2B',
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Asistente IA
              </Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: 4, gap: 6 }}>
            <Text
              style={{
                color: 'rgba(10,10,10,0.5)',
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {businessName}
            </Text>
            <Text
              style={{
                color: INK,
                fontSize: 30,
                fontWeight: '900',
                letterSpacing: -1.2,
                lineHeight: 34,
              }}
            >
              ¿Qué quieres saber{'\n'}
              <Text style={{ fontStyle: 'italic', fontWeight: '400' }}>
                hoy
              </Text>
              ?
            </Text>
            <Text
              style={{
                color: 'rgba(10,10,10,0.55)',
                fontSize: 14,
                lineHeight: 20,
                marginTop: 6,
              }}
            >
              Pregúntame sobre ventas, inventario, nómina o la cadena diaria de{' '}
              {businessName}. Tengo acceso al contexto operativo.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 22,
              borderWidth: 1,
              borderColor: 'rgba(10,10,10,0.08)',
              padding: 18,
              flexDirection: 'row',
              gap: 14,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: INK,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="sparkles" size={20} color="#F5F2EA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: 'rgba(10,10,10,0.5)',
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Veritt · IA
              </Text>
              <Text
                style={{
                  color: INK,
                  fontSize: 15,
                  lineHeight: 21,
                  fontWeight: '500',
                }}
              >
                Hola. Puedo leer el estado de tu día operativo, las ventas, el
                inventario y la nómina. Pregúntame lo que necesites saber de{' '}
                <Text style={{ fontWeight: '800' }}>{businessName}</Text>.
              </Text>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Text
              style={{
                color: 'rgba(10,10,10,0.5)',
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1.8,
                textTransform: 'uppercase',
                paddingHorizontal: 4,
              }}
            >
              Sugerencias
            </Text>
            {SUGGESTIONS.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => setDraft(s.label)}
                style={{
                  backgroundColor: 'transparent',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(10,10,10,0.1)',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: 'rgba(10,10,10,0.05)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={s.icon} size={15} color={INK} />
                </View>
                <Text
                  style={{
                    color: INK,
                    fontSize: 13,
                    fontWeight: '600',
                    flex: 1,
                  }}
                  numberOfLines={2}
                >
                  {s.label}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={15}
                  color="rgba(10,10,10,0.35)"
                />
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 18,
            paddingBottom: Platform.OS === 'ios' ? 24 : 16,
            paddingTop: 10,
            backgroundColor: PAPER_BG,
          }}
        >
          <View
            style={{
              backgroundColor: INK,
              borderRadius: 30,
              paddingLeft: 20,
              paddingRight: 6,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.32,
              shadowRadius: 18,
              elevation: 10,
            }}
          >
            <TextInput
              placeholder="Escribe una pregunta…"
              placeholderTextColor="rgba(245,242,234,0.42)"
              value={draft}
              onChangeText={setDraft}
              multiline
              style={{
                flex: 1,
                color: '#F5F2EA',
                fontSize: 15,
                fontWeight: '500',
                paddingVertical: 10,
                maxHeight: 100,
              }}
            />
            <Pressable
              onPress={handleSend}
              disabled={!draft.trim()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: draft.trim()
                  ? '#F5F2EA'
                  : 'rgba(245,242,234,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={
                  draft.trim() ? INK : 'rgba(245,242,234,0.4)'
                }
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
