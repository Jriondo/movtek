# Movtek · Transporte Conectado 🚍💻

Plataforma web para cooperativas de transporte. Fresca, simple y profesional.

## Tecnología
- **React + Vite** (frontend rápido y moderno)
- **Tailwind CSS** (estilos)
- **Supabase** (base de datos + autenticación)
- **Vercel** (despliegue)

## Empezar en tu computadora
```bash
npm install
npm run dev
```
La app abre en `http://localhost:5173`. Sin credenciales de Supabase funciona en **modo demo** (cualquier login entra).

## Conectar Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En *Project Settings → API* copia el **Project URL** y la **anon public key**.
3. Crea un archivo `.env` (usa `.env.example` como guía) y pega esos valores.

## Desplegar en Vercel
1. Sube este repo a GitHub.
2. En [vercel.com](https://vercel.com) importa el repositorio.
3. Agrega las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Deploy. ¡Listo!

## Módulos
- [x] Cimientos: identidad visual, login y navegación
- [ ] (en construcción, módulo por módulo)
