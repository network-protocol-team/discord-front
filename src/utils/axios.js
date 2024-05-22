import axios from 'axios';

const serverUrl = import.meta.env.VITE_SERVER_URL;

// 기본 REST API 처리
export const axiosApi = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Credentials': 'true',
  },
});

// 웹소켓 처리
export const axiosSocket = axios.create({});
