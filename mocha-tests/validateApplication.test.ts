import { validateApplication } from './validateApplication';

describe('validateApplication', () => {
  beforeEach(() => {
  });
  afterEach(() => {
    warnSpy.restore();
  });

  it('returns true for a valid application', () => {
    const app = {
      id: '123',
      title: 'App A',
      status: 'Beviljad',
      decisionDate: '2025-12-31',
    };
    expect(validateApplication(app)).to.be.true;
    expect(warnSpy.notCalled).to.be.true;
  });

  it('returns false and logs for missing id', () => {
    const app = {
      title: 'App A',
      status: 'Beviljad',
      decisionDate: '2025-12-31',
    };
    expect(validateApplication(app)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for invalid id type', () => {
    const app = {
      id: 123,
      title: 'App A',
    };
    expect(validateApplication(app)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for extra property', () => {
    const app = {
      id: '123',
      title: 'App A',
      foo: 'bar',
    };
    expect(validateApplication(app)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for null', () => {
    expect(validateApplication(null)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for undefined', () => {
    expect(validateApplication(undefined)).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('returns false and logs for empty object', () => {
    expect(validateApplication({})).to.be.false;
    expect(warnSpy.calledOnce).to.be.true;
  });
}); 