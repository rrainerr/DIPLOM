import React, { useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import { Link } from 'react-router-dom';
import {
    PieChartOutlined,
    DesktopOutlined,
    UserOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
} from '@ant-design/icons';
import './App.css';

const { Sider } = Layout;

const SidebarComponent = () => {
    const [collapsed, setCollapsed] = useState(false);

    const toggleCollapse = () => {
        setCollapsed(!collapsed);
    };

    return (
        <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={200} >
            {collapsed ? (
                <img src="/logo2.png" className="demo-logo-vertical" />
            ) : (
                <img src="/logo.png" className="demo-logo-vertical" />
            )}
            <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
                <Menu.Item key="1" icon={<UserOutlined />}>
                    <Link to="/profile">Профиль</Link>
                </Menu.Item>

                <Menu.Item key="2" icon={<PieChartOutlined />}>
                    <Link to="/">Расчеты</Link>
                </Menu.Item>

                <Menu.Item key="3" icon={<DesktopOutlined />}>
                    <Link to="/">Карта</Link>
                </Menu.Item>

            </Menu>
        </Sider>
    );
};

export default SidebarComponent;