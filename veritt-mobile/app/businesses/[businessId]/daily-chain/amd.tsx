import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { amdApi } from '@/api/modules/amd.api';
import type {
  AMDContentV1,
  AMDRow,
  AMDStatus,
  AMDVerifyResult,
} from '@/types/amd.types';
import { getApiErrorMessage } from '@/utils/error.utils';
import { notify } from '@/lib/notify';
import { formatMoney } from '@/lib/format';
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
import { VrittStatusChip } from '@/components/ui/VrittStatusChip';
import { VrittInfoBanner } from '@/components/ui/VrittInfoBanner';

// ── Helpers ──────────────────────────────────────────────────────────

type TabKey = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6';

const TABS: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'p1', label: 'Resumen', icon: 'sparkles-outline' },
  { key: 'p2', label: 'Finanzas', icon: 'document-text-outline' },
  { key: 'p3', label: 'Operativo', icon: 'layers-outline' },
  { key: 'p4', label: 'Alertas', icon: 'warning-outline' },
  { key: 'p5', label: 'Trazabilidad', icon: 'shield-checkmark-outline' },
  { key: 'p6', label: 'Equipo', icon: 'people-outline' },
];

function statusToTone(status: AMDStatus): 'progress' | 'done' | 'blocker' {
  switch (status) {
    case 'TAMPERED':
      return 'blocker';
    case 'VERIFIED':
      return 'done';
    case 'GENERATED':
    default:
      return 'progress';
  }
}

function statusLabel(status: AMDStatus): string {
  switch (status) {
    case 'TAMPERED':
      return 'Manipulado';
    case 'VERIFIED':
      return 'Verificado';
    case 'GENERATED':
    default:
      return 'Generado';
  }
}

function shortHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

// ── Pantalla ─────────────────────────────────────────────────────────

export default function AmdScreen() {
  const { businessId, date } = useLocalSearchParams<{
    businessId: string;
    date?: string;
  }>();

  const [amd, setAmd] = useState<AMDRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('p1');
  const [hashSheetVisible, setHashSheetVisible] = useState(false);
  const [verifyResult, setVerifyResult] = useState<AMDVerifyResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      const data = await amdApi.getCurrent(businessId, date);
      setAmd(data);
    } catch (err) {
      notify.error(
        'No pudimos cargar el AMD',
        getApiErrorMessage(
          err,
          'El AMD se genera al firmar el FOP. Asegúrate de que el día esté cerrado.',
        ),
      );
      setAmd(null);
    }
  }, [businessId, date]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load().finally(() => setIsLoading(false));
    }, [load]),
  );

  const onBack = useCallback(() => router.back(), []);

  const handleVerify = useCallback(async () => {
    if (!amd || !businessId) return;
    try {
      setIsVerifying(true);
      const result = await amdApi.verify(businessId, amd.id);
      setVerifyResult(result);
      if (result.valid) {
        notify.success(
          'AMD íntegro',
          `Hash recalculado coincide. ${shortHash(result.computedHash)}`,
        );
      } else {
        notify.error(
          'AMD manipulado',
          'El hash recalculado no coincide con el almacenado.',
        );
      }
    } catch (err) {
      notify.error(
        'No pudimos verificar',
        getApiErrorMessage(err, 'Intenta de nuevo.'),
      );
    } finally {
      setIsVerifying(false);
    }
  }, [amd, businessId]);

  if (isLoading) return <VrittLoader />;

  if (!amd) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
        <VrittScreenHeader
          onBack={onBack}
          title="AMD"
          eyebrow="Archivo Maestro Diario"
        />
        <View
          style={{
            flex: 1,
            padding: 22,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Ionicons
            name="document-lock-outline"
            size={32}
            color={text.onPaper.primary}
          />
          <Text
            style={{
              color: text.onPaper.primary,
              fontSize: 18,
              fontWeight: '800',
              textAlign: 'center',
            }}
          >
            AMD aún no generado
          </Text>
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 13,
              textAlign: 'center',
              maxWidth: 280,
              lineHeight: 18,
            }}
          >
            Se genera automáticamente cuando el FOP queda firmado. Termina la
            cadena diaria para ver el archivo del día.
          </Text>
        </View>
      </View>
    );
  }

  const content = amd.contentJson;

  return (
    <View style={{ flex: 1, backgroundColor: surface.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={surface.paper} />
      <VrittScreenHeader
        onBack={onBack}
        title="Archivo Maestro Diario"
        eyebrow={content.meta.businessName}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 22,
          paddingBottom: 60,
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Hero
          status={amd.status}
          content={content}
          onShowHash={() => setHashSheetVisible(true)}
          onVerify={handleVerify}
          isVerifying={isVerifying}
        />

        <TabBar active={activeTab} onSelect={setActiveTab} />

        {activeTab === 'p1' ? <P1View content={content} /> : null}
        {activeTab === 'p2' ? <P2View content={content} /> : null}
        {activeTab === 'p3' ? <P3View content={content} /> : null}
        {activeTab === 'p4' ? <P4View content={content} /> : null}
        {activeTab === 'p5' ? <P5View content={content} /> : null}
        {activeTab === 'p6' ? <P6View content={content} /> : null}
      </ScrollView>

      <HashSheet
        visible={hashSheetVisible}
        amd={amd}
        verifyResult={verifyResult}
        onClose={() => setHashSheetVisible(false)}
      />
    </View>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────

function Hero({
  status,
  content,
  onShowHash,
  onVerify,
  isVerifying,
}: {
  status: AMDStatus;
  content: AMDContentV1;
  onShowHash: () => void;
  onVerify: () => void;
  isVerifying: boolean;
}) {
  const tone = statusToTone(status);
  const opDate = new Date(`${content.meta.operationalDate}T12:00:00`);
  return (
    <View
      style={{
        backgroundColor: surface.ink,
        borderRadius: radius.lg,
        padding: 22,
        gap: 18,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <VrittStatusChip
          tone={tone}
          surface="ink"
          label={statusLabel(status)}
        />
        <Text
          numberOfLines={1}
          style={{
            color: text.onInk.muted,
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 0.4,
          }}
        >
          {opDate.toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
      </View>

      <View>
        <Text
          style={{
            color: text.onInk.muted,
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          Resultado neto del día
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={{
            color:
              content.p2_financials.incomeStatement.netResult >= 0
                ? palette.sage
                : palette.danger,
            fontSize: 40,
            fontWeight: '800',
            letterSpacing: -1.6,
            marginTop: 6,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatMoney(content.p2_financials.incomeStatement.netResult)}
        </Text>
        <Text
          style={{
            color: text.onInk.soft,
            fontSize: 12,
            fontWeight: '700',
            marginTop: 4,
          }}
        >
          Ingresos {formatMoney(content.p1_summary.revenue.gross)} ·{' '}
          {content.p1_summary.revenue.ticketCount} tickets
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: 'rgba(245,242,234,0.1)',
        }}
      >
        <Pressable
          onPress={onShowHash}
          style={{
            flex: 1,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: radius.sm + 2,
            backgroundColor: withAlpha(palette.paper, 0.06),
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="shield-outline" size={14} color={palette.paper} />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: palette.paper,
              fontSize: 11,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
              letterSpacing: 0.4,
            }}
          >
            {/* placeholder — el hash real lo muestra el sheet */}
            Hash SHA-256 · ver completo
          </Text>
          <Ionicons name="chevron-forward" size={14} color={palette.paper} />
        </Pressable>

        <Pressable
          onPress={onVerify}
          disabled={isVerifying}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: radius.sm + 2,
            backgroundColor: palette.paper,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            opacity: isVerifying ? 0.5 : 1,
          }}
        >
          <Ionicons
            name="checkmark-done-outline"
            size={14}
            color={palette.ink}
          />
          <Text
            style={{
              color: palette.ink,
              fontSize: 12,
              fontWeight: '900',
              letterSpacing: -0.2,
            }}
          >
            {isVerifying ? 'Verificando…' : 'Verificar'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── TabBar ────────────────────────────────────────────────────────────

function TabBar({
  active,
  onSelect,
}: {
  active: TabKey;
  onSelect: (key: TabKey) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.88}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: radius.pill,
              backgroundColor: isActive ? surface.ink : surface.card,
              borderWidth: 1,
              borderColor: isActive ? surface.ink : hairline.onPaper,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Ionicons
              name={tab.icon}
              size={13}
              color={isActive ? text.onInk.primary : text.onPaper.primary}
            />
            <Text
              style={{
                color: isActive ? text.onInk.primary : text.onPaper.primary,
                fontSize: 12,
                fontWeight: '800',
                letterSpacing: -0.2,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── P1 — Resumen humano ──────────────────────────────────────────────

function P1View({ content }: { content: AMDContentV1 }) {
  const p1 = content.p1_summary;
  return (
    <View style={{ gap: 14 }}>
      <Card>
        <Eyebrow>Ingreso del día</Eyebrow>
        <KvList
          rows={[
            ['Bruto', formatMoney(p1.revenue.gross)],
            ['Tickets', String(p1.revenue.ticketCount)],
            ['Promedio', formatMoney(p1.revenue.avgTicket)],
          ]}
        />
      </Card>

      <Card>
        <Eyebrow>Costo de ventas</Eyebrow>
        <KvList
          rows={[
            ['Teórico', formatMoney(p1.cogs.theoretical)],
            ['Real', formatMoney(p1.cogs.real)],
            ['Desviación', formatMoney(p1.cogs.deviationValue)],
          ]}
        />
      </Card>

      <Card>
        <Eyebrow>Margen</Eyebrow>
        <KvList
          rows={[
            ['Absoluto', formatMoney(p1.margin.absolute)],
            ['Porcentaje', `${p1.margin.percent.toFixed(1)}%`],
          ]}
        />
      </Card>

      <Card>
        <Eyebrow>Personal</Eyebrow>
        <KvList
          rows={[
            ['Pagado hoy', formatMoney(p1.laborCost.paidToday)],
            ['Devengado', formatMoney(p1.laborCost.accruedThisPeriod)],
          ]}
        />
      </Card>

      {p1.vsYesterday ? (
        <Card>
          <Eyebrow>Vs. ayer</Eyebrow>
          <KvList
            rows={[
              ['Ingresos', formatMoney(p1.vsYesterday.revenueDelta)],
              [
                'Margen %',
                `${p1.vsYesterday.marginDeltaPercent.toFixed(1)} pts`,
              ],
            ]}
          />
        </Card>
      ) : (
        <VrittInfoBanner
          tone="info"
          icon="information-circle-outline"
          title="Sin AMD del día anterior"
          description="No hay comparativo histórico para esta fecha."
        />
      )}
    </View>
  );
}

// ── P2 — Estados financieros ─────────────────────────────────────────

function P2View({ content }: { content: AMDContentV1 }) {
  const p2 = content.p2_financials;
  return (
    <View style={{ gap: 14 }}>
      <Card>
        <Eyebrow>Estado de resultados</Eyebrow>
        <KvList
          rows={[
            ['Ingresos', formatMoney(p2.incomeStatement.revenue)],
            ['Costo de ventas', formatMoney(p2.incomeStatement.costOfGoodsSold.total)],
            ['Utilidad bruta', formatMoney(p2.incomeStatement.grossProfit)],
            ['Personal', formatMoney(p2.incomeStatement.laborExpense)],
            ['Operativos', formatMoney(p2.incomeStatement.operatingExpenses)],
            ['Resultado neto', formatMoney(p2.incomeStatement.netResult), true],
          ]}
        />
      </Card>

      <Card>
        <Eyebrow>Balance — activos</Eyebrow>
        <KvList
          rows={[
            ['Efectivo', formatMoney(p2.balanceSheetSnapshot.assets.cash)],
            [
              'Inventario',
              formatMoney(p2.balanceSheetSnapshot.assets.inventoryAtCost),
            ],
            [
              'Cuentas por cobrar',
              formatMoney(p2.balanceSheetSnapshot.assets.accountsReceivable),
            ],
          ]}
        />
      </Card>

      <Card>
        <Eyebrow>Balance — pasivos</Eyebrow>
        <KvList
          rows={[
            [
              'Prestaciones devengadas',
              formatMoney(p2.balanceSheetSnapshot.liabilities.accruedLaborBenefits),
            ],
            [
              'Cuentas por pagar',
              formatMoney(p2.balanceSheetSnapshot.liabilities.accountsPayable),
            ],
            ['Capital', formatMoney(p2.balanceSheetSnapshot.equity), true],
          ]}
        />
      </Card>

      <Card>
        <Eyebrow>Flujo de efectivo</Eyebrow>
        <KvList
          rows={[
            ['Entradas: ventas', formatMoney(p2.cashFlow.inflows.sales)],
            ['Salidas: recepciones', formatMoney(p2.cashFlow.outflows.receipts)],
            ['Salidas: nómina', formatMoney(p2.cashFlow.outflows.payroll)],
            ['Neto', formatMoney(p2.cashFlow.net), true],
          ]}
        />
      </Card>

      {p2.balanceSheetSnapshot.assets.inventoryDetail.length > 0 ? (
        <Card>
          <Eyebrow>Detalle de inventario por material</Eyebrow>
          <View style={{ gap: 6, marginTop: 8 }}>
            {p2.balanceSheetSnapshot.assets.inventoryDetail.map((m) => (
              <RowLine
                key={m.materialId}
                left={`${m.name} · ${m.totalQuantity} ${m.baseUnit}`}
                right={formatMoney(m.totalValueAtCost)}
              />
            ))}
          </View>
        </Card>
      ) : null}
    </View>
  );
}

// ── P3 — Detalle operativo ───────────────────────────────────────────

function P3View({ content }: { content: AMDContentV1 }) {
  const p3 = content.p3_operational;
  return (
    <View style={{ gap: 14 }}>
      <Card>
        <Eyebrow>FOP — Validaciones del cierre</Eyebrow>
        <View style={{ gap: 6, marginTop: 8 }}>
          {p3.fop.validations.map((v, i) => (
            <RowLine
              key={i}
              left={v.label}
              right={
                v.isWithinThreshold
                  ? '✓ En umbral'
                  : `Δ ${v.difference.toFixed(2)}`
              }
              accent={v.isWithinThreshold ? palette.forest : palette.danger}
            />
          ))}
        </View>
      </Card>

      {p3.fai ? (
        <Card>
          <Eyebrow>FAI — Apertura ({p3.fai.items.length} materiales)</Eyebrow>
          <View style={{ gap: 6, marginTop: 8 }}>
            {p3.fai.items.slice(0, 8).map((it) => (
              <RowLine
                key={it.materialId}
                left={`${it.materialName}`}
                right={`${it.countedQuantity} ${it.baseUnit}`}
              />
            ))}
            {p3.fai.items.length > 8 ? (
              <RowLine
                left={`+${p3.fai.items.length - 8} más`}
                right=""
                muted
              />
            ) : null}
          </View>
        </Card>
      ) : null}

      {p3.fci ? (
        <Card>
          <Eyebrow>FCI — Cierre</Eyebrow>
          <View style={{ gap: 6, marginTop: 8 }}>
            {p3.fci.items.slice(0, 8).map((it) => (
              <RowLine
                key={it.materialId}
                left={it.materialName}
                right={`${it.countedQuantity} ${it.baseUnit}`}
              />
            ))}
            {p3.fci.items.length > 8 ? (
              <RowLine
                left={`+${p3.fci.items.length - 8} más`}
                right=""
                muted
              />
            ) : null}
          </View>
        </Card>
      ) : null}

      {p3.fid && p3.fid.items.length > 0 ? (
        <Card>
          <Eyebrow>FID — Desviaciones</Eyebrow>
          <View style={{ gap: 6, marginTop: 8 }}>
            {p3.fid.items.slice(0, 8).map((it) => (
              <RowLine
                key={it.materialId}
                left={it.materialName}
                right={formatMoney(it.deviationValueMXN)}
                accent={
                  it.deviationValueMXN > 0
                    ? palette.amber
                    : palette.forest
                }
              />
            ))}
          </View>
        </Card>
      ) : null}

      {p3.faf ? (
        <Card>
          <Eyebrow>FAF — Arqueo</Eyebrow>
          <KvList
            rows={[
              ['Esperado', formatMoney(p3.faf.totalExpected)],
              ['Contado', formatMoney(p3.faf.totalCounted)],
              ['Diferencia', formatMoney(p3.faf.difference), true],
            ]}
          />
        </Card>
      ) : null}

      {p3.shifts.length > 0 ? (
        <Card>
          <Eyebrow>Turnos del día</Eyebrow>
          <View style={{ gap: 6, marginTop: 8 }}>
            {p3.shifts.map((s) => {
              const hours = (s.totalMinutes / 60).toFixed(1);
              return (
                <RowLine
                  key={s.id}
                  left={s.staffFullName}
                  right={`${hours} h`}
                />
              );
            })}
          </View>
        </Card>
      ) : null}
    </View>
  );
}

// ── P4 — Alertas ─────────────────────────────────────────────────────

function P4View({ content }: { content: AMDContentV1 }) {
  const p4 = content.p4_alerts;
  if (p4.alerts.length === 0) {
    return (
      <VrittInfoBanner
        tone="done"
        icon="checkmark-circle"
        title="Sin alertas"
        description="No se detectaron condiciones que requieran atención."
      />
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {p4.alerts.map((a, i) => (
        <VrittInfoBanner
          key={i}
          tone={
            a.severity === 'critical'
              ? 'blocker'
              : a.severity === 'warning'
              ? 'review'
              : 'info'
          }
          icon={
            a.severity === 'critical'
              ? 'alert-circle'
              : a.severity === 'warning'
              ? 'warning-outline'
              : 'information-circle-outline'
          }
          title={a.code}
          description={a.message}
        />
      ))}
    </View>
  );
}

// ── P5 — Trazabilidad fiscal ─────────────────────────────────────────

function P5View({ content }: { content: AMDContentV1 }) {
  const p5 = content.p5_traceability.documentCompleteness;
  const overallTone =
    p5.overall === 'GREEN' ? 'done' : p5.overall === 'YELLOW' ? 'review' : 'blocker';
  return (
    <View style={{ gap: 14 }}>
      <VrittInfoBanner
        tone={overallTone as 'done' | 'review' | 'blocker'}
        icon={
          p5.overall === 'GREEN'
            ? 'checkmark-circle'
            : p5.overall === 'YELLOW'
            ? 'warning-outline'
            : 'alert-circle'
        }
        title={`Completitud documental: ${p5.overall}`}
        description="Cobertura promedio de respaldos fiscales del día."
      />

      <Card>
        <Eyebrow>Ventas</Eyebrow>
        <KvList
          rows={[
            ['Total', String(p5.sales.total)],
            ['Con CFDI', String(p5.sales.withCfdi)],
            ['Sin CFDI', String(p5.sales.withoutCfdi)],
            ['Cobertura', `${p5.sales.percent.toFixed(1)}%`, true],
          ]}
        />
      </Card>

      <Card>
        <Eyebrow>Recepciones</Eyebrow>
        <KvList
          rows={[
            ['Total', String(p5.receipts.total)],
            ['Con factura', String(p5.receipts.withInvoice)],
            ['Sin factura', String(p5.receipts.withoutInvoice)],
            ['Cobertura', `${p5.receipts.percent.toFixed(1)}%`, true],
          ]}
        />
      </Card>

      <Card>
        <Eyebrow>Facturas de proveedor</Eyebrow>
        <KvList
          rows={[
            ['Total', String(p5.supplierInvoices.total)],
            ['Con CFDI', String(p5.supplierInvoices.withDocument)],
            ['Sin CFDI', String(p5.supplierInvoices.withoutDocument)],
            ['Cobertura', `${p5.supplierInvoices.percent.toFixed(1)}%`, true],
          ]}
        />
      </Card>
    </View>
  );
}

// ── P6 — Rendimiento por usuario ─────────────────────────────────────

function P6View({ content }: { content: AMDContentV1 }) {
  const users = content.p6_user_performance.users;
  if (users.length === 0) {
    return (
      <VrittInfoBanner
        tone="info"
        icon="people-outline"
        title="Sin usuarios activos"
        description="No se registraron acciones atribuibles a usuarios el día de hoy."
      />
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {users.map((u) => (
        <Card key={u.userId}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: text.onPaper.primary,
                  fontSize: 14,
                  fontWeight: '900',
                  letterSpacing: -0.3,
                }}
              >
                {u.fullName}
              </Text>
              <Text
                style={{
                  color: text.onPaper.muted,
                  fontSize: 11,
                  fontWeight: '700',
                  marginTop: 2,
                }}
              >
                {u.role ?? 'Sin rol'} · {u.hoursWorked.toFixed(1)} h
              </Text>
            </View>
            <Text
              style={{
                color: text.onPaper.primary,
                fontSize: 14,
                fontWeight: '900',
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatMoney(u.actions.salesValue)}
            </Text>
          </View>
          <View style={{ marginTop: 10 }}>
            <KvList
              rows={[
                ['Ventas creadas', String(u.actions.salesCreated)],
                ['Recepciones', String(u.actions.receiptsCreated)],
                ['Procesos', String(u.actions.processesExecuted)],
                ['Desviaciones clasificadas', String(u.actions.deviationsClassified)],
                ...(u.deviationsAttributed.count > 0
                  ? ([
                      [
                        'Desviaciones atribuibles',
                        formatMoney(u.deviationsAttributed.valueMXN),
                      ],
                    ] as Array<[string, string]>)
                  : []),
              ]}
            />
          </View>
        </Card>
      ))}
    </View>
  );
}

// ── Hash sheet ───────────────────────────────────────────────────────

function HashSheet({
  visible,
  amd,
  verifyResult,
  onClose,
}: {
  visible: boolean;
  amd: AMDRow;
  verifyResult: AMDVerifyResult | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: surface.paper }}>
        <VrittSheetHeader
          eyebrow="AMD · Integridad"
          title="Hash SHA-256"
          onClose={onClose}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 22, gap: 18 }}
        >
          <Card>
            <Eyebrow>Hash almacenado</Eyebrow>
            <Text
              selectable
              style={{
                color: text.onPaper.primary,
                fontSize: 13,
                fontWeight: '700',
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                lineHeight: 18,
                marginTop: 8,
              }}
            >
              {amd.contentHash}
            </Text>
          </Card>

          {verifyResult ? (
            <Card>
              <Eyebrow>Resultado de verificación</Eyebrow>
              <View style={{ gap: 6, marginTop: 8 }}>
                <RowLine
                  left="Hash recalculado"
                  right=""
                />
                <Text
                  selectable
                  style={{
                    color: verifyResult.valid
                      ? palette.forestDeep
                      : palette.dangerDeep,
                    fontSize: 13,
                    fontWeight: '700',
                    fontFamily:
                      Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    lineHeight: 18,
                  }}
                >
                  {verifyResult.computedHash}
                </Text>
                <RowLine
                  left="Estado"
                  right={
                    verifyResult.valid
                      ? '✓ Íntegro'
                      : '✗ Manipulado'
                  }
                  accent={
                    verifyResult.valid
                      ? palette.forest
                      : palette.danger
                  }
                />
              </View>
            </Card>
          ) : (
            <VrittInfoBanner
              tone="info"
              icon="information-circle-outline"
              title="Sin verificación reciente"
              description="Toca el botón Verificar en el header para recalcular y comparar."
            />
          )}

          <Card>
            <Eyebrow>Metadatos</Eyebrow>
            <KvList
              rows={[
                ['Schema', `v${amd.schemaVersion}`],
                ['Generado', new Date(amd.generatedAt).toLocaleString('es-MX')],
                ['FOP id', amd.fopId.slice(0, 12) + '…'],
              ]}
            />
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Building blocks ──────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        padding: 16,
      }}
    >
      {children}
    </View>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: text.onPaper.muted,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.6,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Text>
  );
}

function KvList({
  rows,
}: {
  rows: Array<[string, string] | [string, string, boolean]>;
}) {
  return (
    <View style={{ marginTop: 8 }}>
      {rows.map(([k, v, emphasis], idx) => (
        <View
          key={`${k}-${idx}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 6,
            borderTopWidth: idx === 0 ? 0 : 1,
            borderTopColor: hairline.onPaperSoft,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              minWidth: 0,
              color: text.onPaper.muted,
              fontSize: 12,
              fontWeight: '700',
            }}
          >
            {k}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 0,
              color: text.onPaper.primary,
              fontSize: emphasis ? 14 : 12,
              fontWeight: emphasis ? '900' : '800',
              letterSpacing: emphasis ? -0.4 : -0.2,
              fontVariant: ['tabular-nums'],
            }}
          >
            {v}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RowLine({
  left,
  right,
  accent,
  muted,
}: {
  left: string;
  right: string;
  accent?: string;
  muted?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          minWidth: 0,
          color: muted ? text.onPaper.muted : text.onPaper.primary,
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: -0.1,
        }}
      >
        {left}
      </Text>
      {right ? (
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 0,
            color: accent ?? text.onPaper.primary,
            fontSize: 12,
            fontWeight: '800',
            letterSpacing: -0.2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {right}
        </Text>
      ) : null}
    </View>
  );
}
