import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import 'antd/dist/reset.css';
import './index.scss';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { ConfigProvider } from 'antd';

dayjs.locale('zh-cn');
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
