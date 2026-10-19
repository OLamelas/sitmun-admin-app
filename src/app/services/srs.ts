const EPSG_URN = /^urn:(?:x-)?ogc:def:crs:EPSG:(?:[^:]*:)?(\d+)$/i;
const EPSG_HTTP_URI = /^https?:\/\/www\.opengis\.net\/def\/crs\/EPSG\/[^/]*\/(\d+)$/i;

/** WFS capabilities use OGC identifiers; SITMUN stores EPSG:CODE. */
export function normalizeSrs(value: string): string {
  const identifier = (value ?? '').trim();
  const urn = EPSG_URN.exec(identifier);
  if (urn) {
    return `EPSG:${urn[1]}`;
  }
  const httpUri = EPSG_HTTP_URI.exec(identifier);
  if (httpUri) {
    return `EPSG:${httpUri[1]}`;
  }
  return identifier;
}
