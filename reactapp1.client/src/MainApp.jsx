import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from 'antd';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SidebarComponent from './SidebarComponent';

import './App.css';

const { Content } = Layout;

const App = () => {
    const [collapsed, setCollapsed] = useState(false);

    const toggleCollapse = () => {
        setCollapsed(!collapsed);
    };
    useEffect(() => {
        if (!user) {
            navigate('/');
        }
    }, [user, navigate]);
    return (
      
            <Layout style={{ minHeight: '100vh' }}>
               
                <Layout>
                    <SidebarComponent collapsed={collapsed} />
                    <Layout className="layout-content-wrapper">
                        <Content className="layout-content">

                        </Content>
                    </Layout>
                </Layout>
            </Layout>
   
    );
};

export default App;
