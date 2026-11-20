# APK por empresa (WebView)

Genera un APK que abre `https://movtek.vercel.app/e/<slug>/app` a pantalla completa.

## Requisitos (una vez, en el entorno de build)
- JDK 17+, Gradle 8.x
- Android SDK (platform android-34, build-tools 34.0.0) en `/opt/android-sdk`

## Generar un APK
```
bash build_apk.sh <slug> "<NOMBRE EMPRESA>"
```
Ejemplo:
```
bash build_apk.sh transportessantiago "TRANSPORTES ESPECIAL SANTIAGO S.A.S"
```
El APK queda en `public/apk/<slug>.apk` y se publica en el sitio al hacer deploy.
El ícono se toma automáticamente de `/api/logo?slug=<slug>` (logo de la empresa).
