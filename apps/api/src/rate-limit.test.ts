import { clientKey } from './rate-limit.js';

describe('clientKey', () => {
  it('keeps IPv4 and IPv4-mapped addresses as they are', () => {
    expect(clientKey('203.0.113.7')).toBe('203.0.113.7');
    expect(clientKey('::ffff:203.0.113.7')).toBe('::ffff:203.0.113.7');
  });

  it('groups IPv6 addresses of the same /64', () => {
    expect(clientKey('2001:db8:1:2:aaaa::1')).toBe('2001:db8:1:2::/64');
    expect(clientKey('2001:0DB8:0001:0002:ffff:1:2:3')).toBe('2001:db8:1:2::/64');
    expect(clientKey('2001:db8::5')).toBe('2001:db8:0:0::/64');
    expect(clientKey('2001:db8:1:3::1')).not.toBe(clientKey('2001:db8:1:2::1'));
  });
});
