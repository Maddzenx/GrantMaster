import { normalizeApplication, Application } from './normalizeApplication';

describe('normalizeApplication', () => {
  beforeEach(() => {
  });
  afterEach(() => {
    warnSpy.restore();
  });

  it('normalizes valid input with all fields', () => {
    const input = {
      Diarienummer: '123',
      Titel: 'App A',
      Status: 'Beviljad',
      Beslutsdatum: '2025-12-31',
    };
    const expected: Application = {
      id: '123',
      title: 'App A',
      status: 'Beviljad',
      decisionDate: '2025-12-31',
    };
    expect(normalizeApplication(input)).deep.equal(expected);
    expect(warnSpy.notCalled).to.be.true;
  });

  it('normalizes input with alternate field names', () => {
    const input = {
      diarienummer: '456',
      titel: 'App B',
      status: 'Avslagen',
      beslutsdatum: '2025-11-30',
    };
    const expected: Application = {
      id: '456',
      title: 'App B',
      status: 'Avslagen',
      decisionDate: '2025-11-30',
    };
    expect(normalizeApplication(input)).deep.equal(expected);
    expect(warnSpy.notCalled).to.be.true;
  });

  it('returns null and logs for missing id', () => {
    const input = { Titel: 'No ID' };
    expect(normalizeApplication(input)).be.null;
    expect(warnSpy.calledWith('normalizeApplication: missing or invalid id', input)).to.be.true;
  });

  it('returns null and logs for invalid id type', () => {
    const input = { Diarienummer: 123 };
    expect(normalizeApplication(input)).be.null;
    expect(warnSpy.calledWith('normalizeApplication: missing or invalid id', input)).to.be.true;
  });

  it('returns null and logs for non-object input', () => {
    expect(normalizeApplication(null)).be.null;
    expect(warnSpy.calledWith('normalizeApplication: input is not an object', null)).to.be.true;
    expect(normalizeApplication(42)).be.null;
    expect(warnSpy.calledWith('normalizeApplication: input is not an object', 42)).to.be.true;
  });

  it('returns null and logs for failed validation', () => {
    const input = { Diarienummer: '789', title: 123, status: 456 };
    expect(normalizeApplication(input)).be.null;
    expect(warnSpy.calledWith(
      'normalizeApplication: failed validation',
      input
    )).to.be.true;
  });

  it('handles missing optional fields', () => {
    const input = { Diarienummer: '1' };
    const expected: Application = {
      id: '1',
      title: null,
      status: null,
      decisionDate: null,
    };
    expect(normalizeApplication(input)).deep.equal(expected);
  });
}); 