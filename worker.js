const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");

const app = express();

// --- CONFIGURACIÓN ---
const PORT = process.argv[2];
const COORDINATOR_URL = process.argv[3];
const PUBLIC_URL = process.argv[4];
const PULSE_INTERVAL = 2000;

if (!PORT || !COORDINATOR_URL || !PUBLIC_URL) {
    console.error("❌ Uso: node worker.js <PORT> <COORDINATOR_URL> <PUBLIC_URL>");
    process.exit(1);
}

const id = crypto.randomUUID();
let coordinatorStatus = "Desconectado";
let lastHeartbeatTime = null;

// --- SISTEMA DE LOGS EN MEMORIA ---
// Guardamos los últimos 50 mensajes para enviarlos al frontend
const systemLogs = [];
const errorLogs = [];

function logEvent(message, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message };
    
    // Mostrar en la terminal real
    if (isError) console.error(`[${timestamp}] ❌ ${message}`);
    else console.log(`[${timestamp}] ℹ️ ${message}`);

    // Guardar en memoria para el frontend
    if (isError) {
        errorLogs.unshift(logEntry); // Agregar al principio
    }
    systemLogs.unshift(logEntry); // Agregar al principio (Log general)
    
    // Limitar historial a 50 items para no llenar la memoria
    if (systemLogs.length > 50) systemLogs.pop();
    if (errorLogs.length > 50) errorLogs.pop();
}

app.use(cors());
app.use(express.json());
// Servir archivos estáticos (HTML y CSS) desde la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));

// --- LÓGICA DE CONEXIÓN ---

async function register() {
    try {
        logEvent(`Intentando registrar en ${COORDINATOR_URL}...`);
        const response = await fetch(`${COORDINATOR_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, url: PUBLIC_URL })
        });

        if (response.ok) {
            logEvent("✅ Registro exitoso en el Coordinador");
            coordinatorStatus = "Conectado";
        } else {
            throw new Error(`Status ${response.status}`);
        }
    } catch (error) {
        logEvent(`Fallo al registrar: ${error.message}`, true);
        coordinatorStatus = "Error de Registro";
        setTimeout(register, 5000);
    }
}

async function sendPulse() {
    try {
        const response = await fetch(`${COORDINATOR_URL}/pulse`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        });

        if (response.ok) {
            lastHeartbeatTime = Date.now();
            coordinatorStatus = "Conectado";
            logEvent("💓 Pulso (Heartbeat) enviado correctamente");
        } else {
            if (response.status === 404) {
                logEvent("⚠️ Coordinador no nos reconoce. Re-registrando...", true);
                await register();
            } else {
                throw new Error(`Status ${response.status}`);
            }
        }
    } catch (error) {
        logEvent(`Error enviando pulso: ${error.message}`, true);
        coordinatorStatus = "Error de Conexión";
    }
}

// --- ENDPOINTS ---

app.get("/status", (req, res) => {
    res.json({
        worker_id: id,
        port: PORT,
        public_url: PUBLIC_URL,
        pulse_interval_ms: PULSE_INTERVAL,
        current_timestamp: Date.now(),
        coordinator: {
            url: COORDINATOR_URL,
            status: coordinatorStatus,
            last_heartbeat_sent: lastHeartbeatTime
        },
        logs: systemLogs,  // Enviamos los logs
        errors: errorLogs  // Enviamos los errores
    });
});

// --- INICIO ---
app.listen(PORT, async () => {
    logEvent(`🚀 Worker iniciado en puerto ${PORT}`);
    setTimeout(async () => {
        await register();
        setInterval(sendPulse, PULSE_INTERVAL);
    }, 1000);
});