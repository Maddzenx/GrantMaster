import { normalizeGrant, Grant } from './normalizeGrant';

describe('normalizeGrant', () => {
  beforeEach(() => {
  });
  afterEach(() => {
    warnSpy.restore();
  });

  it('normalizes valid input with all fields', () => {
    const input = {
      Diarienummer: '123',
      Titel: 'Grant A',
      Beskrivning: 'Desc',
      Beslutsdatum: '2025-12-31',
      Sektor: 'Tech',
      Stage: 'Open',
    };
    const expected: Grant = {
      id: '123',
      title: 'Grant A',
      description: 'Desc',
      deadline: '2025-12-31',
      sector: 'Tech',
      stage: 'Open',
    };
    expect(normalizeGrant(input)).deep.equal(expected);
    expect(warnSpy.notCalled).to.be.true;
  });

  it('normalizes input with alternate field names', () => {
    const input = {
      diarienummer: '456',
      titel: 'Grant B',
      beskrivning: 'Beskrivning',
      beslutsdatum: '2025-11-30',
      sector: 'Health',
      stage: 'Closed',
    };
    const expected: Grant = {
      id: '456',
      title: 'Grant B',
      description: 'Beskrivning',
      deadline: '2025-11-30',
      sector: 'Health',
      stage: 'Closed',
    };
    expect(normalizeGrant(input)).deep.equal(expected);
    expect(warnSpy.notCalled).to.be.true;
  });

  it('returns null and logs for missing id', () => {
    const input = { Titel: 'No ID' };
    expect(normalizeGrant(input)).be.null;
    expect(warnSpy.calledWith('normalizeGrant: missing or invalid id', input)).to.be.true;
  });

  it('returns null and logs for invalid id type', () => {
    const input = { Diarienummer: 123 };
    expect(normalizeGrant(input)).be.null;
    expect(warnSpy.calledWith('normalizeGrant: missing or invalid id', input)).to.be.true;
  });

  it('returns null and logs for non-object input', () => {
    expect(normalizeGrant(null)).be.null;
    expect(warnSpy.calledWith('normalizeGrant: input is not an object', null)).to.be.true;
    expect(normalizeGrant(42)).be.null;
    expect(warnSpy.calledWith('normalizeGrant: input is not an object', 42)).to.be.true;
  });

  it('returns null and logs for failed validation', () => {
    const input = { Diarienummer: '789', title: 123, description: 456 };
    expect(normalizeGrant(input)).be.null;
    expect(warnSpy.calledWith(
      'normalizeGrant: failed validation',
      input
    )).to.be.true;
  });

  it('handles missing optional fields', () => {
    const input = { Diarienummer: '1' };
    const expected: Grant = {
      id: '1',
      title: null,
      description: null,
      deadline: null,
      sector: null,
      stage: null,
    };
    expect(normalizeGrant(input)).deep.equal(expected);
  });
}); 