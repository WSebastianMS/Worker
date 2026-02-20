# Worker Node - Sistema Distribuido

Este proyecto implementa un Nodo Worker para un sistema distribuido. Funciona como un servicio autónomo que reporta su estado a un servidor central (Coordinador) y ofrece una interfaz gráfica web para monitoreo y configuración en tiempo real.

## Descripción del Funcionamiento

El proyecto utiliza una arquitectura Cliente-Servidor desacoplada dentro de la misma aplicación:

1. Backend (Node.js + Express):
   - Mantiene el estado del worker (IDs, Timestamps, Intervalos).
   - Gestiona el ciclo de vida: Registro inicial y envío periódico de Heartbeats (pulsos) al Coordinador.
   - Almacena logs y errores en memoria.
   - Expone una API REST interna (/status, /connect) para la interfaz gráfica.

2. Frontend (HTML/CSS/JS):
   - Interfaz de usuario para visualizar el estado.
   - Permite la configuración dinámica de las URLs (Coordinador y Pública) sin reiniciar el servidor.
   - Realiza polling al backend local para actualizar métricas en tiempo real.

## Requisitos Previos

- Node.js (v18 o superior recomendado)
- NPM

## Instalación

1. Clonar el repositorio.
2. Instalar las dependencias:

npm install

## Ejecución
Para iniciar el worker, ejecuta el siguiente comando especificando el puerto deseado (por defecto 3001):

node worker.js 3001

## Uso y Configuración
Si el Coordinador se encuentra en una red externa, utiliza ngrok para exponer tu puerto local:

ngrok http 3001

## Acceso al Dashboard:
Abre tu navegador e ingresa a http://localhost:3001.

## Conexión:
En el panel de configuración de la web, ingresa:

URL Coordinador: La dirección del servidor central.

URL Pública: Tu dirección local o de ngrok.

Haz clic en "Conectar".

## Estructura del Proyecto
worker.js: Lógica del servidor, API y comunicación con el Coordinador.

public/index.html: Estructura del Dashboard.

public/style.css: Estilos, diseño de tarjetas y modal de errores.

public/script.js: Lógica del cliente, polling y manejo de datos.

## Características Técnicas
Configuración en caliente (Hot Configuration) vía web.

Monitoreo de métricas en tiempo real (Intervalos, Timestamps, Estado).

Terminal de logs integrada en la web.

Historial de errores con persistencia en memoria.

Tolerancia a fallos y reconexión automática.