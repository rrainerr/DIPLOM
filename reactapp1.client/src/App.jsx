import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import Profile from './Profile';
import './App.css';

function AuthForm() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    Email: values.email,
                    Password: values.password,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                message.success('Авторизация успешна!');
                localStorage.setItem('user', JSON.stringify(data.user)); // Сохраняем данные пользователя
                navigate('/profile'); // Перенаправляем на страницу профиля
            } else {
                message.error('Ошибка авторизации. Проверьте данные.');
            }
        } catch (error) {
            message.error('Произошла ошибка при авторизации.');
            console.error('Ошибка:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container">
            <Card title="Авторизация" className="auth-card">
                <Form
                    name="authForm"
                    initialValues={{ remember: true }}
                    onFinish={onFinish}
                    autoComplete="off"
                >
                    <Form.Item
                        placeholder="Введите почту"
                        label="Почта"
                        name="email"
                        rules={[{ required: true, message: 'Введите почту!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Пароль"
                        name="password"
                        rules={[{ required: true, message: 'Введите пароль!' }]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            Войти
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<AuthForm />} />
                <Route path="/profile" element={<Profile />} />
            </Routes>
        </Router>
    );
}

export default App;