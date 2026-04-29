import React, { memo } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { VrittAbstractShapes } from '@/components/home/VrittAbstractShapes';

type VrittHomeEmptyStateProps = {
  firstName: string;
  year: number;
  onCreateBusiness: () => void;
};

const PAPER_BG = '#F5F2EA';
const INK = '#0B0E12';

function Component({
  firstName,
  year,
  onCreateBusiness,
}: VrittHomeEmptyStateProps) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: PAPER_BG }}
      contentContainerStyle={{
        paddingHorizontal: 22,
        paddingTop: Platform.OS === 'ios' ? 90 : 82,
        paddingBottom: 140,
        gap: 22,
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor={PAPER_BG} />
      <View>
        <Text
          style={{
            color: 'rgba(10,10,10,0.5)',
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 2.6,
            textTransform: 'uppercase',
          }}
        >
          Veritt · Edición {year}
        </Text>
        <Text
          style={{
            color: INK,
            fontSize: 42,
            fontWeight: '900',
            letterSpacing: -1.8,
            lineHeight: 46,
            marginTop: 16,
          }}
        >
          Buenos días,{'\n'}
          <Text style={{ fontStyle: 'italic', fontWeight: '400' }}>
            {firstName}.
          </Text>
        </Text>
        <Text
          style={{
            color: 'rgba(10,10,10,0.6)',
            fontSize: 16,
            lineHeight: 24,
            marginTop: 14,
          }}
        >
          Aún no hay un negocio conectado. Empieza creando el primero para ver
          aquí tu día operativo, caja, equipo y cierre.
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onCreateBusiness}
        style={{
          backgroundColor: INK,
          borderRadius: 20,
          padding: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          overflow: 'hidden',
        }}
      >
        <VrittAbstractShapes tint={PAPER_BG} variant="wide" />
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={22} color={INK} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: '#F5F2EA',
              fontSize: 16,
              fontWeight: '800',
              letterSpacing: -0.3,
            }}
          >
            Crear mi primer negocio
          </Text>
          <Text
            style={{
              color: 'rgba(245,242,234,0.58)',
              fontSize: 13,
              marginTop: 3,
            }}
          >
            Configura el espacio y empieza a operar.
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color="#F5F2EA" />
      </TouchableOpacity>
    </ScrollView>
  );
}

export const VrittHomeEmptyState = memo(Component);
