export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  let d: Date
  if (typeof date === 'string') {
    // Las fechas solo-fecha ('YYYY-MM-DD') se interpretan en UTC al usar new Date,
    // lo que desplaza un día en zonas horarias negativas. Tratarlas como fecha local.
    d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T00:00:00') : new Date(date)
  } else {
    d = date
  }
  return d.toLocaleDateString('es-ES', options)
}
