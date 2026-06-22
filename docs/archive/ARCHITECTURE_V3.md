# VERITT | Arquitectura V.3

## Como funciona Veritt, por que funciona, y que produce — para cualquier negocio fisico

---

### Sobre este documento

Este documento describe la arquitectura completa de Veritt — el problema que resuelve, la logica que lo sostiene, y el valor que produce — en lenguaje accesible para cualquier persona con familiaridad basica en sistemas de negocio.

No es un manual tecnico. No es una presentacion comercial. Es el documento que hila todos los elementos del sistema y muestra como cada pieza existe por una razon, como se conecta con las demas, y que se perderia si se removiera.

Es, en terminos simples, la explicacion de por que Veritt es lo que es.

> Veritt - Arquitectura V.3 - Documento interno - 2026

---

## 1. El problema — por que existe Veritt

Hay 5.5 millones de negocios fisicos activos en Mexico. El 99.8% son micro, pequenas o medianas empresas. De ellos, 32 de cada 100 en el sector servicios cierran antes de cumplir cuatro anos.

La causa mas frecuente no es la falta de demanda, ni la competencia, ni el financiamiento. Es algo mas silencioso y mas devastador:

> **El dueno no sabe la verdad de lo que pasa en su negocio todos los dias.**

No sabe si gano o perdio hoy. No sabe si alguien le esta robando. No sabe cuanto le cuesta realmente cada empleado incluyendo lo que les debe por ley. No sabe si puede pagar en diciembre. Y cuando necesita demostrar la salud de su negocio ante un banco, un inversionista, o una autoridad — no tiene nada que presentar.

Esto no es un problema de un solo sector. Es el problema estructural de cualquier negocio fisico que opera sin un sistema que registre, verifique y cierre su operacion con integridad todos los dias.

| Sin informacion operativa confiable | Sin formalizacion laboral real | Sin acceso al sistema financiero |
|---|---|---|
| El dueno toma decisiones sobre estimaciones que nadie verifico. El inventario se mueve sin trazabilidad. La caja absorbe diferencias sin explicacion. | El dueno no registra empleados en el IMSS porque no sabe si puede pagarlo. El resultado: alta rotacion, baja calidad operativa, ciclo que se retroalimenta. | Sin estados financieros verificables, los negocios no pueden acceder a credito institucional ni atraer inversion. Operan limitados a su flujo de caja diario. |
| Solo el 25.3% de microempresas usa computo en su operacion. | 54.4% de tasa de informalidad laboral en Mexico. | Solo el 14.4% de PYMEs uso credito bancario nuevo en 2024. |

**Estos tres sintomas son el mismo problema:** la ausencia de un sistema que registre, verifique y cierre la operacion de un negocio fisico con integridad verificable todos los dias. Eso es exactamente lo que Veritt construye.

---

## 2. Que es Veritt — y que no es

**Veritt es el sistema operativo para negocios fisicos.**

No es un software de contabilidad. No es un punto de venta. No es una app de inventarios. Es la capa que conecta todas esas funciones y produce algo que ninguna de ellas puede producir por separado: **la verdad verificada de lo que pasa en un negocio fisico, todos los dias.**

> Un sistema de registro acepta lo que le dan. Veritt valida que lo que le dan corresponde con la realidad.

| Sistema de registro tradicional | Veritt |
|---|---|
| Registra inputs sin validar consistencia entre modulos. | Valida consistencia cruzada entre inventario, ventas y caja. |
| No bloquea el flujo si hay inconsistencias. | Bloquea el flujo ante inconsistencias criticas. |
| Cualquier persona puede registrar lo que quiera. | Los datos de una arteria deben ser consistentes con los de todas las demas. |
| Los reportes reflejan lo que se capturo — no lo que ocurrio. | Los reportes reflejan lo que realmente ocurrio — verificado matematicamente. |

### La propiedad mas importante de Veritt

> **Veritt es simple de usar y complejo de falsificar.** Esa combinacion no existe en ningun competidor del mercado.

Por dentro, Veritt tiene la complejidad de un sistema bancario basico — integridad cruzada entre modulos, documentos inmutables, validacion matematica en tiempo real. Por fuera, el encargado de almacen cuenta lo que hay, el cajero cuenta el dinero, y el gerente verifica que todo se hizo. Eso es todo lo que el operador experimenta.

La sofisticacion tecnica esta completamente invisible para el usuario final. Pero es exactamente lo que hace posible la experiencia simple que ese usuario disfruta. A esto se le llama **complejidad oculta** — y es el principio de diseno mas dificil de lograr y mas valioso de tener.

---

## 3. Para cualquier negocio fisico — la logica universal

Veritt no esta disenado para restaurantes. Esta disenado para **negocios fisicos**. Los restaurantes son el mercado de entrada — el vertical donde el problema es mas visible, la adopcion es mas rapida, y la evidencia se genera mas facilmente.

Pero la arquitectura es universal porque se sostiene sobre tres entidades que existen en absolutamente cualquier negocio fisico del mundo:

| AREA | PROCESO | PERSONA |
|---|---|---|
| El espacio fisico o funcional donde ocurre la actividad. En un restaurante: cocina, barra, caja. En una clinica: consultorio, farmacia, recepcion. En un parque industrial: nave, almacen, bascula de entrada. | La secuencia de pasos que rige esa actividad. En un restaurante: apertura, servicio, cierre. En una escuela: registro de asistencia, clase, evaluacion. En construccion: recepcion de materiales, ejecucion de avance, reporte de obra. | El usuario que ejecuta el proceso en el area. En un restaurante: mesero, cocinero, cajero. En una clinica: medico, enfermero, estudiante en practicas. En un parque industrial: operador de bascula, supervisor de almacen, gerente de planta. |

Cualquier negocio fisico tiene areas, procesos y personas. Veritt configura esas tres entidades para cada cliente — y el mismo nucleo del sistema opera con integridad en todos los casos. **Ningun comportamiento esta hardcodeado.**

---

## 4. Una accion, multiples consecuencias — como fluyen los datos

El principio de diseno mas importante de Veritt es este: **cada accion que ocurre en el sistema tiene consecuencias trazables que atraviesan multiples capas sin trabajo adicional de nadie.**

No hay modulos aislados. No hay datos que viven solos. Cada dato que entra al sistema alimenta automaticamente todos los calculos que dependen de el — en tiempo real, sin intervencion humana, sin posibilidad de error de transcripcion.

### Ejemplos universales — como una accion genera multiples datos

#### Log in de un usuario al iniciar su turno

| # | Consecuencia trazable |
|---|---|
| 1 | **Control de acceso** — el sistema habilita los modulos correspondientes a su rol. |
| 2 | **Inicio del calculo de horas trabajadas** — timestamp exacto registrado con geolocalizacion. |
| 3 | **Trazabilidad operativa** — cualquier accion posterior queda vinculada a este usuario. |
| 4 | **Base de nomina** — las horas se acumulan para el periodo de pago configurado. |
| 5 | **Registro laboral verificable** — el IMSS, la STPS o el sindicato pueden verificar presencia. |
| 6 | **Inicio del registro de rendimiento** — se abre el periodo de metricas de la Pestana 6. |

#### Registro de una venta en el POS

| # | Consecuencia trazable |
|---|---|
| 1 | Ingreso bruto del dia actualizado en tiempo real. |
| 2 | Consumo teorico de insumos calculado automaticamente segun la receta del producto. |
| 3 | Margen bruto del dia recalculado con el nuevo dato. |
| 4 | Avance hacia el punto de equilibrio diario actualizado. |
| 5 | Ticket promedio del operador actualizado para la Pestana 6. |
| 6 | Ventas por area actualizadas para comparativos en tiempo real. |
| 7 | Base de la conciliacion cruzada del FOP al cierre del dia. |

#### Recepcion de mercancia en el almacen

| # | Consecuencia trazable |
|---|---|
| 1 | Inventario disponible del insumo actualizado con las unidades recibidas. |
| 2 | Costo unitario vigente del insumo actualizado si el precio cambio respecto a la compra anterior. |
| 3 | Margen bruto de todos los productos que usan ese insumo recalculado automaticamente. |
| 4 | Punto de equilibrio del dia ajustado con los nuevos costos. |
| 5 | Registro de trazabilidad documental — folio del CFDI del proveedor vinculado al evento. |
| 6 | Alerta generada si el precio subio mas del umbral configurado. |
| 7 | Input para la conciliacion de la orden de compra correspondiente. |

#### Conteo fisico de inventario al cierre (FCI)

| # | Consecuencia trazable |
|---|---|
| 1 | Consumo real del dia calculado: inventario inicial menos inventario final mas recepciones. |
| 2 | Desviacion vs consumo teorico calculada automaticamente — base del FID. |
| 3 | Impacto economico de la desviacion expresado en pesos. |
| 4 | Input para la conciliacion cruzada del FOP. |
| 5 | Base del inventario inicial del dia siguiente — el FCI de hoy es el FAI de manana. |
| 6 | Actualizacion del estado acumulado de inventario en el Balance General. |

#### Firma del FOP al cierre del dia

| # | Consecuencia trazable |
|---|---|
| 1 | Generacion automatica del AMD — sin ningun paso adicional de aprobacion. |
| 2 | Aplicacion del hash SHA-256 al contenido completo del documento. |
| 3 | Cierre del periodo de rendimiento de todos los usuarios activos ese dia. |
| 4 | Actualizacion del estado acumulado financiero del negocio — Balance General persistente. |
| 5 | Acumulacion de prestaciones laborales devengadas del dia en el pasivo del Balance. |
| 6 | Desbloqueo de la apertura del siguiente dia operativo. |
| 7 | Alimentacion del historial de inteligencia operativa para comparativos futuros. |

---

## 5. La cadena de formatos — como se cierra un dia con integridad

Veritt organiza el dia operativo en **cinco formatos secuenciales**. Cada formato es prerrequisito del siguiente. El sistema no permite avanzar si el anterior no esta correcto. Esta no es una restriccion de interfaz — es una **restriccion de arquitectura**.

> No se pide nada que el negocio no haga ya. Solo se hace formal, trazable, y verificable.

| Formato | Que captura | Que produce | Regla de bloqueo |
|---|---|---|---|
| **FAI** — Apertura de Inventario | Estado inicial del inventario verificado fisicamente. Entradas de insumos previas a la apertura. Validacion contra el FCI del dia anterior. | Inventario inicial verificado del dia. Deteccion de inconsistencias nocturnas con impacto en pesos. | Sin FAI autorizado, el dia no puede iniciar. Ningun rol puede ejecutar ninguna operacion. |
| **FCI** — Cierre de Inventario | Conteo fisico final del inventario al termino de la jornada. | Consumo real del dia por insumo. Inventario final verificado. Base del FID y del FAI del dia siguiente. | Sin FCI, el FID no puede ejecutarse. El dia no puede cerrarse. |
| **FID** — Inventario y Desviaciones | Diferencia entre consumo teorico segun recetas y consumo real segun FCI. Clasificacion de causa obligatoria por cada diferencia. | Desviaciones con impacto economico en pesos. Clasificadas por tipo: error, merma, robo, ajuste. | Desviaciones sin clasificar bloquean el FAF. Desviaciones criticas sin justificacion bloquean el AMD. |
| **FAF** — Arqueo Financiero | Efectivo contado por denominacion. Terminal por referencia de transaccion. Transferencias por folio. Todo contra lo que el POS registro. | Conciliacion financiera del dia verificada. Diferencia exacta identificada por forma de pago si existe. | **Tolerancia exactamente cero.** Un peso de diferencia bloquea el cierre. Sin override posible por ningun rol. |
| **FOP** — Operacion y Procesos | Verificacion de procesos criticos del negocio. Conciliacion cruzada: datos reportados vs valores teoricos calculados por el sistema. | Su firma genera el AMD automaticamente. Es el ultimo actor humano de la cadena. | Procesos bloqueantes sin ejecutar impiden el FOP. Conciliacion fallida requiere correccion antes de avanzar. |

---

## 6. El AMD — el documento que lo certifica todo

Al final del dia, cuando el FOP firma la conciliacion, el sistema genera automaticamente el **Archivo Maestro Diario — el AMD**. No es algo que nadie produce activamente. Es lo que ocurre cuando todo lo demas se hizo correctamente.

**El AMD no es una vista dinamica de otras tablas.** Es un documento completo e independiente, sellado con hash SHA-256, que nadie puede modificar retroactivamente. Si alguien altera cualquier campo — un numero, una fecha, una cantidad — el hash calculado no va a coincidir con el hash almacenado. La manipulacion es matematicamente detectable en cualquier momento futuro.

### Las seis pestanas del AMD

| Pestana | Contenido |
|---|---|
| **P1** — Resumen humano | Gane o perdi hoy? Donde esta el dinero? Cuanto debo en prestaciones? Como me fue vs ayer? Que atender manana? En lenguaje de dueno — sin tecnicismos, en un solo vistazo. Esta pestana es universal: funciona igual para el dueno de un restaurante, el director de una clinica, o el administrador de un parque industrial. |
| **P2** — Estados financieros formales | Estado de Resultados diario con costo total de personal. Balance General con pasivos de prestaciones laborales devengadas. Estado de Flujo de Efectivo. Nomenclatura contable estandar. Para contador, banco, inversionista o autoridad fiscal. Generados automaticamente todos los dias — sin trabajo adicional de nadie. |
| **P3** — Detalle operativo completo | Cada evento del dia expandido. Cada formato en su totalidad. Cada firma y timestamp de cada accion. Registro de log in/log out con horas trabajadas por usuario. Trazabilidad completa del dia. Respaldo de auditoria operativa y laboral ante cualquier tercero. |
| **P4** — Alertas de optimizacion | Inteligencia aplicada con datos verificados: producto sin ventas en 14 dias, merma sobre umbral, turno no rentable de forma recurrente, costo de insumo subio sin ajuste de precio, momento optimo para formalizar empleados en IMSS. Configurables por negocio — ninguna alerta esta hardcodeada. |
| **P5** — Trazabilidad fiscal y documental | Cada numero del dia vinculado a su documento fuente independiente: CFDI de venta, CFDI de proveedor, recibo de nomina, comprobante de gasto. Indice de completitud documental con semaforo: verde si todo esta comprobado, amarillo si hay pendientes, rojo si hay operaciones sin respaldo. Listo para auditoria del SAT, IMSS, STPS o cualquier entidad regulatoria. |
| **P6** — Rendimiento por usuario | Metricas individuales de cada usuario activo ese dia: horas trabajadas, acciones ejecutadas, volumen de ventas o produccion segun su rol, desviaciones atribuibles, cumplimiento de procesos asignados. Vista diaria en el AMD y acumulable por periodo — semana, mes, ciclo de practicas. Exportable como documento certificado con hash. |

---

## 7. Los siete candados — por que es practicamente imposible manipular Veritt

La mayoria de los sistemas de control tienen un punto ciego: verifican que lo que se registro existe en el sistema. No verifican que lo que se registro es consistente con la realidad de otros registros simultaneos.

Veritt no tiene ese punto ciego. Cada arteria del negocio genera datos independientes — y esos datos deben ser matematicamente consistentes entre si. Si no lo son, el sistema lo detecta. No como acusacion. Como consecuencia aritmetica inevitable.

| Candado | Mecanismo |
|---|---|
| **C1** — Inventario vs Ventas | Si se vendieron 50 ordenes de pasta, el sistema sabe exactamente cuantos insumos debieron consumirse segun las recetas. Si el inventario no cuadra con eso — sobra materia prima que 'deberia' haberse consumido, o falta mas de lo que justifican las ventas — la desviacion aparece con nombre, cantidad y valor en pesos. No hay forma de manipular uno sin que el otro lo delate. |
| **C2** — Ventas vs Caja | El POS registra cada transaccion. El FAF cuenta el dinero fisico. Si alguien cobra sin registrar — el dinero aparece en caja sin justificacion. Si alguien registra y se lleva el efectivo — el dinero no aparece en caja. Si alguien cancela una venta para quedarse con el efectivo — la cancelacion requiere autorizacion y queda en el registro para siempre. Tolerancia exactamente cero. |
| **C3** — Recepciones vs Ordenes de compra | Tres capas independientes: la orden de compra que genero administracion, la recepcion fisica que registra el almacenista, y la factura del proveedor. Si alguna no coincide con las otras — incidencia automatica. El mismo usuario no puede ejecutar la orden de compra y la recepcion fisica. La separacion de responsabilidades es de arquitectura, no de politica. |
| **C4** — Costos vs Estado de Resultados | El costo de ventas se calcula automaticamente a partir de recetas y consumo real. Nadie puede cambiarlo manualmente. Si el margen del dia es inusualmente alto o bajo, la Pestana 4 lo senala. Inflar costos para reducir el margen reportado produce una contradiccion con el inventario. Siempre. |
| **C5** — Nomina vs Log in/Log out | Las horas trabajadas se calculan desde timestamps reales — no desde lo que alguien reporta. Si alguien intenta cobrar horas que no trabajo, los timestamps no existen. Si alguien intenta borrar horas para no pagarlas, el registro esta en un AMD cerrado con hash. Inmutable. |
| **C6** — El AMD vs el tiempo | El hash SHA-256 congela el estado completo del documento al momento del cierre. Si alguien modifica cualquier campo despues — un dia, un mes, o tres anos despues — el hash calculado no va a coincidir con el almacenado. La manipulacion es matematicamente detectable en cualquier momento futuro. |
| **C7** — El sistema vs si mismo | El Core Regulador lleva dos libros simultaneos: el que los operadores llenan y el que el sistema calcula que deberia ser. El FOP los compara al cierre. Para que el AMD se genere, ambos deben coincidir dentro de los umbrales configurados. Si no coinciden — el AMD no se genera hasta que se resuelva la discrepancia. |

> Para falsificar datos de forma no detectable en Veritt, un actor malicioso tendria que manipular simultaneamente siete capas independientes con consistencia matematica perfecta, sin disparar alertas, y sin que la conciliacion cruzada del FOP detecte la inconsistencia. **En la practica — es imposible.**

### El efecto disuasorio — el beneficio que nadie calculo todavia

Cuando los empleados saben que los numeros no pueden mentir entre si — no porque alguien los vigile, sino porque la aritmetica no miente — el comportamiento cambia. La merma baja. Las diferencias de caja desaparecen. Las recepciones cuadran.

No porque la gente sea mas honesta de repente. Sino porque el costo de la deshonestidad es demasiado evidente.

Esto tiene nombre en economia conductual: **efecto disuasorio de la transparencia estructural**.

---

## 8. Veritt por industria — ejemplos concretos de valor real

El mismo sistema opera en cualquier negocio fisico porque la arquitectura es universal. Lo que cambia entre industrias es la configuracion — los procesos criticos del FOP, los umbrales del FID, los roles de usuario, las alertas de la Pestana 4. El nucleo es el mismo.

### Restaurantes y negocios de alimentos

*El mercado de entrada de Veritt — no porque sea el unico vertical, sino porque es donde el problema es mas visible y la adopcion mas directa.*

| Aspecto | Detalle |
|---|---|
| **Problema central** | El dueno no sabe si gano o perdio hoy. El inventario desaparece sin explicacion. La caja tiene diferencias que nadie puede justificar. El contador entrega numeros del mes pasado sobre los cuales ya no puede actuar. |
| **Lo que Veritt produce** | AMD diario con Estado de Resultados, margen por producto, consumo real vs teorico, y costo total de personal. Deteccion automatica de robo en cocina cuando el consumo de insumos no corresponde con las ventas registradas. |
| **Caso concreto** | Un restaurante vende 80 ordenes de arrachera. El sistema calcula que debieron consumirse 12 kg. El FCI registra 14 kg consumidos. El FID genera una alerta de 2 kg de desviacion con impacto economico exacto. El encargado debe clasificar la causa antes de que el dia pueda cerrar. |
| **Valor acumulado** | 365 AMDs cerrados = historial financiero verificado para acceso a credito bancario formal. El banco recibe estados financieros diarios que ningun restaurante de ese tamano ha podido presentar antes. |

### Clinicas, consultorios y hospitales

| Aspecto | Detalle |
|---|---|
| **Problema central** | Control de medicamentos e insumos medicos sin trazabilidad. Nomina compleja con guardias, turnos rotativos y personal subrogado. Sin evidencia verificable de procedimientos realizados para facturacion a aseguradoras o IMSS. |
| **Lo que Veritt produce** | Trazabilidad de insumos medicos por procedimiento. Horas de guardia verificadas con timestamps. Registro inmutable de procedimientos realizados por medico y turno. Cumplimiento documentado de NOM-251 y normativas sanitarias aplicables. |
| **Caso concreto — el estudiante en practicas** | Un estudiante de medicina registra log in al iniciar su guardia. Durante las 12 horas, el sistema registra cada procedimiento que ejecuta bajo supervision, en que area, con que paciente (anonimizado), y con que resultado. Al terminar su rotacion, la Pestana 6 acumula sus horas verificadas con timestamp, geolocalizacion, y firma digital del supervisor responsable. El estudiante puede exportar ese reporte como documento certificado con hash SHA-256 para presentar a su universidad. No hay forma de alterar las horas ni los procedimientos registrados — estan en AMDs cerrados e inmutables. |
| **Valor para la institucion educativa** | La universidad recibe evidencia verificable e inalterable del desempeno del estudiante — no un papel firmado por el jefe de area. El hospital recibe trazabilidad completa de quien hizo que durante cada guardia, lo cual es relevante ante cualquier reclamacion o auditoria. |

### Parques industriales y manufactura

| Aspecto | Detalle |
|---|---|
| **Problema central** | Control de acceso de personas y vehiculos sin trazabilidad verificable. Entradas y salidas de materiales sin conciliacion cruzada. Nomina de personal operativo compleja con multiples turnos y contratistas externos. |
| **Lo que Veritt produce** | Registro verificado de entradas y salidas de personas, vehiculos y cargas con timestamps y geolocalizacion. Conciliacion automatica entre ordenes de entrada y recepciones fisicas. Trazabilidad de materiales desde la bascula de entrada hasta el punto de uso en la nave. |
| **Caso concreto** | Un camion llega con 5 toneladas de materia prima. El operador de bascula registra la entrada con folio de la orden de compra y peso verificado. El almacenista registra la recepcion en la nave independientemente. El sistema concilia automaticamente — si el peso en bascula y el registrado en almacen no coinciden dentro del umbral configurado, se genera una alerta antes de que el proveedor abandone las instalaciones. |
| **Valor acumulado** | Historial verificable de cumplimiento de procesos de seguridad e higiene industrial. Evidencia ante auditorias de certificaciones ISO o ante inspecciones de la STPS. Trazabilidad completa de materiales para gestion de calidad. |

### Escuelas e instituciones educativas privadas

| Aspecto | Detalle |
|---|---|
| **Problema central** | Justificacion de incrementos de colegiatura sin estados financieros verificables. Nomina docente compleja con horas variables. Sin evidencia organizada para auditorias de la SEP o para transparencia ante mesas directivas. |
| **Lo que Veritt produce** | Estados financieros diarios que muestran el costo operativo real por alumno. Registro verificado de horas impartidas por docente. Evidencia para cumplir el Acuerdo 650 de la SEP sobre justificacion de incrementos. Transparencia financiera ante mesa directiva con datos verificados. |
| **Caso concreto** | Una escuela privada necesita justificar un incremento de colegiatura ante los padres de familia. El AMD acumulado del ano muestra el incremento real en costos operativos — nomina, mantenimiento, materiales — con trazabilidad documental completa. No es una proyeccion. Son 365 dias de operacion verificada. |
| **Valor adicional** | El registro de horas impartidas por docente en la Pestana 6 es evidencia verificable para evaluaciones de desempeno y para cualquier disputa laboral con personal academico. |

### Construccion y obra publica

| Aspecto | Detalle |
|---|---|
| **Problema central** | Avance de obra sin verificacion cruzada entre lo reportado y lo ejecutado. Materiales que desaparecen sin trazabilidad. Nomina de subcontratistas imposible de auditar. En obra publica: rendicion de cuentas sin evidencia verificable. |
| **Lo que Veritt produce** | Registro diario de avance de obra con evidencia fotografica y firma del supervisor. Trazabilidad de materiales desde la recepcion hasta su uso en la obra. Nomina verificada de trabajadores directos y subcontratistas con horas reales. En obra publica: el AMD como Acta de Avance Diario con hash SHA-256 — rendicion de cuentas verificable ante ASF o contraloria. |
| **Caso concreto** | Una constructora recibe 200 sacos de cemento. El almacenista registra la entrada con folio de la orden. En los siguientes dias, cada vaciado registra el consumo de cemento vinculado al area de la obra donde se uso. Si al cierre de semana el consumo real de cemento no corresponde con el avance de obra registrado — el FID genera la alerta con impacto economico exacto. |
| **Valor en obra publica** | El hash SHA-256 del AMD es la garantia de que el reporte de avance no fue alterado despues de firmarse. Cualquier auditor puede verificar matematicamente la integridad del documento en cualquier momento futuro. |

---

## 9. Lo que Veritt produce a escala — mas alla del negocio individual

Cada negocio que opera con Veritt produce algo que tiene valor individual inmediato: control, inteligencia financiera, formalizacion laboral, trazabilidad fiscal.

Pero cada negocio tambien produce algo que tiene valor sistemico a escala: **datos operativos y laborales verificados del sector informal**. No encuestas. No estimaciones. Datos reales, diarios, criptograficamente certificados, de como operan los negocios fisicos.

| Capa | Descripcion |
|---|---|
| **V1** — Sistema operativo para el negocio individual | Control operativo diario, inteligencia financiera automatica, formalizacion laboral organica, trazabilidad fiscal verificable, acceso al credito formal. $2,000-2,500 MXN/mes. |
| **V2** — Veritt Certificado — evidencia continua ante terceros | 365 dias de cierre operativo y laboral certificado de forma continua. Integracion directa con IMSS. El negocio puede presentarse ante banco, inversionista, SAT o autoridad con evidencia verificada e inalterable de su operacion. |
| **V3** — Veritt Data — infraestructura de datos con valor sistemico | La base de datos operativa y laboral mas granular y verificable del sector informal latinoamericano. Valor para bancos (scoring crediticio alternativo), aseguradoras (pricing de riesgo operativo real), IMSS e INFONAVIT (diseno de programas de formalizacion con evidencia de campo), BID, OIT, STPS, y fondos de inversion en LATAM. |

> **Veritt no es un competidor de los sistemas existentes. Es la condicion de fondo de como operan los negocios fisicos con integridad — en Mexico primero, en America Latina despues.**

---

## 10. Por que todo esto tiene sentido junto — coherencia arquitectonica

La prueba mas importante de que una arquitectura es correcta no es que cada pieza funcione bien por separado. Es que **el sistema se rompe si se remueve cualquier pieza**.

| Si se remueve... | El sistema pierde... |
|---|---|
| **El FAI** | La validacion del estado inicial del dia. Sin el, cualquier desviacion de inventario puede ser explicada como 'diferencia de apertura'. El candado 1 deja de funcionar. |
| **La tolerancia cero del FAF** | La garantia de integridad financiera. Con cualquier tolerancia — aunque sea de $1 — se abre un espacio de manipulacion que se puede explotar sistematicamente. |
| **El FOP con conciliacion cruzada** | La unica capa que compara datos reportados contra valores teoricos. Sin ella, el AMD se genera sobre lo que los operadores quisieron reportar — no sobre lo que realmente ocurrio. |
| **El hash SHA-256 del AMD** | La garantia de inmutabilidad. Sin el, cualquier AMD puede ser alterado retroactivamente sin dejar evidencia. Los 365 dias de historial dejan de ser verificables. |
| **El costo versionado de insumos** | La trazabilidad historica de costos. Sin el, los margenes historicos no pueden calcularse correctamente. Los AMDs de periodos anteriores pierden coherencia financiera. |
| **La Pestana 6 de rendimiento** | La trazabilidad individual de usuarios. Sin ella, el caso de uso del estudiante en practicas no tiene fundamento, la nomina no tiene evidencia verificable, y la Pestana 3 pierde profundidad. |
| **La Pestana 5 de trazabilidad fiscal** | El puente entre Veritt y las entidades regulatorias. Sin ella, Veritt es un sistema interno sin conexion con el mundo formal. El argumento de proteccion ante SAT, IMSS y STPS se debilita. |

### Lo que esto demuestra

> **Veritt no es una coleccion de funcionalidades. Es un sistema donde cada elemento existe porque los demas lo requieren.** La cadena de formatos produce la integridad que hace posible el AMD. El AMD produce la evidencia que hace posible el acceso al credito, la trazabilidad fiscal, y el valor de V3. Los siete candados hacen que esa evidencia sea confiable. Y la Pestana 6 hace que ese sistema sea aplicable a cualquier industria con usuarios que necesiten trazabilidad verificada de su desempeno.

La coherencia no es un argumento de venta. Es la consecuencia de haber disenado desde el problema — no desde las funcionalidades.
