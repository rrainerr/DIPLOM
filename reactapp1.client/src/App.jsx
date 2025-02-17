import { useEffect, useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import './App.css';

function App() {
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // ����� ����� ��������� ������ �� ������ ��� �����������
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            if (response.ok) {
                const data = await response.json();
                message.success('����������� �������!');
                console.log('�������� �����������:', data);
            } else {
                message.error('������ �����������. ��������� ������.');
            }
        } catch (error) {
            message.error('��������� ������ ��� �����������.');
            console.error('������:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container">
            <Card title="�����������" className="auth-card">
                <Form
                    name="authForm"
                    initialValues={{ remember: true }}
                    onFinish={onFinish}
                    autoComplete="off"
                >
                    <Form.Item
                        label="�����"
                        name="username"
                        rules={[{ required: true, message: '������� �����!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="������"
                        name="password"
                        rules={[{ required: true, message: '������� ������!' }]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            �����
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}

export default App;