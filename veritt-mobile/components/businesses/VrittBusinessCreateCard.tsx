import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  radius,
  shadow,
  surface,
  text,
} from '@/constants/design-tokens';

type VrittBusinessCreateCardProps = {
  width: number;
  height: number;
  onPress: () => void;
};

const INK = surface.ink;
const INK_SOFT = text.onPaper.soft;
const INK_MUTED = text.onPaper.muted;
const HAIRLINE = hairline.onPaper;
const HAIRLINE_SOFT = hairline.onPaperSoft;

function Component({ width, height, onPress }: VrittBusinessCreateCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.94}
      onPress={onPress}
      style={{
        width,
        height,
        borderRadius: radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: HAIRLINE,
        backgroundColor: surface.card,
        ...shadow.card,
      }}
    >
      {/* Rail neutro — no comunica estado, es la card "crear" */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 4,
          backgroundColor: INK,
        }}
      />

      <View
        style={{
          flex: 1,
          paddingHorizontal: 26,
          paddingTop: 26,
          paddingBottom: 24,
          paddingLeft: 30,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ gap: 14 }}>
          <Text
            style={{
              color: INK_MUTED,
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 2.4,
              textTransform: 'uppercase',
            }}
          >
            Nuevo espacio
          </Text>
          <Text
            style={{
              color: INK,
              fontSize: 34,
              fontWeight: '800',
              letterSpacing: -1.2,
              lineHeight: 38,
            }}
          >
            Crear{'\n'}negocio.
          </Text>
        </View>

        <View style={{ gap: 22 }}>
          <Text
            style={{
              color: INK_SOFT,
              fontSize: 15,
              lineHeight: 22,
              letterSpacing: -0.1,
            }}
          >
            Configura un espacio con su propia cadena operativa, equipo y
            reportes. Toma pocos minutos.
          </Text>

          <View style={{ height: 1, backgroundColor: HAIRLINE_SOFT }} />

          <View style={{ gap: 10 }}>
            <ChecklistItem text="Cadena diaria FAI → FOP" />
            <ChecklistItem text="Inventario, staff y nómina" />
            <ChecklistItem text="Ventas y analítica dedicada" />
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
                color: INK,
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1.6,
                textTransform: 'uppercase',
              }}
            >
              Empezar
            </Text>
            <View
              style={{
                width: 32,
                height: 32,
                backgroundColor: INK,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="arrow-forward" size={16} color={text.onInk.primary} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View
        style={{
          width: 14,
          height: 1,
          backgroundColor: 'rgba(11,14,18,0.4)',
        }}
      />
      <Text
        style={{
          color: INK_SOFT,
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: -0.1,
          flex: 1,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

export const VrittBusinessCreateCard = memo(Component);
