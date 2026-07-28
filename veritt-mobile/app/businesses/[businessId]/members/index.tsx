import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { membershipsApi } from '@/api/modules/memberships.api';
import { Member, MembershipStatus } from '@/types/membership.types';
import { MembershipRole } from '@/types/business.types';
import { useBusinessStore } from '@/store/business.store';
import { useAuthStore } from '@/store/auth.store';
import { permissions } from '@/lib/role-permissions';
import { getRoleLabel } from '@/lib/home-greeting';
import { getApiErrorMessage } from '@/utils/error.utils';
import { notify } from '@/lib/notify';
import type { ChainTone } from '@/lib/daily-chain-home';
import {
  hairline,
  palette,
  radius,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';

import { VrittLoader } from '@/components/ui/VrittLoader';
import { VrittScreenHeader } from '@/components/ui/VrittScreenHeader';
import { VrittSheetHeader } from '@/components/ui/VrittSheetHeader';
import { VrittBottomDock } from '@/components/ui/VrittBottomDock';
import { VrittInfoBanner } from '@/components/ui/VrittInfoBanner';
import { VrittStatusChip } from '@/components/ui/VrittStatusChip';

// ── Pantalla: Miembros + roles (R6) ─────────────────────────────────────
// Cierra el ciclo de F1: el dueño invita personas por correo y les asigna un
// rol R1–R6. Listar está abierto a cualquier miembro; invitar / cambiar rol
// requiere la capability MEMBER_ADMIN (sólo R6 y staff Veritt).

// Roles que un dueño puede asignar (VERITT_STAFF es interno, no se ofrece).
const ASSIGNABLE_ROLES: MembershipRole[] = [
  'R1_INVENTORY',
  'R2_CASH',
  'R3_POS',
  'R4_MANAGER',
  'R5_ADMIN',
  'R6_OWNER',
];

const ROLE_HINT: Record<MembershipRole, string> = {
  R1_INVENTORY: 'Insumos, productos y recepciones.',
  R2_CASH: 'Saldo de apertura y arqueo del día.',
  R3_POS: 'Registra ventas en el punto de venta.',
  R4_MANAGER: 'Opera caja/POS y autoriza la cadena diaria.',
  R5_ADMIN: 'Finanzas, equipo, proveedores y configuración.',
  R6_OWNER: 'Control total, incluido invitar miembros.',
  VERITT_STAFF: 'Personal interno de Veritt.',
};

const STATUS_META: Record<
  MembershipStatus,
  { label: string; tone: ChainTone }
> = {
  ACTIVE: { label: 'Activo', tone: 'done' },
  INVITED: { label: 'Invitado', tone: 'progress' },
  INACTIVE: { label: 'Inactivo', tone: 'blocker' },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MembersScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const userRole = useBusinessStore((s) => s.getRole(businessId));
  const currentUserId = useAuthStore((s) => s.user?.id);
  const canManage = permissions.canManageMembers(userRole);

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Invitar
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MembershipRole | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Editar
  const [editing, setEditing] = useState<Member | null>(null);
  const [editRole, setEditRole] = useState<MembershipRole | null>(null);
  const [editStatus, setEditStatus] = useState<MembershipStatus>('ACTIVE');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      const list = await membershipsApi.list(businessId);
      setMembers(list);
    } catch (err) {
      notify.error(
        'No pudimos cargar el equipo',
        getApiErrorMessage(err, 'Verifica tu conexión.'),
      );
    }
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load().finally(() => setIsLoading(false));
    }, [load]),
  );

  const onBack = useCallback(() => router.back(), []);

  const activeCount = useMemo(
    () => members.filter((m) => m.status === 'ACTIVE').length,
    [members],
  );

  // ── Invitar ──────────────────────────────────────────────────────
  const openInvite = useCallback(() => {
    setInviteEmail('');
    setInviteRole(null);
    setInviteError(null);
    setInviteOpen(true);
  }, []);
  const closeInvite = useCallback(() => setInviteOpen(false), []);

  const emailOk = EMAIL_RE.test(inviteEmail.trim());
  const canInvite = emailOk && !!inviteRole;

  const handleInvite = useCallback(async () => {
    if (!businessId || !canInvite || !inviteRole) return;
    try {
      setIsInviting(true);
      setInviteError(null);
      await membershipsApi.add(businessId, {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      await load();
      setInviteOpen(false);
      notify.success(
        'Miembro agregado',
        `Se asignó el rol ${getRoleLabel(inviteRole)}.`,
      );
    } catch (err) {
      setInviteError(
        getApiErrorMessage(
          err,
          'No pudimos agregar al miembro. Verifica el correo.',
        ),
      );
    } finally {
      setIsInviting(false);
    }
  }, [businessId, canInvite, inviteEmail, inviteRole, load]);

  // ── Editar ───────────────────────────────────────────────────────
  const openEdit = useCallback(
    (member: Member) => {
      // No permitimos editar la propia membresía: evita auto-bloqueo si el
      // dueño se quita a sí mismo el rol R6 (perdería MEMBER_ADMIN).
      if (member.userId === currentUserId) return;
      setEditing(member);
      setEditRole(member.role);
      setEditStatus(member.status);
      setEditError(null);
    },
    [currentUserId],
  );
  const closeEdit = useCallback(() => setEditing(null), []);

  const editDirty =
    !!editing && (editRole !== editing.role || editStatus !== editing.status);

  const handleSaveEdit = useCallback(async () => {
    if (!businessId || !editing || !editRole || !editDirty) return;
    try {
      setIsSaving(true);
      setEditError(null);
      await membershipsApi.update(businessId, editing.id, {
        role: editRole,
        status: editStatus,
      });
      await load();
      setEditing(null);
      notify.success('Miembro actualizado', 'Los cambios ya están activos.');
    } catch (err) {
      setEditError(
        getApiErrorMessage(err, 'No pudimos guardar los cambios.'),
      );
    } finally {
      setIsSaving(false);
    }
  }, [businessId, editing, editRole, editStatus, editDirty, load]);

  if (isLoading) return <VrittLoader />;

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
      <VrittScreenHeader
        onBack={onBack}
        title="Miembros"
        eyebrow="Equipo · Accesos"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: canManage ? 180 : 60,
          gap: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — resumen del equipo */}
        <View
          style={{
            backgroundColor: surface.ink,
            borderRadius: radius.lg,
            padding: 22,
            gap: 14,
          }}
        >
          <Text
            style={{
              color: text.onInk.muted,
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            Equipo del negocio
          </Text>
          <Text
            style={{
              color: palette.paper,
              fontSize: 44,
              fontWeight: '800',
              letterSpacing: -1.8,
              fontVariant: ['tabular-nums'],
            }}
          >
            {members.length}
          </Text>
          <Text
            style={{
              color: text.onInk.soft,
              fontSize: 12,
              fontWeight: '700',
              lineHeight: 18,
            }}
          >
            {members.length === 1 ? 'persona' : 'personas'} con acceso ·{' '}
            {activeCount} {activeCount === 1 ? 'activa' : 'activas'}. Cada rol
            define qué puede ver y hacer.
          </Text>
        </View>

        {!canManage ? (
          <VrittInfoBanner
            tone="info"
            icon="eye-outline"
            title="Sólo lectura"
            description="Puedes ver el equipo, pero sólo el dueño invita miembros o cambia roles."
          />
        ) : null}

        {/* Lista de miembros */}
        <View style={{ gap: 10 }}>
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isSelf={member.userId === currentUserId}
              canManage={canManage}
              onPress={() => openEdit(member)}
            />
          ))}
        </View>
      </ScrollView>

      {canManage ? (
        <VrittBottomDock>
          <TouchableOpacity
            onPress={openInvite}
            activeOpacity={0.92}
            accessibilityRole="button"
            accessibilityLabel="Invitar miembro"
            style={{
              backgroundColor: surface.ink,
              borderRadius: radius.md,
              paddingVertical: 14,
              paddingHorizontal: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <Ionicons
              name="person-add-outline"
              size={18}
              color={text.onInk.primary}
            />
            <Text
              style={{
                color: text.onInk.primary,
                fontSize: 16,
                fontWeight: '800',
                letterSpacing: -0.3,
              }}
            >
              Invitar miembro
            </Text>
          </TouchableOpacity>
        </VrittBottomDock>
      ) : null}

      {/* Modal — invitar */}
      <InviteSheet
        visible={inviteOpen}
        email={inviteEmail}
        role={inviteRole}
        canSubmit={canInvite}
        isSubmitting={isInviting}
        errorMessage={inviteError}
        onChangeEmail={setInviteEmail}
        onSelectRole={setInviteRole}
        onSubmit={handleInvite}
        onClose={closeInvite}
      />

      {/* Modal — editar */}
      <EditSheet
        member={editing}
        role={editRole}
        status={editStatus}
        canSubmit={editDirty}
        isSubmitting={isSaving}
        errorMessage={editError}
        onSelectRole={setEditRole}
        onSelectStatus={setEditStatus}
        onSubmit={handleSaveEdit}
        onClose={closeEdit}
      />
    </View>
  );
}

// ── Fila de miembro ─────────────────────────────────────────────────────

function MemberRow({
  member,
  isSelf,
  canManage,
  onPress,
}: {
  member: Member;
  isSelf: boolean;
  canManage: boolean;
  onPress: () => void;
}) {
  const name = member.user.fullName?.trim() || member.user.email;
  const initial = name.charAt(0).toUpperCase();
  const statusMeta = STATUS_META[member.status];
  // El dueño no se edita a sí mismo (guardia anti auto-bloqueo).
  const editable = canManage && !isSelf;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!editable}
      activeOpacity={editable ? 0.9 : 1}
      accessibilityRole={editable ? 'button' : undefined}
      accessibilityLabel={editable ? `Editar a ${name}` : undefined}
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: radius.sm + 4,
          backgroundColor: withAlpha(palette.ink, 0.06),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: text.onPaper.primary,
            fontSize: 17,
            fontWeight: '800',
          }}
        >
          {initial}
        </Text>
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.primary,
              fontSize: 15,
              fontWeight: '800',
              letterSpacing: -0.3,
              flexShrink: 1,
            }}
          >
            {name}
          </Text>
          {isSelf ? (
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: radius.pill,
                backgroundColor: withAlpha(palette.ink, 0.08),
              }}
            >
              <Text
                style={{
                  color: text.onPaper.muted,
                  fontSize: 9,
                  fontWeight: '900',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}
              >
                Tú
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={{
            color: text.onPaper.muted,
            fontSize: 12,
            fontWeight: '600',
          }}
        >
          {getRoleLabel(member.role)} · {member.user.email}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <VrittStatusChip
          tone={statusMeta.tone}
          label={statusMeta.label}
          surface="paper"
          size="sm"
        />
        {editable ? (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={text.onPaper.subtle}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Selector de rol (paper) ─────────────────────────────────────────────

function RolePicker({
  value,
  onSelect,
  disabled,
}: {
  value: MembershipRole | null;
  onSelect: (role: MembershipRole) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      {ASSIGNABLE_ROLES.map((role) => {
        const selected = value === role;
        return (
          <TouchableOpacity
            key={role}
            onPress={() => onSelect(role)}
            disabled={disabled}
            activeOpacity={0.9}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: selected ? palette.ink : hairline.onPaper,
              backgroundColor: selected
                ? withAlpha(palette.ink, 0.04)
                : surface.card,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: selected ? palette.ink : hairline.onPaperStrong,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selected ? (
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: palette.ink,
                  }}
                />
              ) : null}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  color: text.onPaper.primary,
                  fontSize: 14,
                  fontWeight: '800',
                  letterSpacing: -0.3,
                }}
              >
                {getRoleLabel(role)}
              </Text>
              <Text
                style={{
                  color: text.onPaper.muted,
                  fontSize: 12,
                  fontWeight: '600',
                  lineHeight: 16,
                  marginTop: 1,
                }}
              >
                {ROLE_HINT[role]}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Modal: invitar ──────────────────────────────────────────────────────

function InviteSheet({
  visible,
  email,
  role,
  canSubmit,
  isSubmitting,
  errorMessage,
  onChangeEmail,
  onSelectRole,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  email: string;
  role: MembershipRole | null;
  canSubmit: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onChangeEmail: (v: string) => void;
  onSelectRole: (role: MembershipRole) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: surface.paper }}
      >
        <VrittSheetHeader
          eyebrow="Equipo · Acceso"
          title="Invitar miembro"
          onClose={onClose}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 22, gap: 18 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              color: text.onPaper.soft,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: '600',
            }}
          >
            La persona ya debe tener una cuenta en Veritt. Ingresa su correo y
            elige el rol con el que entrará al negocio.
          </Text>

          <View style={{ gap: 6 }}>
            <Text
              style={{
                color: text.onPaper.muted,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              Correo
            </Text>
            <View
              style={{
                backgroundColor: withAlpha(palette.ink, 0.04),
                borderRadius: radius.sm + 2,
                paddingHorizontal: 12,
              }}
            >
              <TextInput
                value={email}
                onChangeText={onChangeEmail}
                placeholder="persona@correo.com"
                placeholderTextColor={text.onPaper.subtle}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!isSubmitting}
                autoFocus
                style={{
                  paddingVertical: 12,
                  color: text.onPaper.primary,
                  fontSize: 15,
                  fontWeight: '700',
                  padding: 0,
                }}
              />
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text
              style={{
                color: text.onPaper.muted,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              Rol
            </Text>
            <RolePicker
              value={role}
              onSelect={onSelectRole}
              disabled={isSubmitting}
            />
          </View>

          {errorMessage ? (
            <VrittInfoBanner
              tone="blocker"
              icon="alert-circle"
              title="No se pudo invitar"
              description={errorMessage}
            />
          ) : null}
        </ScrollView>

        <SheetFooter
          label="Agregar al equipo"
          busyLabel="Agregando…"
          icon="person-add"
          onConfirm={onSubmit}
          onClose={onClose}
          canSubmit={canSubmit}
          isSubmitting={isSubmitting}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Modal: editar ───────────────────────────────────────────────────────

function EditSheet({
  member,
  role,
  status,
  canSubmit,
  isSubmitting,
  errorMessage,
  onSelectRole,
  onSelectStatus,
  onSubmit,
  onClose,
}: {
  member: Member | null;
  role: MembershipRole | null;
  status: MembershipStatus;
  canSubmit: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSelectRole: (role: MembershipRole) => void;
  onSelectStatus: (status: MembershipStatus) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const name = member?.user.fullName?.trim() || member?.user.email || '';
  const isActive = status === 'ACTIVE';

  return (
    <Modal
      visible={!!member}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: surface.paper }}
      >
        <VrittSheetHeader
          eyebrow="Equipo · Acceso"
          title={name}
          onClose={onClose}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 22, gap: 18 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 8 }}>
            <Text
              style={{
                color: text.onPaper.muted,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              Rol
            </Text>
            <RolePicker
              value={role}
              onSelect={onSelectRole}
              disabled={isSubmitting}
            />
          </View>

          {/* Estado — activar / desactivar acceso */}
          <View style={{ gap: 8 }}>
            <Text
              style={{
                color: text.onPaper.muted,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              Acceso
            </Text>
            <TouchableOpacity
              onPress={() =>
                onSelectStatus(isActive ? 'INACTIVE' : 'ACTIVE')
              }
              disabled={isSubmitting}
              activeOpacity={0.9}
              accessibilityRole="switch"
              accessibilityState={{ checked: isActive }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: 14,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: hairline.onPaper,
                backgroundColor: surface.card,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: text.onPaper.primary,
                    fontSize: 14,
                    fontWeight: '800',
                    letterSpacing: -0.3,
                  }}
                >
                  {isActive ? 'Acceso activo' : 'Acceso desactivado'}
                </Text>
                <Text
                  style={{
                    color: text.onPaper.muted,
                    fontSize: 12,
                    fontWeight: '600',
                    lineHeight: 16,
                    marginTop: 1,
                  }}
                >
                  {isActive
                    ? 'Puede entrar al negocio con su rol.'
                    : 'No podrá entrar hasta reactivarlo.'}
                </Text>
              </View>
              <View
                style={{
                  width: 46,
                  height: 28,
                  borderRadius: radius.pill,
                  padding: 3,
                  backgroundColor: isActive
                    ? palette.forest
                    : withAlpha(palette.ink, 0.14),
                  alignItems: isActive ? 'flex-end' : 'flex-start',
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: palette.paper,
                  }}
                />
              </View>
            </TouchableOpacity>
          </View>

          {errorMessage ? (
            <VrittInfoBanner
              tone="blocker"
              icon="alert-circle"
              title="No se pudo guardar"
              description={errorMessage}
            />
          ) : null}
        </ScrollView>

        <SheetFooter
          label="Guardar cambios"
          busyLabel="Guardando…"
          icon="checkmark"
          onConfirm={onSubmit}
          onClose={onClose}
          canSubmit={canSubmit}
          isSubmitting={isSubmitting}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Footer reutilizable de los modals ───────────────────────────────────

function SheetFooter({
  label,
  busyLabel,
  icon,
  onConfirm,
  onClose,
  canSubmit,
  isSubmitting,
}: {
  label: string;
  busyLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onClose: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
}) {
  return (
    <View
      style={{
        paddingTop: 14,
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 18,
        backgroundColor: surface.paper,
        borderTopWidth: 1,
        borderTopColor: hairline.onPaperSoft,
        gap: 10,
      }}
    >
      <TouchableOpacity
        onPress={onConfirm}
        disabled={!canSubmit || isSubmitting}
        activeOpacity={0.92}
        style={{
          backgroundColor: surface.ink,
          borderRadius: radius.md,
          paddingVertical: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: !canSubmit ? 0.4 : isSubmitting ? 0.6 : 1,
        }}
      >
        <Ionicons name={icon} size={18} color={text.onInk.primary} />
        <Text
          numberOfLines={1}
          style={{
            color: text.onInk.primary,
            fontSize: 15,
            fontWeight: '900',
            letterSpacing: -0.3,
          }}
        >
          {isSubmitting ? busyLabel : label}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onClose}
        disabled={isSubmitting}
        activeOpacity={0.88}
        style={{
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: hairline.onPaper,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: text.onPaper.primary,
            fontSize: 14,
            fontWeight: '800',
            letterSpacing: -0.2,
          }}
        >
          Volver
        </Text>
      </TouchableOpacity>
    </View>
  );
}
