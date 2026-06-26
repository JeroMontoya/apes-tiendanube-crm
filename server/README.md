# Backend TiendaNube APES

Este es el servidor Node.js/Express que actúa como middleware de seguridad y autenticación para la Aplicación Oficial de TiendaNube.

## Configuración Inicial

1. Renombra `.env.example` a `.env` y coloca ahí tu `TN_CLIENT_ID` y `TN_CLIENT_SECRET`.
2. Instala dependencias: `npm install`
3. Inicia el servidor: `npm run dev`

El servidor se ejecutará en el puerto 3001. Su función principal es manejar el flujo OAuth y actuar como proxy seguro hacia la API de TiendaNube.
