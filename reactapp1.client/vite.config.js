import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import { env } from 'process';

// Определение базовой папки для сертификатов
const baseFolder =
    env.APPDATA !== undefined && env.APPDATA !== ''
        ? `${env.APPDATA}/ASP.NET/https`
        : `${env.HOME}/.aspnet/https`;

const certificateName = "reactapp1.client";
const certFilePath = path.join(baseFolder, `${certificateName}.pem`);
const keyFilePath = path.join(baseFolder, `${certificateName}.key`);

// Создание папки для сертификатов, если она не существует
if (!fs.existsSync(baseFolder)) {
    fs.mkdirSync(baseFolder, { recursive: true });
}

// Генерация сертификатов, если они отсутствуют
if (!fs.existsSync(certFilePath) || !fs.existsSync(keyFilePath)) {
    const result = child_process.spawnSync('dotnet', [
        'dev-certs',
        'https',
        '--export-path',
        certFilePath,
        '--format',
        'Pem',
        '--no-password',
    ], { stdio: 'inherit' });

    if (result.status !== 0) {
        throw new Error("Could not create certificate.");
    }
}

// Определение целевого URL для прокси
const target = env.ASPNETCORE_HTTPS_PORT
    ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}`
    : env.ASPNETCORE_URLS
        ? env.ASPNETCORE_URLS.split(';')[0]
        : 'https://localhost:7048';

// Конфигурация Vite
export default defineConfig({
    plugins: [plugin()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        proxy: {
            // Прокси для API
            '^/api/auth/login': {
                target,
                secure: false,
                changeOrigin: true,
            },

            "^/api/map/type": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/map/link": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/map/linkNag": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/map/addMultiple": {
                target,
                secure: false,
                changeOrigin: true
            },

            "^/api/workshop": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/workshop/add": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/workshop/*": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/workshop/table/*": {
                target,
                secure: false,
                changeOrigin: true
            },

            "^/api/well/add/wellWithoutPacker": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/well/add": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/well/table": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/well/table/nag": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/well/map": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/well/map/point": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/well/map/add": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/well/list": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/well/wellslant": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/well/wellslant/table": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/well/name/*": {
                target,
                secure: false,
                changeOrigin: true
            },

         
            "^/api/stem": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/stem/*": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/stem/*/point": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/stem/add": {
                target,
                secure: false,
                changeOrigin: true
            },

            "^/api/horizont": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/horizont/horizontStem": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/horizont/add": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/horizont/stem/*": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/horizont/table": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/horizont/import": {
                target,
                secure: false,
                changeOrigin: true
            },

            "^/api/ngdu/add": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/ngdu/table": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/ngdu/add/*": {
                target,
                secure: false,
                changeOrigin: true
            },

            "^/api/paker/add": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/paker/table": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/paker/table/*": {
                target,
                secure: false,
                changeOrigin: true
            },

            "^/api/field": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/field/add": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/field/*": {
                target,
                secure: false,
                changeOrigin: true
            },

            "^/api/CrmCalculator/ratios/*": {
                target,
                secure: false,
                changeOrigin: true
            },
            "^/api/CrmCalculator/production/*": {
                target,
                secure: false,
                changeOrigin: true
            }
        },
        port: parseInt(env.DEV_SERVER_PORT || '53326'),
        https: {
            key: fs.readFileSync(keyFilePath),
            cert: fs.readFileSync(certFilePath),
        },
    },
});