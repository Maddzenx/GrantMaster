const uploadMock = jest.fn().mockResolvedValue({ error: null });
const getPublicUrlMock = jest.fn(() => ({ data: { publicUrl: 'https://public.url/test.pdf' } }));

module.exports = {
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      })),
    },
  })),
  // Expose mocks for test overrides
  uploadMock,
  getPublicUrlMock,
}; 