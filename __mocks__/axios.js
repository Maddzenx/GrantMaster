const axiosInstance = {
  request: jest.fn(),
  // Add other axios methods if needed
};

const axios = jest.fn(() => axiosInstance);
axios.create = jest.fn(() => axiosInstance);
axios.request = axiosInstance.request;

module.exports = axios; 