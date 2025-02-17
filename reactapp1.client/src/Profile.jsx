import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Typography } from 'antd';
import './App.css'; // Подключаем стили

const { Title, Text } = Typography;

const Profile = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user')); // Получаем данные пользователя

    // Если пользователь не авторизован, перенаправляем на страницу авторизации
    useEffect(() => {
        if (!user) {
            navigate('/');
        }
    }, [user, navigate]);

    // Функция для выхода
    const handleLogout = () => {
        localStorage.removeItem('user'); // Удаляем данные пользователя
        navigate('/'); // Перенаправляем на страницу авторизации
    };

    return (
        <div className="profile-container">
            <Card
                className="profile-card"
                actions={[
           
                    <Button type="link" danger onClick={handleLogout}>
                        Выйти
                    </Button>,
                ]}
            >
                <div className="profile-header">
                    <Title level={3}>{user?.firstName} {user?.surname}</Title>
                </div>
                <Descriptions column={1}>
                    <Descriptions.Item label="Должность">
                        <Text strong>{user?.idRole}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Почта">
                        <Text strong>{user?.email}</Text>
                    </Descriptions.Item>
                </Descriptions>
            </Card>
        </div>
    );
};

export default Profile;