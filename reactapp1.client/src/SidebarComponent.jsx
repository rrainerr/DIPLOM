import React, { useState, useEffect } from 'react';
import { Menu, Layout } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
    PieChartOutlined,
    DesktopOutlined,
    UserOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import './App.css';

const { Sider } = Layout;

const SidebarComponent = ({ collapsed, setCollapsed }) => {
    const [showSecondSider, setShowSecondSider] = useState(false);
    const location = useLocation();
    const [selectedKeys, setSelectedKeys] = useState(['1']);


    useEffect(() => {
        const savedCollapsed = localStorage.getItem('collapsed') === 'true';
        const savedShowSecondSider = localStorage.getItem('showSecondSider') === 'true';
        setCollapsed(savedCollapsed);
        setShowSecondSider(savedShowSecondSider);
    }, [setCollapsed]);

    useEffect(() => {
        localStorage.setItem('collapsed', collapsed);
    }, [collapsed]);

    useEffect(() => {
        localStorage.setItem('showSecondSider', showSecondSider);
    }, [showSecondSider]);


    useEffect(() => {
        const path = location.pathname;

        if (path === '/profile') {
            setSelectedKeys(['1']);
        } else if (path === '/Maping') {
            setSelectedKeys(['3']);
        }
        else if (path === '/Table') {
            setSelectedKeys(['2-2']);
        }
        else if (path === '/Table_hor') {
            setSelectedKeys(['2-3']);
        }
        else if (path === '/Table_stem') {
            setSelectedKeys(['2-4']);
        }
        else if (path === '/Table_paker') {
            setSelectedKeys(['2-5']);
        }
        else if (path === '/Table_nag') {
            setSelectedKeys(['2-6']);
        }

        if (path === '/Table' || path === '/Mapp' || path === '/Mapp_nag' || path === '/Table_nag' || path === '/Table_hor' || path === '/Table_stem' || path === '/Table_paker') {
            setShowSecondSider(true);
            setCollapsed(true);
        } else {
            setCollapsed(false);

        }
    }, [location.pathname, setCollapsed]);

    const handleCalculationsClick = () => {
        setShowSecondSider(true);
        setCollapsed(true);
    };

    return (
        <div style={{ display: 'flex', borderRight: '1px solid #ddd' }}>
            <Sider theme="light" collapsible collapsed={collapsed} onCollapse={setCollapsed} width={200}>
                {collapsed ? (
                    <Link onClick={() => {
                        setShowSecondSider(false);
                        setCollapsed(false);
                    }} to="/"><img src="/logo2.png" className="demo-logo-vertical" alt="logo" /></Link>
                ) : (
                    <Link onClick={() => {
                        setShowSecondSider(false);
                        setCollapsed(false);
                    }} to="/"><img src="/logo.png" className="demo-logo-vertical" alt="logo" /></Link>
                )}
                <Menu theme="light" selectedKeys={selectedKeys} mode="inline">
                    <Menu.Item key="1" icon={<UserOutlined />}>
                        <Link onClick={() => {
                            setShowSecondSider(false);
                            setCollapsed(false);
                        }} to="/profile">Профиль</Link>
                    </Menu.Item>

                    <Menu.Item key="2" icon={<PieChartOutlined />} onClick={handleCalculationsClick}>
                        <Link to="/Table">Фонд скважин</Link>
                    </Menu.Item>


                </Menu>
            </Sider>

            {showSecondSider && (
                <Sider theme="light" width={240} style={{ borderRight: '1px solid #ddd', borderLeft: '1px solid #ddd' }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0px 10px 0px 5px', background: '#e6f4ff ', borderRadius: '6px',
                        margin: '10px', height: '40px',
                    }}>
                        <p style={{ color: '#1677ff', }}>{<PieChartOutlined />}</p>
                        <p style={{ color: '#1677ff', }}><strong>Фонд скважин</strong></p>
                        <CloseOutlined
                            style={{ color: '#1677ff', cursor: 'pointer' }}
                            onClick={() => {
                                setShowSecondSider(false);
                                setCollapsed(false);
                            }}
                        />
                    </div>

                    <Menu theme="light" selectedKeys={selectedKeys} mode="inline">
                        <Menu.Item key="2-2">
                            <Link to="/Table">Добывавющие скважины</Link>
                        </Menu.Item>
                        <Menu.Item key="2-6">
                            <Link to="/Table_nag">Нагнетательные скважины</Link>
                        </Menu.Item>
                        <Menu.Item key="2-3">
                            <Link to="/Table_hor">Реестр пластов</Link>
                        </Menu.Item>
                        <Menu.Item key="2-4">
                            <Link to="/Table_stem">Реестр стволов</Link>
                        </Menu.Item>
                        <Menu.Item key="2-5">
                            <Link to="/Table_paker">Реестр пакеров</Link>
                        </Menu.Item>
                    </Menu>
                </Sider>
            )}
        </div>
    );
};

export default SidebarComponent;