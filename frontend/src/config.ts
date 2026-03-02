// 动态判断基础路径
// 开发环境 (npm start): 请求本地后端 5000 端口
// 生产环境 (npm run build): 走相对路径 /api_proxy，交由 Nginx 剥离前缀并转发给后端
export const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000'
  : '/api_proxy';
