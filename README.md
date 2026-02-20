# Worker Node Implementation

Este proyecto implementa el componente **Worker** de un sistema distribuido. El worker se encarga de reportar su estado ("heartbeat") periódicamente a un servidor **Coordinador** central.

## Características

* **Identidad Única:** Generación automática de UUID al iniciar.
* **Heartbeat:** Envío de pulsos cada 2 segundos al Coordinador.
* **Tolerancia a Fallos:** Reintento automático de registro si el Coordinador se reinicia o falla.
* **Dashboard Visual:** Interfaz web en la raíz (`/`) que muestra el estado actual y la conectividad en tiempo real (polling).
* **Endpoints:**
    * `GET /`: Dashboard visual.
    * `GET /status`: API JSON con métricas del worker.

## Requisitos

* Node.js (v18 o superior recomendado para soporte nativo de `fetch`).
* Dependencias: `express`, `cors`.

## Instalación

1.  Clonar el repositorio.
2.  Instalar dependencias:
    ```bash
    npm install
    ```

## Ejecución

El worker requiere 3 argumentos obligatorios:
1.  **PUERTO**: El puerto local donde correrá el servidor (ej: 3001).
2.  **URL_COORDINADOR**: La dirección completa del servidor coordinador.
3.  **URL_PUBLICA**: La dirección pública de este worker (ej: url de ngrok) que el coordinador usará para identificarlo.

### Comando

```bash
node worker.js <PUERTO> <URL_COORDINADOR> <URL_PUBLICA>