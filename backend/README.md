# Filtros Web Backend

Este backend Node.js expone endpoints seguros para el panel admin y el checkout de la app.

## Requisitos
- Node.js 18+
- Variables de entorno definidas en `backend/.env`

## Variables de entorno
Copiar `.env.example` a `.env` y completar:

- `SUPABASE_URL`: URL de tu proyecto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: tu service_role key.
- `PORT`: puerto en el que se ejecutará el servidor (por defecto `3000`).

## Instalación
```bash
cd backend
npm install
```

## Ejecución
```bash
npm start
```

Luego abre `http://localhost:3000/admin.html` y `http://localhost:3000/checkout.html?id=<product-id>`.
