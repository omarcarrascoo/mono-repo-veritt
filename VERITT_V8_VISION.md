# VERITT — Documento Maestro (Visión) · V8.0

> **Rol de este documento:** es la **VISIÓN** oficial de Veritt (qué debe ser el sistema).
> Reemplaza a `ARCHITECTURE_V3.md` (archivado). Para el **ESTADO real verificado contra el código**
> (qué existe / qué falta), ver [`VERITT_MASTER.md`](VERITT_MASTER.md) y el gap en
> [`GAP_V8_VS_CODE.md`](GAP_V8_VS_CODE.md).
>
> Mauricio Díaz de los Cobos · Andrés · Omar — Querétaro, México · 2026 · Confidencial.
>
> ⚠️ **TRUNCADO:** el texto fuente provisto por el usuario se corta a mitad de la sección **8.3**
> (en "cada producto con gramaje exacto por insumo —"). Las secciones 8.3 (final) en adelante
> están **pendientes**. Completar cuando se tenga el texto restante.

---

Veritt es un sistema operativo para negocios físicos, con especial énfasis en PYMEs, que convierte tu operación diaria en infraestructura verificable.

Lo que hace que Veritt sea distinto a cualquier cosa que existe no es lo que registra — es lo que produce. Cada día que un negocio opera con Veritt, el sistema genera un AMD: un documento sellado, inmutable, que consolida toda la información operativa y financiera del día. El AMD no es un reporte. Es una consecuencia. Se genera cuando todas las dependencias del sistema son consistentes entre sí — cuando la operación y los números cuadran de una forma que no puede ser fabricada. Si no cuadran, el AMD no existe hasta que la discrepancia tenga nombre, responsable y resolución.

Eso es posible porque Veritt no trabaja con datos aislados. Trabaja con relaciones. La venta contra el inventario. El inventario contra la caja. La caja contra el arqueo. El arqueo contra el AMD. Ningún dato existe solo — y esa interdependencia es lo que hace que el sistema sea imposible de falsificar de forma selectiva.

La complejidad que hace posible todo esto vive completamente oculta. El almacenista cuenta insumos. El cajero arquea caja. El mesero registra ventas. Ninguno sabe que detrás de esas tres acciones el sistema está calculando márgenes por lote, actualizando el Balance General, y construyendo un baseline estadístico del comportamiento de cada usuario.

> Este documento reemplaza cualquier versión anterior. En caso de contradicción con cualquier otro documento de arquitectura/financiero/estratégico, **prevalece este**.

---

## 1. Qué es Veritt

No es un punto de venta. No es un sistema de contabilidad. No es una app de inventarios. Es la capa que conecta todas esas funciones y produce algo que ninguna puede producir por separado: **un registro de la operación que nadie puede manipular retroactivamente, porque la manipulación es matemáticamente detectable.**

Cuatro principios definen qué hace confiable a un dato en Veritt: es **simultáneo** (se registra cuando ocurre), **relacional** (existe en función de todos los demás datos del día), **trazable** (tiene nombre, hora, rol y contexto), y **verificable** (puede auditarse contra la realidad física).

### 1.1 El problema — tres síntomas de una misma falla estructural

5.5 millones de establecimientos en México. 99.8% micro/PYMEs. 32 de cada 100 en servicios cierran antes de 4 años. La causa más frecuente no es falta de demanda — es **falta de información confiable**. Tres síntomas: el efectivo que no se rastrea, el inventario que se mueve sin control, y los números que nadie verifica. El mismo problema: ausencia de un sistema que registre, vincule y verifique la operación diaria automáticamente.

### 1.2 La cadena de formatos

Cada formato es prerrequisito del siguiente. El sistema no permite avanzar si el anterior no está completo y firmado. **El AMD no existe hasta que todos los formatos están completos.**

| Formato | Nombre | Quién ejecuta | Condición de habilitación | Genera |
|---|---|---|---|---|
| **FAI** | Formato de Apertura de Inventario | R1 | Inicio día operativo por R4 o R6 | Habilita POS y FCI |
| **POS** | Punto de Venta | R3 | FAI completado | Alimenta motor financiero en tiempo real |
| **FCI** | Formato de Cierre de Inventario | R1 | FAI completado. R1 decide cuándo. Hora máx en onboarding. | Sistema genera FID automáticamente |
| **FID** | Formato de Incidencias y Desviaciones | Sistema (automático) | FAI + FCI completados y firmados | R4 verifica y firma. Habilita FOP parcial. |
| **FAF** | Formato de Arqueo Financiero | R2 | Saldo inicial declarado. R2 decide cuándo. Hora máx onboarding. | R2 + R4 firman. Habilita FOP parcial. |
| **Reg. R5** | Registros Administrativos | R5 | Continuo durante el día | Entra al FOP. Visible para R6 en tiempo real. |
| **FOP** | Formato de Operaciones y Procesos | Sistema + R4 | 5 formatos completos y firmados. Inamovible. | R4 firma. Genera AMD. |
| **AMD** | Archivo Maestro Diario | Sistema | FOP firmado por R4 | Sellado SHA-256. Fin del día operativo. |

El **FID** no lo rellena nadie: es la conciliación automática FAI vs FCI. El evento original es inmutable; la capa de clasificación es editable hasta que R4 firma el FOP. **Firma con PIN** en todos los formatos (rol que ejecuta + co-firma R4): trazabilidad de intención explícita.

### 1.3 El AMD — las seis pestañas

El AMD no es un reporte, es un **activo**. 365 AMDs sellados = el expediente verificado más valioso de una PYME.

| Pestaña | Nombre | Contenido | Acceso |
|---|---|---|---|
| **P1** | Resumen humano | Narrativa del día en lenguaje operativo, sin tecnicismos | R4, R5, R6 |
| **P2** | Estados financieros formales | Estado de Resultados, Balance General y Flujo de Efectivo del día | R4, R5, R6 |
| **P3** | Detalle operativo completo | Cada transacción/movimiento/evento con timestamps y responsable | R4, R5, R6 |
| **P4** | Alertas de optimización | Propuestas del sistema. R6 aprueba/rechaza/aguanta. Se registra la decisión. | R4, R5, R6 |
| **P5** | Trazabilidad fiscal y documental | CFDIs vinculados, comprobantes, cumplimiento documental con semáforo | R4, R5, R6 |
| **P6** | Rendimiento por usuario | Métricas operativas individuales desde datos verificados | **Solo R6** |

**1.3.1 Vista de cumplimiento documental en P5:** cuatro indicadores con semáforo (CFDIs proveedores vs compras, comprobantes de gastos, nómina al día, movimientos sin comprobante). Veritt **no valida autenticidad fiscal ni se conecta al SAT** — garantiza que cada movimiento tiene respaldo documental vinculado y auditable.

### 1.4 Los siete candados de integridad

| Candado | Verifica | Mecanismo |
|---|---|---|
| **C1** | Inventario vs Ventas | Cada venta descuenta insumos de la receta. Descuadre → desviación en FID. |
| **C2** | Ventas vs Caja | R2 declara **saldo inicial de caja** antes de la 1ª venta. FAF verifica recaudado vs POS. **Tolerancia: exactamente cero.** |
| **C3** | Recepciones vs Órdenes de Compra | Recepción comparada contra OC. Discrepancias clasificadas: faltante / excedente / sustitución / variación de precio. |
| **C4** | Costos vs Resultados financieros | Costo teórico vs costo real siempre visible. |
| **C5** | Nómina vs Actividad registrada | Todo el personal con log in/out por turno. **Sin excepción de rol.** |
| **C6** | AMD vs Tiempo (SHA-256) | Hash al generar. Modificación posterior rompe el hash. No alterable retroactivamente. |
| **C7** | El sistema vs sí mismo (doble libro) | Libro teórico (sistema) vs libro operativo (usuarios). La discrepancia es la señal, nunca el fallo. |

**Detalles clave:** C2 — el saldo inicial es el primer botón del dashboard de R2, no configurable, estructural. C3 — la OC es una entidad con perfil estadístico por proveedor (modo lectura, alimenta P4). C5 — personal no registrado es invisible al candado = hoyo en la verificación. C7 — el AMD se genera cuando ambos libros son consistentes dentro de umbrales; "consistente" ≠ idéntico, significa **sin discrepancias no explicadas**.

### 1.5 Los seis roles

Los roles **no son niveles de acceso — son posiciones en la cadena de integridad**. Principio: **en Veritt no navegas — sigues un flujo.** El momento operativo determina la pantalla.

| Rol | Nombre | Flujo del día | Lo que NO ve |
|---|---|---|---|
| **R1** | Encargado de Inventario | FAI → opera (mermas, proveedores, comida personal) → FCI | Ventas, caja, datos de otros roles |
| **R2** | Encargado de Caja | Saldo inicial → opera (pagos, facturas, salidas) → FAF | **Comandas abiertas**, inventario |
| **R3** | Operador POS | Un botón: Comandar. Menú/Mesas/Cuentas → cierre con propina forzada | Inventario, caja, datos de otros roles |
| **R4** | Gerente de Turno | Iniciar día → dashboard tiempo real → FID + FAF parcial → FOP | P6 del AMD |
| **R5** | Administrador | Facturas, CxP, gastos extraordinarios, OCs, proveedores, activos | Comandas POS, detalle operativo de turno |
| **R6** | Dueño | Iniciar día (opcional) → dashboard completo → AMD P1-P6 → P4 | Nada fuera de su alcance |

**Reglas de arquitectura:** inicio del día explícito por R4/R6 (timestamp = base de contabilización). R2 no ve comandas (independencia del arqueo, C2). R3 sin cancelar/cortesía/descuento por defecto (configurable; cortesías las autoriza R4). R5 rinde a R6, no a R4. Acceso de terceros vía código de invitación de un solo uso con marca de agua. Información societaria requiere **unanimidad de todos los R6**.

### 1.6–1.7 Inventario avanzado y control físico de lotes

- **1.7.1 Gestión por lotes:** cada recepción crea un lote con identidad (código, costo unitario, fecha entrada, vencimiento). **Nunca costo promedio global — costo real del lote.**
- **1.7.2 Rotación FEFO+FIFO:** FEFO por vencimiento, FIFO como desempate. Invisible al operador. En V2 el Handheld refuerza en tiempo real.
- **1.7.3 Clasificación ABC:** automática desde consumo verificado, se actualiza con cada AMD.
- **1.7.4 FTI — Formato de Transformación Interna:** convierte insumos en un insumo nuevo (sin ingreso). Impacta C1 y C3.
- **1.7.5 Métricas visuales:** cada visualización tiene una pregunta de negocio dueña.
- **1.7.6 Cuentas por Pagar:** se originan cuando R5 registra factura con vencimiento; línea de tiempo a 90 días con semáforo.

### 1.8 Cierres parciales de turno — FCT y RCT

La cadena pertenece al **día**, no al turno. Para negocios con varios equipos/día:
- **FCT (Formato de Corte de Turno):** corte documentado con dos firmas (entrega/recibe). Estados: Limpio o Con Incidencia. No bloquea la operación.
- **Corte de Caja entre turnos:** R2 saliente documenta efectivo que deja; R2 entrante confirma. Ambos firman con PIN.
- **RCT (Registro de Cierre de Turno):** cuando FCT + Corte de Caja están validados por R4, el sistema genera el RCT, sellado SHA-256, vinculado al AMD. `Hash_AMD = SHA256(totales_del_dia + Hash_RCT[1] + ... + Hash_RCT[n])`.

### 1.9–1.14 Otros módulos de la visión

- **1.9 Onboarding contextual:** sin manual separado; notas reactivas que aparecen donde surge la duda y desaparecen tras N usos exitosos.
- **1.10 API de salida (V2):** solo lectura para terceros autorizados; R6 activa, genera token, define dimensiones. En V1 solo código de invitación.
- **1.11 Múltiples R6:** acceso total e independiente por socio; decisiones que requieren **unanimidad**; vigencia configurable que caduca sin respuesta.
- **1.12 Propinas y moje:** en POS, tres opciones forzadas al cerrar cuenta (% sugerido / monto / sin propina). Moje configurable por negocio. Confidence scoring monitorea patrones.
- **1.13 Comida de personal:** movimiento de inventario autorizado, costo al lote FEFO+FIFO, va a **gastos de operación** (no a costo de ventas) para preservar margen bruto.
- **1.14 Gastos extraordinarios:** fuera de la cadena diaria; **comprobante obligatorio** (sin él no se completa). 18 categorías en 6 grupos + campo abierto. Contabiliza en M5, impacta M8, documenta en P3/P5, análisis de impacto en P4.

---

## 2. El motor financiero (M1–M10)

> Lo que distingue al motor financiero no es la sofisticación de las fórmulas — es la **fuente de sus datos**: ya pasó por los 7 candados.

| Módulo | Qué calcula |
|---|---|
| **M1** | Registro atómico de ventas y costos variables (PVN, MC, CVTu por lote FEFO+FIFO en tiempo real) |
| **M2** | Estado de producción diario (MPC, CTP, CV) |
| **M3** | Estructura de costos: MP, MOD, MODI, GIF (costo real por lote, nunca promedio) |
| **M4** | Prorrateo de costos fijos por producto (3 bases configurables; validación Σ = CF_Dia) |
| **M5** | Utilidad operativa, punto de equilibrio, cobertura de CxP |
| **M6** | Estado de Resultados diario y MTD (análisis vertical/horizontal) |
| **M7** | Balance General diario (Activos = Pasivos + Capital, tolerancia $0.00; provisión diaria de prestaciones) |
| **M8** | Flujo de Efectivo diario + proyección a 30 días |
| **M9** | Razones financieras: liquidez, eficiencia, apalancamiento, EBITDA con semáforos; finiquito; **semáforo IMSS** |
| **M10** | Formalización progresiva: cada parámetro tiene estado **E (estimado) / C (calculado) / V (verificado)**, visible en P4 como % de madurez |

**M10 es la clave de adopción:** el sistema genera AMDs válidos desde el día 1 con datos E, y refina hacia V progresivamente. El indicador de madurez es **un mapa de mejora, no una advertencia de error**.

---

## 3. Arquitectura de integridad

- **3.1 Veritt no tiene módulos, tiene dependencias internas.** Si falta un eslabón, la cadena no produce el resultado. No hay AMD parcial. No se puede copiar una parte y obtener el resultado de Veritt.
- **3.2 Verificar vs validar:** validar = cumple una regla; verificar = corresponde con la realidad en relación con todo lo demás. **Veritt verifica.**
- **3.3 Verifica relaciones, no inputs individuales.** Un dato puede ser plausible aislado y falso en relación.
- **3.4 Robustez = doble libro.** Ante discrepancia, Veritt no falla — detecta, documenta y presenta a R4 para decidir (acepta / rechaza / cierra con observación). Lo que no puede ocurrir es que pase desapercibida.

---

## 4. De registro a inteligencia

- **4.1 Módulo de Inteligencia de Horarios:** modo lectura sobre AMDs históricos. Madurez: 30 AMDs → patrones básicos; 90 → horarios por día de semana; 365 → estacionalidad. Gestiona restricciones del equipo. **Entrega datos con nombre, no juicios.**
- **4.2 ROI del módulo de horarios:** compara costo de personal actual vs propuesto, proyecta impacto en margen. R6/R4 deciden, R5 ejecuta consecuencias en nómina — nunca al revés. Modo lectura: nunca modifica un AMD; los 7 candados siguen igual.

---

## 5. Confidence Scoring Operativo

Los candados detectan lo **incorrecto**; el scoring detecta lo **demasiado correcto** (consistencia estadísticamente imposible).

- **5.1** Capa de inteligencia en modo lectura, no un candado nuevo.
- **5.2 Shadow Mode (30–60 días):** observa y construye baseline sin alertar. Anomalía: `valor < percentil_5 o > percentil_95`, segmentado por negocio/turno/día/usuario.
- **5.3 Score por rol** (pesos: R1 0.35, R2 0.25, R3 0.20, R4 0.20) + **vector cruzado R2-R3** (coordinación cajero-POS, ≥3 días en ventana de 30).
- **5.4 Señales suaves y escalamiento:** señal en interfaz → alerta R4 → alerta R6 → bloqueo de cierre.
- **5.5 Loop de aprendizaje:** cada confirmación/descarte de R6 refina el modelo. Detecta patrones "justo debajo del umbral" en análisis de tendencia a 90 días.

---

## 6. La escala

| Nivel | Nombre | Descripción |
|---|---|---|
| **V1** | Negocio individual | Un punto. AMD diario, motor financiero completo, 6 roles, confidence scoring. |
| **V2** | Multi-ubicación | Misma arquitectura en varios puntos. Consolidación de AMDs. Dashboard ejecutivo. |
| **V3** | Red de negocios | Varios negocios bajo un mismo R6. Visión de portafolio. |
| **V4** | Red Veritt | La red completa. Datos anonimizados para benchmarking sectorial. |

**6.2 Seis aplicaciones de V4:** benchmarking sectorial, índices por vertical, detección de fraude cross-negocio, modelos de demanda agregada, **WorkPass verificado**, acceso a financiamiento basado en AMDs certificados.
**6.3 Verticales V1:** restaurantes/bares, entretenimiento nocturno, hoteles, retail de alimentos, salud, y cualquier negocio con inventario físico + personal + efectivo diario.
**6.4 Por qué PYMEs primero:** mayor necesidad, menor acceso. Veritt = sofisticación empresarial con simplicidad de operación.

---

## 7. Quién construye Veritt

- **Mauricio Díaz de los Cobos** — Fundador y director de producto. Arquitectura del sistema, estrategia comercial, documentación técnica.
- **Andrés** — Finanzas (ex Banco Monex, EBC). Motor financiero y estructura de costos.
- **Omar** — Senior engineer (ex Belize Bank, ex Airbnb). Arquitectura técnica e implementación.

Representación legal: firma en Querétaro. Objetivo: registro IMPI, secreto industrial, estructura corporativa para inversión.

---

## 8. Proceso de Onboarding

> El onboarding **no es instalación, es fundación.** La calidad de la verdad que Veritt produce depende de la calidad de los datos con que arranca.

- **8.1 Tres fases:** Visita 1 (levantamiento) → Fase 2 (carga y configuración interna) → Día 1 en vivo.
- **8.2 Antes de Visita 1 — documentación requerida:** acta constitutiva/RFC, contrato de arrendamiento, estados de cuenta bancarios, CFDIs de proveedores principales, nómina vigente. Verbal: costos fijos, horarios, turnos, zonas, estado de nómina, política de moje.
- **8.3 Visita 1 — documentar todo, configurar nada:** escucha y documentación, sin acceder al sistema. Levantamiento de espacio físico (orden lógico de FAI/FCI), catálogo de insumos (unidad, costo, proveedor, vencimiento), y recetas (cada producto con gramaje exacto por insumo) —

> ⚠️ **[EL DOCUMENTO FUENTE SE CORTA AQUÍ.]** Falta el resto de 8.3 y cualquier sección posterior. Completar cuando se reciba el texto restante.
