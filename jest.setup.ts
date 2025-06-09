import '@testing-library/jest-dom';

// Mock global.fetch to always resolve with a successful response for all tests
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    })
  ) as any;
}

// Polyfill for TextEncoder/TextDecoder in Node.js for Jest
declare var global: any;
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}