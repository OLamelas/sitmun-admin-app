import { normalizeSrs } from './srs';

describe('SRS normalization', () => {
  it('converts OGC URNs to SITMUN identifiers', () => {
    expect(normalizeSrs('urn:ogc:def:crs:EPSG::25831')).toBe('EPSG:25831');
    expect(normalizeSrs('urn:x-ogc:def:crs:EPSG:6.6:4326')).toBe('EPSG:4326');
    expect(normalizeSrs('urn:ogc:def:crs:EPSG:3857')).toBe('EPSG:3857');
  });

  it('converts OGC HTTP CRS URIs to SITMUN identifiers', () => {
    expect(normalizeSrs('http://www.opengis.net/def/crs/EPSG/0/25831')).toBe('EPSG:25831');
    expect(normalizeSrs('https://www.opengis.net/def/crs/EPSG/0/4326')).toBe('EPSG:4326');
  });

  it('keeps already normalized and unknown identifiers', () => {
    expect(normalizeSrs(' EPSG:25831 ')).toBe('EPSG:25831');
    expect(normalizeSrs('CRS:84')).toBe('CRS:84');
    expect(normalizeSrs('urn:ogc:def:crs:OTHER::local-grid')).toBe('urn:ogc:def:crs:OTHER::local-grid');
  });
});
