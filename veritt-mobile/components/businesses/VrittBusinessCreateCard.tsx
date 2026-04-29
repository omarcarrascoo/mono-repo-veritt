import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type VrittBusinessCreateCardProps = {
  width: number;
  height: number;
  onPress: () => void;
};

const PAPER = '#F5F2EA';
const PAPER_SOFT = '#EDE8D9';

function Component({ width, height, onPress }: VrittBusinessCreateCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.94}
      onPress={onPress}
      style={{
        width,
        height,
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(245,242,234,0.14)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.28,
        shadowRadius: 28,
        elevation: 12,
      }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['#141922', '#0B0E12', '#070A0D']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(107,122,143,0.28)', 'rgba(107,122,143,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(143,176,157,0.1)', 'rgba(143,176,157,0)']}
        start={{ x: 0, y: 1 }}
        end={{ x: 0.6, y: 0.2 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      <View
        style={{
          flex: 1,
          padding: 26,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ gap: 20 }}>
          <Text
            style={{
              color: 'rgba(245,242,234,0.5)',
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Nuevo espacio
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: PAPER,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="add" size={30} color="#0B0E12" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: PAPER,
                  fontSize: 30,
                  fontWeight: '900',
                  letterSpacing: -1.4,
                  lineHeight: 32,
                }}
              >
                Crear{'\n'}negocio.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ gap: 18 }}>
          <Text
            style={{
              color: 'rgba(245,242,234,0.72)',
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            Cada negocio tiene su propia cadena operativa, equipo y reportes.
            Configura un nuevo espacio en pocos minutos.
          </Text>

          <View style={{ gap: 8 }}>
            <Bullet text="Cadena diaria FAI → FOP" />
            <Bullet text="Inventario, staff y nómina" />
            <Bullet text="Ventas y analítica dedicada" />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 6,
            }}
          >
            <Text
              style={{
                color: PAPER,
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              Empezar
            </Text>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: PAPER_SOFT,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="arrow-forward" size={18} color="#0B0E12" />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: 'rgba(245,242,234,0.55)',
        }}
      />
      <Text
        style={{
          color: 'rgba(245,242,234,0.78)',
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: -0.1,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

export const VrittBusinessCreateCard = memo(Component);
