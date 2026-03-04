const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Конфигурация
const CONFIG = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '8783132263:AAE5-IFCh01RodVuyYUn8g2gaMJ_N_MkfnE', // Токен бота
    GROUP_CHAT_ID: '-5293585696', // ID группы
    ADMIN_CHAT_IDS: ['920945194', '8050542983'],
    DATA_FILE: path.join(__dirname, 'data.json')
};

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Обслуживание статических файлов (для фронтенда)
app.use(express.static(__dirname));

// Корневой маршрут - отдаем index.html
app.get('/', (req, res) => {
    // Пробуем разные возможные пути
    const possiblePaths = [
        path.join(__dirname, 'index.html'),
        path.join(process.cwd(), 'index.html'),
        path.join(__dirname, '..', 'index.html'),
        path.join(process.cwd(), 'src', 'index.html')
    ];
    
    let fileSent = false;
    for (const filePath of possiblePaths) {
        try {
            if (fsSync.existsSync(filePath)) {
                console.log(`Найден index.html по пути: ${filePath}`);
                res.sendFile(filePath);
                fileSent = true;
                break;
            }
        } catch (e) {
            continue;
        }
    }
    
    if (!fileSent) {
        console.error('index.html не найден в следующих путях:', possiblePaths);
        console.log('__dirname:', __dirname);
        console.log('process.cwd():', process.cwd());
        res.status(404).send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <title>NAKUR SYSTEM - Ошибка</title>
                    <style>
                        body {
                            background: #000;
                            color: #fff;
                            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                            padding: 40px;
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <h1>NAKUR SYSTEM</h1>
                    <p>Файл index.html не найден. Проверьте структуру проекта.</p>
                    <p>Текущая директория: ${__dirname}</p>
                    <p>Рабочая директория: ${process.cwd()}</p>
                </body>
            </html>
        `);
    }
});

// Инициализация данных
let data = {
    users: [],
    reviews: {}
};

// Загрузка данных из файла
async function loadData() {
    try {
        const fileData = await fs.readFile(CONFIG.DATA_FILE, 'utf8');
        data = JSON.parse(fileData);
    } catch (error) {
        console.log('Создание нового файла данных...');
        await saveData();
    }
}

// Сохранение данных в файл
async function saveData() {
    try {
        await fs.writeFile(CONFIG.DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
    }
}

// Получение участников группы из Telegram
async function fetchGroupMembers() {
    if (!CONFIG.TELEGRAM_BOT_TOKEN) {
        console.warn('Токен бота не указан. Используются пустые данные.');
        return [];
    }

    try {
        // Получаем администраторов группы
        let adminIds = [];
        try {
            const adminsResponse = await axios.get(
                `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/getChatAdministrators`,
                { params: { chat_id: CONFIG.GROUP_CHAT_ID } }
            );
            adminIds = adminsResponse.data.result.map(admin => String(admin.user.id));
        } catch (error) {
            console.log('Не удалось получить список администраторов');
        }

        // Примечание: Telegram Bot API не позволяет получить полный список участников группы
        // напрямую. Участники собираются через:
        // 1. Webhook обновления (новые участники)
        // 2. Взаимодействия с ботом
        // 3. Ручное добавление через API /api/users/update
        
        // Возвращаем пустой массив, так как участники будут собираться через webhook
        // или добавляться вручную
        return [];
    } catch (error) {
        console.error('Ошибка получения участников группы:', error.response?.data || error.message);
        return [];
    }
}

// Обновление списка участников
async function updateUsers() {
    const members = await fetchGroupMembers();
    
    // Обновляем существующих пользователей и добавляем новых
    const existingUserIds = new Set(data.users.map(u => String(u.id || u.chat_id)));
    
    members.forEach(member => {
        const userId = String(member.id || member.user?.id);
        if (!existingUserIds.has(userId)) {
            data.users.push({
                id: userId,
                chat_id: userId,
                first_name: member.first_name || member.user?.first_name || 'Неизвестно',
                last_name: member.last_name || member.user?.last_name || '',
                username: member.username || member.user?.username || null,
                photo_100: member.photo_url || member.user?.photo_url || null
            });
        }
    });

    await saveData();
    return data.users;
}

// API Routes

// Получение всех участников
app.get('/api/users', async (req, res) => {
    try {
        // Обновляем список участников при каждом запросе
        await updateUsers();
        
        // Фильтруем админов
        const filteredUsers = data.users.filter(user => {
            const userId = String(user.id || user.chat_id);
            return !CONFIG.ADMIN_CHAT_IDS.includes(userId);
        });

        res.json(filteredUsers);
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ error: 'Ошибка получения пользователей' });
    }
});

// Получение отзывов
app.get('/api/reviews', (req, res) => {
    try {
        res.json(data.reviews);
    } catch (error) {
        console.error('Ошибка получения отзывов:', error);
        res.status(500).json({ error: 'Ошибка получения отзывов' });
    }
});

// Сохранение отзыва
app.post('/api/reviews', async (req, res) => {
    try {
        const { userId, review } = req.body;

        if (!userId || !review) {
            return res.status(400).json({ error: 'Неверные данные' });
        }

        if (!data.reviews[userId]) {
            data.reviews[userId] = {};
        }

        data.reviews[userId][review.authorId] = review;
        await saveData();

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка сохранения отзыва:', error);
        res.status(500).json({ error: 'Ошибка сохранения отзыва' });
    }
});

// Удаление отзыва
app.delete('/api/reviews/:userId/:authorId', async (req, res) => {
    try {
        const { userId, authorId } = req.params;

        if (data.reviews[userId] && data.reviews[userId][authorId]) {
            delete data.reviews[userId][authorId];
            
            if (Object.keys(data.reviews[userId]).length === 0) {
                delete data.reviews[userId];
            }

            await saveData();
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Отзыв не найден' });
        }
    } catch (error) {
        console.error('Ошибка удаления отзыва:', error);
        res.status(500).json({ error: 'Ошибка удаления отзыва' });
    }
});

// Обновление списка участников вручную
app.post('/api/users/update', async (req, res) => {
    try {
        const users = await updateUsers();
        res.json({ success: true, count: users.length });
    } catch (error) {
        console.error('Ошибка обновления пользователей:', error);
        res.status(500).json({ error: 'Ошибка обновления пользователей' });
    }
});

// Webhook для получения обновлений от Telegram
app.post('/webhook', async (req, res) => {
    try {
        const update = req.body;

        // Обработка новых участников группы
        if (update.message?.new_chat_members) {
            for (const member of update.message.new_chat_members) {
                const userId = String(member.id);
                if (!CONFIG.ADMIN_CHAT_IDS.includes(userId)) {
                    const existingUser = data.users.find(u => String(u.id || u.chat_id) === userId);
                    if (!existingUser) {
                        data.users.push({
                            id: userId,
                            chat_id: userId,
                            first_name: member.first_name || 'Неизвестно',
                            last_name: member.last_name || '',
                            username: member.username || null,
                            photo_100: null
                        });
                    }
                }
            }
            await saveData();
        }

        // Обработка сообщений для сбора участников
        if (update.message?.from) {
            const member = update.message.from;
            const userId = String(member.id);
            if (!CONFIG.ADMIN_CHAT_IDS.includes(userId)) {
                const existingUser = data.users.find(u => String(u.id || u.chat_id) === userId);
                if (!existingUser) {
                    data.users.push({
                        id: userId,
                        chat_id: userId,
                        first_name: member.first_name || 'Неизвестно',
                        last_name: member.last_name || '',
                        username: member.username || null,
                        photo_100: null
                    });
                    await saveData();
                } else {
                    // Обновляем информацию о существующем пользователе
                    existingUser.first_name = member.first_name || existingUser.first_name;
                    existingUser.last_name = member.last_name || existingUser.last_name;
                    existingUser.username = member.username || existingUser.username;
                    await saveData();
                }
            }
        }

        res.json({ ok: true });
    } catch (error) {
        console.error('Ошибка обработки webhook:', error);
        res.status(500).json({ error: 'Ошибка обработки webhook' });
    }
});

// Ручное добавление пользователя (для тестирования или миграции)
app.post('/api/users/add', async (req, res) => {
    try {
        const { user } = req.body;
        
        if (!user || !user.id) {
            return res.status(400).json({ error: 'Неверные данные пользователя' });
        }

        const userId = String(user.id || user.chat_id);
        if (CONFIG.ADMIN_CHAT_IDS.includes(userId)) {
            return res.status(400).json({ error: 'Администраторы не могут быть добавлены' });
        }

        const existingUser = data.users.find(u => String(u.id || u.chat_id) === userId);
        if (existingUser) {
            // Обновляем существующего пользователя
            Object.assign(existingUser, {
                first_name: user.first_name || existingUser.first_name,
                last_name: user.last_name || existingUser.last_name,
                username: user.username || existingUser.username,
                photo_100: user.photo_100 || user.photo_url || existingUser.photo_100
            });
        } else {
            // Добавляем нового пользователя
            data.users.push({
                id: userId,
                chat_id: userId,
                first_name: user.first_name || 'Неизвестно',
                last_name: user.last_name || '',
                username: user.username || null,
                photo_100: user.photo_100 || user.photo_url || null
            });
        }

        await saveData();
        res.json({ success: true, user: existingUser || data.users[data.users.length - 1] });
    } catch (error) {
        console.error('Ошибка добавления пользователя:', error);
        res.status(500).json({ error: 'Ошибка добавления пользователя' });
    }
});

// Запуск сервера
async function startServer() {
    await loadData();
    
    app.listen(PORT, () => {
        console.log(`Сервер запущен на порту ${PORT}`);
        console.log(`API доступен по адресу: http://localhost:${PORT}/api`);
        console.log(`Группа ID: ${CONFIG.GROUP_CHAT_ID}`);
        
        if (!CONFIG.TELEGRAM_BOT_TOKEN) {
            console.warn('⚠️  ВНИМАНИЕ: Токен бота не указан!');
            console.warn('Установите переменную окружения TELEGRAM_BOT_TOKEN');
        }
    });
}

startServer();

module.exports = app;

