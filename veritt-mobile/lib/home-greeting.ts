export function getFirstName(fullName?: string | null): string {
  if (!fullName?.trim()) return 'equipo';
  return fullName.trim().split(/\s+/)[0];
}

export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 6) return 'Madrugada';
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function getRoleLabel(role?: string | null): string {
  switch (role) {
    case 'R1_INVENTORY':
      return 'Encargado de Inventario';
    case 'R2_CASH':
      return 'Encargado de Caja';
    case 'R3_POS':
      return 'Operador POS';
    case 'R4_MANAGER':
      return 'Gerente de Turno';
    case 'R5_ADMIN':
      return 'Administrador';
    case 'R6_OWNER':
      return 'Dueño';
    case 'VERITT_STAFF':
      return 'Veritt';
    default:
      return 'Invitado';
  }
}
