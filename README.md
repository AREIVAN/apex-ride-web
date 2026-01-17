https://areivan.github.io/apex-ride-web/

# 🏍️ APEX RIDE — Web Prototype

**Apex Ride** es un prototipo funcional de una plataforma de telemetría y competencia para **motos y coches**, inspirada en el concepto de _segmentos_ y _leaderboards_ tipo Strava, pero enfocada en conducción motorizada.

Este repositorio contiene la **versión web MVP**, utilizada para validar:

- UX/UI
- lógica de segmentos
- registro de rutas reales por GPS
- comparación de tiempos sobre rutas específicas

👉 Demo en vivo:  
https://areivan.github.io/apex-ride-web/

---

## 🚀 ¿Qué es Apex Ride?

Apex Ride permite:

- Registrar recorridos usando GPS
- Crear **segmentos personalizados** sobre calles reales
- Comparar tiempos por segmento
- Visualizar rutas, métricas y desempeño
- Sentar las bases para competencia entre usuarios

Este proyecto está diseñado para evolucionar a una **app móvil multiplataforma (Flutter)** con backend en la nube.

---

## ✨ Funcionalidades actuales (Web MVP)

### 🧭 Registro de Rides

- Seguimiento GPS en tiempo real
- Velocidad instantánea, máxima y promedio
- Distancia total y tiempo
- Visualización del recorrido en el mapa
- Guardado local (LocalStorage)

### 🏁 Segmentos tipo Strava

- Creación de segmentos con:
  - Punto de inicio
  - Punto de fin
  - **Ruta real por calles** (OSRM + OpenStreetMap)
- Visualización de la ruta del segmento
- Radio de tolerancia configurable (en metros)

### 🏆 Segment Attempts & Leaderboard

- Detección automática de intentos al cruzar un segmento
- Validación de que el ride siga la ruta del segmento
- Leaderboard local (Top 10 por segmento)
- Registro de mejores tiempos (PB)

### 🗺️ Mapas

- Basados en **OpenStreetMap + Leaflet**
- Segmentos y rides renderizados como polilíneas
- Centrado y navegación automática

---

## 🧠 Arquitectura del MVP

**Frontend**

- HTML + CSS + JavaScript puro
- Estilo visual _cyberpunk / gaming HUD_
- Leaflet.js para mapas

**Routing**

- OSRM (Open Source Routing Machine)
- Snap-to-roads usando datos de OpenStreetMap

**Persistencia (MVP)**

- `localStorage`
- Sin backend aún (fase de validación)

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología              |
| ---------- | ----------------------- |
| UI         | HTML / CSS              |
| Lógica     | JavaScript              |
| Mapas      | Leaflet + OpenStreetMap |
| Routing    | OSRM (public demo)      |
| Hosting    | GitHub Pages            |
| Estado     | LocalStorage            |

---

## 📦 Estructura del proyecto

apex-ride-web/
│
├── index.html # Aplicación completa (UI + lógica)
├── README.md # Documentación del proyecto

---

## ⚠️ Limitaciones actuales

- Leaderboards solo locales (por navegador)
- Segmentos no sincronizados entre usuarios
- OSRM público (limitado para producción)
- Sin autenticación de usuarios

Estas limitaciones son **intencionales** en esta fase de MVP.

---

## 🗺️ Roadmap (próximos pasos)

### Corto plazo (Web)

- Segmentos con múltiples waypoints
- KPIs en tiempo real dentro de segmentos
- Colores dinámicos del track por velocidad
- Exportación GPX
- Modo simulación de rides

### Mediano plazo

- Migración a **Flutter (mobile + web)**
- Backend con **Firebase**
- Autenticación de usuarios
- Leaderboards globales
- Persistencia en la nube

### Largo plazo

- Integración con hardware (ESP32, sensores)
- Validación avanzada de datos
- Modo pista / circuito cerrado
- Monetización (premium / verified runs)

---

## 🎯 Objetivo del proyecto

Apex Ride busca convertirse en una plataforma donde los usuarios puedan:

- Analizar su conducción
- Compararse en rutas específicas
- Competir de forma estructurada
- Visualizar datos reales de desempeño

Este repositorio representa la **fase inicial de validación técnica y conceptual**.

---

## 👨‍💻 Autor

**Areivan**  
Ingeniería en Robótica Industrial  
Proyecto personal / startup experimental

---

## 📄 Licencia

Este proyecto se publica con fines educativos y de prototipo.  
Licencia por definir.
![alt text](image.png)
