const uploadMock = jest.fn();
uploadMock.mockResolvedValue({ error: null });
const getPublicUrlMock = jest.fn(() => ({ data: { publicUrl: 'https://public.url/test.pdf' } }));
const fromMock = jest.fn(() => ({
  upload: uploadMock,
  getPublicUrl: getPublicUrlMock,
}));
const storageMock = { from: fromMock };

const supabase = {
  storage: storageMock,
};

exports.supabase = supabase;
// For test files to access the mocks directly
exports.uploadMock = uploadMock;
exports.getPublicUrlMock = getPublicUrlMock;
exports.fromMock = fromMock;
exports.storageMock = storageMock; 