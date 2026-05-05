const test = require('node:test');
const assert = require('node:assert/strict');

const {
  cleanValue,
  compareObjects,
  getPath,
  isEmpty,
  setPath,
  validateType,
} = require('../dist/nodes/DataQualityToolkit/DataQualityToolkit.helpers.js');

test('isEmpty treats null, undefined, and blank strings as empty', () => {
  assert.equal(isEmpty(null), true);
  assert.equal(isEmpty(undefined), true);
  assert.equal(isEmpty('   '), true);
  assert.equal(isEmpty('value'), false);
  assert.equal(isEmpty(0), false);
  assert.equal(isEmpty(false), false);
});

test('getPath reads nested values using dot notation', () => {
  const source = { customer: { email: 'buyer@example.com', profile: { age: 42 } } };
  assert.equal(getPath(source, 'customer.email'), 'buyer@example.com');
  assert.equal(getPath(source, 'customer.profile.age'), 42);
  assert.equal(getPath(source, 'customer.missing'), undefined);
});

test('setPath creates nested objects and writes the value', () => {
  const target = {};
  setPath(target, 'dataQuality.valid', true);
  setPath(target, 'customer.email', 'buyer@example.com');

  assert.deepEqual(target, {
    dataQuality: { valid: true },
    customer: { email: 'buyer@example.com' },
  });
});

test('validateType supports primitive and common business data types', () => {
  assert.equal(validateType('hello', 'string'), true);
  assert.equal(validateType(123.45, 'number'), true);
  assert.equal(validateType(Number.NaN, 'number'), false);
  assert.equal(validateType(true, 'boolean'), true);
  assert.equal(validateType('buyer@example.com', 'email'), true);
  assert.equal(validateType('not-an-email', 'email'), false);
  assert.equal(validateType('https://example.com/order/123', 'url'), true);
  assert.equal(validateType('ftp://example.com', 'url'), false);
  assert.equal(validateType('2026-05-05', 'date'), true);
  assert.equal(validateType('+61 400 000 000', 'phone'), true);
});

test('cleanValue trims strings, collapses whitespace, and keeps non-empty fields', () => {
  const input = {
    name: '  ACME   Trading  ',
    empty: '   ',
    nested: {
      note: ' Hello\n   world ',
      keepZero: 0,
      keepFalse: false,
    },
    tags: ['  b2b  ', '', ' repeat   buyer '],
  };

  const result = cleanValue(input, {
    trimStrings: true,
    collapseWhitespace: true,
    removeEmptyFields: true,
  });

  assert.deepEqual(result, {
    name: 'ACME Trading',
    nested: {
      note: 'Hello world',
      keepZero: 0,
      keepFalse: false,
    },
    tags: ['b2b', 'repeat buyer'],
  });
});

test('compareObjects returns changed, added, and removed nested fields', () => {
  const before = {
    customer: { name: 'ACME', revenue: 100, status: 'lead' },
    oldOnly: 'remove me',
  };
  const after = {
    customer: { name: 'ACME', revenue: 150, status: 'customer' },
    newOnly: 'add me',
  };

  assert.deepEqual(compareObjects(before, after), [
    { field: 'customer.revenue', before: 100, after: 150 },
    { field: 'customer.status', before: 'lead', after: 'customer' },
    { field: 'newOnly', before: undefined, after: 'add me' },
    { field: 'oldOnly', before: 'remove me', after: undefined },
  ]);
});
