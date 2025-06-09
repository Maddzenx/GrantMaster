import { validateGrant } from './validateGrant';

describe('validateGrant', () => {
  beforeEach(() => {
  });
  afterEach(() => {
    warnSpy.restore();
  });

  it('returns true for a valid grant', () => {
    const grant = {
      id: '123',
      title: 'Grant A',
      description: 'Desc',
      deadline: '2025-12-31',
      sector: 'Tech',
      stage: 'Open',
    };
    expect(validateGrant(grant)).to.be.true;
    expect(warnSpy.notCalled).to.be.true;
  });

  it('returns false and logs for missing id', () => {
    const grant = {
      title: 'Grant A',
      description: 'Desc',
      deadline: '2025-12-31',
    };
    expect(validateGrant(grant)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for invalid id type', () => {
    const grant = {
      id: 123,
      title: 'Grant A',
    };
    expect(validateGrant(grant)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for extra property', () => {
    const grant = {
      id: '123',
      title: 'Grant A',
      foo: 'bar',
    };
    expect(validateGrant(grant)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for null', () => {
    expect(validateGrant(null)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for undefined', () => {
    expect(validateGrant(undefined)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for empty object', () => {
    expect(validateGrant({})).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });
}); 