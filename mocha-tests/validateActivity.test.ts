import { validateActivity } from './validateActivity';

describe('validateActivity', () => {
  beforeEach(() => {
  });
  afterEach(() => {
    warnSpy.restore();
  });

  it('returns true for a valid activity', () => {
    const act = {
      id: '123',
      name: 'Activity A',
      description: 'Desc',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    };
    expect(validateActivity(act)).to.be.true;
    expect(warnSpy.notCalled).to.be.true;
  });

  it('returns false and logs for missing id', () => {
    const act = {
      name: 'Activity A',
      description: 'Desc',
      startDate: '2025-01-01',
    };
    expect(validateActivity(act)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for invalid id type', () => {
    const act = {
      id: 123,
      name: 'Activity A',
    };
    expect(validateActivity(act)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for extra property', () => {
    const act = {
      id: '123',
      name: 'Activity A',
      foo: 'bar',
    };
    expect(validateActivity(act)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for null', () => {
    expect(validateActivity(null)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for undefined', () => {
    expect(validateActivity(undefined)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for empty object', () => {
    expect(validateActivity({})).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });
}); 