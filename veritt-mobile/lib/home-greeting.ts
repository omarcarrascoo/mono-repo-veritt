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
    case 'OWNER':
      return 'Dueño';
    case 'ADMIN':
      return 'Admin';
    case 'SUPERVISOR':
      return 'Supervisor';
    case 'OPERATOR':
      return 'Operador';
    case 'VERITT_STAFF':
      return 'Veritt';
    default:
      return 'Invitado';
  }
}
