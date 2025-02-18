import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Layout } from 'antd';
import Profile from './Profile';
import AuthForm from './AuthForm';
import './App.css';
import SidebarComponent from './SidebarComponent';

const { Content } = Layout;

function App() {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem('user')); // Получаем данные пользователя

    // Если пользователь не авторизован, перенаправляем на страницу авторизации
    useEffect(() => {
        if (!user) {
            navigate('/AuthForm');
        }
    }, [user, navigate]);

    const toggleCollapse = () => {
        setCollapsed(!collapsed);
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {user && <SidebarComponent collapsed={collapsed} />} {/* Условный рендеринг SidebarComponent */}
            <Layout>
                <Content className="layout-content">
                    <Routes>
                        <Route path="/" element={<Profile />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/AuthForm" element={<AuthForm />} />
                    </Routes>
                </Content>
            </Layout>
        </Layout>
    );
}

function Root() {
    return (
        <Router>
            <App />
        </Router>
    );
}

export default Root;