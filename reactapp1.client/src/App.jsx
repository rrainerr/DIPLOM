import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Layout } from 'antd';
import Profile from './Profile';
import AuthForm from './AuthForm';
import Mapp from './Mapp';
import Mapp_nag from './Mapp_nag';
import Add_map from './Add_map';
import Table from './Table';
import Table_hor from './Table_hor';
import Table_paker from './Table_paker';
import Table_stem from './Table_stem';
import Table_nag from './Table_nag';
import Add_hor from './Add_hor';
import Add_packer from './Add_packer';
import Add_stem from './Add_stem';
import Add_slant from './Add_slant';
import Maping from './Maping';
import './App.css';
import SidebarComponent from './SidebarComponent';
import ruRU from "antd/lib/locale/ru_RU"; // Для русского языка
const { Content } = Layout;

function App() {
    const [collapsed, setCollapsed] = useState(() => {
        // Загружаем состояние из localStorage при инициализации
        const savedCollapsed = localStorage.getItem('collapsed') === 'true';
        return savedCollapsed;
    });
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem('user')); // Получаем данные пользователя

    // Если пользователь не авторизован, перенаправляем на страницу авторизации
    useEffect(() => {
        if (!user) {
            navigate('/AuthForm');
        }
    }, [user, navigate]);

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {user && <SidebarComponent collapsed={collapsed} setCollapsed={setCollapsed} />} {}
            <Layout>
                <Content className="layout-content">
                    <Routes>
                        <Route path="/" element={<Profile />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/AuthForm" element={<AuthForm />} />
                        <Route path="/Mapp" element={<Mapp />} />
                        <Route path="/Add_map" element={<Add_map />} />
                        <Route path="/Table" element={<Table />} />
                        <Route path="/Table_hor" element={<Table_hor />} />
                        <Route path="/Maping" element={<Maping />} />
                        <Route path="/Add_hor" element={<Add_hor />} />
                        <Route path="/Add_slant" element={<Add_slant />} />
                        <Route path="/Add_packer" element={<Add_packer />} />
                        <Route path="/Add_stem" element={<Add_stem />} />
                        <Route path="/Table_stem" element={<Table_stem />} />
                        <Route path="/Table_paker" element={<Table_paker />} />
                        <Route path="/Table_nag" element={<Table_nag />} />
                        <Route path="/Mapp_nag" element={<Mapp_nag />} />
                    </Routes>
                </Content>
            </Layout>
        </Layout>
    );
}

function Root() {
    return (
        <Router locale={ruRU} >
            <App />
        </Router>
    );
}

export default Root;