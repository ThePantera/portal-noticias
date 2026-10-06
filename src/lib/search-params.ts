type ParamValue = string | string[] | undefined;

/** Primer valor de un parámetro de la URL, como texto. */
export function textParam(value: ParamValue): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Número de página de `?pagina=`: entero positivo, 1 si falta o es inválido. */
export function pageParam(value: ParamValue): number {
  const page = Number.parseInt(textParam(value), 10);
  return Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1;
}
