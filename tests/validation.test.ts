import { safeParseRegister, safeParseLogin } from '../src/lib/validation';

describe('Validation Schemas', () => {
  it('should pass for valid registration input', () => {
    const result = safeParseRegister({
      email: 'test@example.com',
      password: 'MyPass123!',
      name: 'John Doe'
    });
    expect(result.email).toBe('test@example.com');
  });

  it('should throw for invalid email', () => {
    expect(() =>
      safeParseRegister({ email: 'bademail', password: '12345678', name: 'John' })
    ).toThrow();
  });

  it('should throw for short password', () => {
    expect(() =>
      safeParseRegister({ email: 'a@b.com', password: 'short', name: 'Jane' })
    ).toThrow();
  });

  it('should pass for valid login input', () => {
    const result = safeParseLogin({
      email: 'test@example.com',
      password: 'StrongPass123!'
    });
    expect(result.email).toBe('test@example.com');
  });

  it('should throw for missing password', () => {
    expect(() => safeParseLogin({ email: 'test@example.com' })).toThrow();
  });
});
