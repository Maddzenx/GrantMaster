import { normalizeActivity, Activity } from './normalizeActivity';

describe('normalizeActivity', () => {
  beforeEach(() => {
  });
  afterEach(() => {
    warnSpy.restore();
  });

  it('normalizes valid input with all fields', () => {
    const input = {
      AktivitetsID: '123',
      Namn: 'Activity A',
      Beskrivning: 'Desc',
      Startdatum: '2025-01-01',
      Slutdatum: '2025-12-31',
    };
    const expected: Activity = {
      id: '123',
      name: 'Activity A',
      description: 'Desc',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    };
    expect(normalizeActivity(input)).deep.equal(expected);
    expect(warnSpy.notCalled).to.be.true;
  });

  it('normalizes input with alternate field names', () => {
    const input = {
      aktivitetsid: '456',
      namn: 'Activity B',
      beskrivning: 'Beskrivning',
      startdatum: '2025-02-01',
      slutdatum: '2025-11-30',
    };
    const expected: Activity = {
      id: '456',
      name: 'Activity B',
      description: 'Beskrivning',
      startDate: '2025-02-01',
      endDate: '2025-11-30',
    };
    expect(normalizeActivity(input)).deep.equal(expected);
    expect(warnSpy.notCalled).to.be.true;
  });

  it('returns null and logs for missing id', () => {
    const input = { Namn: 'No ID' };
    expect(normalizeActivity(input)).be.null;
    expect(warnSpy.calledWith('normalizeActivity: missing or invalid id', input)).to.be.true;
  });

  it('returns null and logs for invalid id type', () => {
    const input = { AktivitetsID: 123 };
    expect(normalizeActivity(input)).be.null;
    expect(warnSpy.calledWith('normalizeActivity: missing or invalid id', input)).to.be.true;
  });

  it('returns null and logs for non-object input', () => {
    expect(normalizeActivity(null)).be.null;
    expect(warnSpy.calledWith('normalizeActivity: input is not an object', null)).to.be.true;
    expect(normalizeActivity(42)).be.null;
    expect(warnSpy.calledWith('normalizeActivity: input is not an object', 42)).to.be.true;
  });

  it('returns null and logs for failed validation', () => {
    const input = { AktivitetsID: '789', name: 123, description: 456 };
    expect(normalizeActivity(input)).be.null;
    expect(warnSpy.calledWith(
      'normalizeActivity: failed validation',
      input
    )).to.be.true;
  });

  it('handles missing optional fields', () => {
    const input = { AktivitetsID: '1' };
    const expected: Activity = {
      id: '1',
      name: null,
      description: null,
      startDate: null,
      endDate: null,
    };
    expect(normalizeActivity(input)).deep.equal(expected);
  });
}); 