import { useEffect, useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import './App.css';

function App() {
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Здесь можно отправить данные на сервер для авторизации
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            if (response.ok) {
                const data = await response.json();
                message.success('Авторизация успешна!');
                console.log('Успешная авторизация:', data);
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
                        label="Почта"
                        name="username"
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

export default App;