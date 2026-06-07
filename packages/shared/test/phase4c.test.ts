import { test, assert, assertEqual } from './harness.ts';
import { parseVatId, vatIdCountryMatches } from '../src/domain/vat.ts';

test('parseVatId: splits a clean id', () => {
  const p = parseVatId('HR47263849152');
  assert(p !== null, 'should parse');
  assertEqual(p!.country, 'HR');
  assertEqual(p!.number, '47263849152');
});

test('parseVatId: strips spaces, dots, dashes', () => {
  const p = parseVatId('si-5896 2317');
  assert(p !== null, 'should parse messy input');
  assertEqual(p!.country, 'SI');
  assertEqual(p!.number, '58962317');
});

test('parseVatId: rejects malformed', () => {
  assertEqual(parseVatId(''), null);
  assertEqual(parseVatId(null), null);
  assertEqual(parseVatId('1234'), null);       // no country prefix
  assertEqual(parseVatId('S123'), null);        // single-letter prefix
});

test('vatIdCountryMatches: exact match', () => {
  assert(vatIdCountryMatches('HR47263849152', 'HR'), 'HR id, HR customer');
  assert(vatIdCountryMatches('si58962317', 'SI'), 'case-insensitive');
});

test('vatIdCountryMatches: mismatch is rejected', () => {
  assert(!vatIdCountryMatches('SI58962317', 'HR'), 'SI id on HR customer is a mismatch');
  assert(!vatIdCountryMatches('garbage', 'HR'), 'malformed id never matches');
});

test('vatIdCountryMatches: Greece EL/GR wrinkle', () => {
  assert(vatIdCountryMatches('EL123456789', 'GR'), 'EL VAT prefix matches GR country');
});
