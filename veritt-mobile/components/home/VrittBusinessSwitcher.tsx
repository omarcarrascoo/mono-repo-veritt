import React from 'react';
import {
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Business } from '@/types/business.types';

type VrittBusinessSwitcherProps = {
  visible: boolean;
  businesses: Business[];
  activeBusinessId: string | null;
  onClose: () => void;
  onSelect: (businessId: string) => void;
  onCreateNew: () => void;
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Dueño',
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  OPERATOR: 'Operador',
  VERITT_STAFF: 'Veritt',
};

const TYPE_LABELS: Record<string, string> = {
  RESTAURANT: 'Restaurante',
  CAFE: 'Cafetería',
  BAR: 'Bar',
  RETAIL: 'Retail',
  OTHER: 'Otro',
};

export function VrittBusinessSwitcher({
  visible,
  businesses,
  activeBusinessId,
  onClose,
  onSelect,
  onCreateNew,
}: VrittBusinessSwitcherProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#0B0B0B',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: 1,
            borderColor: '#1D1D1D',
            paddingHorizontal: 22,
            paddingTop: 12,
            paddingBottom: 32,
          }}
        >
          <View className="items-center mb-4">
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#2A2A2A',
              }}
            />
          </View>

          <Text className="text-[20px] font-extrabold text-veritt-text tracking-[-0.3px]">
            Cambiar de negocio
          </Text>
          <Text className="text-[13px] text-veritt-muted mt-1 mb-5">
            Elige sobre qué negocio quieres operar hoy.
          </Text>

          <View className="gap-2.5">
            {businesses.map((biz) => {
              const isActive = biz.id === activeBusinessId;
              return (
                <TouchableOpacity
                  key={biz.id}
                  activeOpacity={0.88}
                  onPress={() => onSelect(biz.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: isActive ? '#4A7C59' : '#1A1A1A',
                    backgroundColor: isActive ? '#0C1A14' : '#050505',
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: isActive ? '#4A7C59' : '#141414',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: isActive ? '#F2F2F2' : '#F2F2F2',
                        fontSize: 18,
                        fontWeight: '800',
                      }}
                    >
                      {biz.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-veritt-text">
                      {biz.name}
                    </Text>
                    <Text className="text-[12px] text-veritt-muted mt-0.5">
                      {TYPE_LABELS[biz.businessType] ?? biz.businessType}
                      {biz.userRole
                        ? ` · ${ROLE_LABELS[biz.userRole] ?? biz.userRole}`
                        : ''}
                    </Text>
                  </View>
                  {isActive ? (
                    <Ionicons name="checkmark-circle" size={22} color="#4A7C59" />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color="#6E6E6E" />
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={onCreateNew}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 18,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: '#2A2A2A',
                marginTop: 6,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: '#141414',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-veritt-text">
                  Crear nuevo negocio
                </Text>
                <Text className="text-[12px] text-veritt-muted mt-0.5">
                  Agrega otro espacio a tu operación.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
