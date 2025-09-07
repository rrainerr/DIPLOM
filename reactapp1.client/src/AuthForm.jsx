import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import './App.css';

function AuthForm() {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    useEffect(() => {
        const user = sessionStorage.getItem('user');
        if (user) {
            navigate('/profile');
        }
    }, [navigate]);

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
                sessionStorage.setItem('user', JSON.stringify(data.user));
                navigate('/profile');
            } else if (response.status === 401) {
                form.setFields([
                    {
                        name: 'email',
                        errors: ['Неверный email или пароль'],
                    }
                ]);
                message.error('Неверные учетные данные');
            } else {
                message.error('Ошибка сервера. Попробуйте позже.');
            }
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                message.error('Нет подключения к серверу. Проверьте интернет соединение.');
            } else {
                message.error('Произошла непредвиденная ошибка');
                console.error('Ошибка:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const clearErrors = () => {
        form.setFields([
            {
                name: 'email',
                errors: [],
            },

        ]);
    };

    return (
        <div className="app-container">
            <Card title="Авторизация" className="auth-card">
                <Form
                    form={form}
                    name="authForm"
                    initialValues={{ remember: true }}
                    onFinish={onFinish}
                    autoComplete="off"
                    onChange={clearErrors}
                >
                    <Form.Item
                        label="Почта"
                        name="email"
                        rules={[
                            { required: true, message: 'Введите почту!' },
                            { type: 'email', message: 'Введите корректный email адрес!' }
                        ]}
                    >
                        <Input
                            placeholder="Введите почту"
                            onChange={clearErrors}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Пароль"
                        name="password"
                        rules={[
                            { required: true, message: 'Введите пароль!' },
                            { min: 3, message: 'Пароль должен содержать минимум 3 символа!' }
                        ]}
                    >
                        <Input.Password
                            placeholder="Введите пароль"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            style={{ width: 150 }}
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                        >
                            Войти
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}

export default AuthForm;