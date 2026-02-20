const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

// --- CONFIGURACIÓN ---
// Argumentos: node worker.js <PUERTO> <URL_COORDINADOR> <MI_URL_PUBLICA>
const PORT = process.argv[2];
const COORDINATOR_URL = process.argv[3];
const PUBLIC_URL = process.argv[4]; // Tu URL de ngrok
const PULSE_INTERVAL = 2000; // 2 segundos

// Validación básica de argumentos
if (!PORT || !COORDINATOR_URL || !PUBLIC_URL) {
    console.error("❌ Error: Faltan argumentos.");
    console.log("Uso correcto: node worker.js <PORT> <COORDINATOR_URL> <PUBLIC_URL>");
    process.exit(1);
}

const id = crypto.randomUUID();
let coordinatorStatus = "Desconectado";
let lastHeartbeatTime = null;

app.use(cors());
app.use(express.json());

// --- LÓGICA DE CONEXIÓN ---

// 1. Registrarse en el Coordinador
async function register() {
    try {
        const response = await fetch(`${COORDINATOR_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id,
                url: PUBLIC_URL
            })
        });

        if (response.ok) {
            console.log("✅ Registrado correctamente en el Coordinador.");
            coordinatorStatus = "Conectado";
        } else {
            throw new Error(`Coordinador respondió ${response.status}`);
        }
    } catch (error) {
        console.error("⚠️ Error registrando:", error.message);
        coordinatorStatus = "Error de Registro";
        // Reintentar registro en 5 segundos si falla
        setTimeout(register, 5000);
    }
}

// 2. Enviar pulso (Heartbeat)
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
            console.log(`💓 Pulso enviado a las ${new Date().toLocaleTimeString()}`);
        } else {
            // Si el coordinador dice que no existimos (ej. se reinició), nos registramos de nuevo
            if (response.status === 404) {
                console.warn("⚠️ Coordinador no nos reconoce. Re-registrando...");
                await register();
            } else {
                throw new Error(`Coordinador respondió ${response.status}`);
            }
        }

    } catch (error) {
        console.error("❌ Error al enviar pulso:", error.message);
        coordinatorStatus = "Error de Conexión";
    }
}

// --- ENDPOINTS ---

// API interna para el dashboard
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
        }
    });
});

// Dashboard Visual (HTML)
app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Worker Node ${PORT}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f2f5; display: flex; justify-content: center; padding-top: 50px; }
            .card { background: white; width: 400px; padding: 20px; border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
            .item { margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
            .label { font-weight: bold; color: #555; }
            .value { color: #000; font-family: monospace; }
            .status-ok { color: white; background-color: #28a745; padding: 4px 8px; border-radius: 4px; font-size: 0.9em; }
            .status-err { color: white; background-color: #dc3545; padding: 4px 8px; border-radius: 4px; font-size: 0.9em; }
            .footer { font-size: 0.8em; color: #888; text-align: center; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Worker Node Monitor</h2>
            
            <div class="item">
                <span class="label">Worker ID:</span>
                <span class="value" id="w-id">...</span>
            </div>
            <div class="item">
                <span class="label">Puerto Local:</span>
                <span class="value" id="w-port">...</span>
            </div>
            <div class="item">
                <span class="label">Estado Conexión:</span>
                <span id="c-status" class="status-err">Esperando...</span>
            </div>
            <div class="item">
                <span class="label">Último Heartbeat:</span>
                <span class="value" id="c-last">Nunca</span>
            </div>
            <div class="item">
                <span class="label">URL Pública:</span>
            </div>
            <div style="word-break: break-all; font-size: 0.85em; color: #007bff; margin-bottom:15px;" id="w-url">...</div>

            <hr>
            <div class="item">
                <span class="label">Timestamp:</span>
                <span class="value" id="timestamp">0</span>
            </div>

            <div class="footer">Actualizando automáticamente...</div>
        </div>

        <script>
            function update() {
                fetch('/status')
                    .then(res => res.json())
                    .then(data => {
                        document.getElementById('w-id').textContent = data.worker_id.substring(0,8) + '...';
                        document.getElementById('w-port').textContent = data.port;
                        document.getElementById('w-url').textContent = data.public_url;
                        document.getElementById('timestamp').textContent = data.current_timestamp;
                        
                        // Estado del coordinador
                        const statusEl = document.getElementById('c-status');
                        statusEl.textContent = data.coordinator.status;
                        statusEl.className = data.coordinator.status === 'Conectado' ? 'status-ok' : 'status-err';
                        
                        // Último heartbeat
                        if(data.coordinator.last_heartbeat_sent) {
                            const date = new Date(data.coordinator.last_heartbeat_sent);
                            document.getElementById('c-last').textContent = date.toLocaleTimeString();
                        }
                    })
                    .catch(e => console.error("Error fetching status"));
            }
            setInterval(update, 1000); // Actualizar cada segundo
            update();
        </script>
    </body>
    </html>
    `);
});

// --- INICIO ---
app.listen(PORT, async () => {
    console.log(`🚀 Worker iniciado en puerto ${PORT}`);
    console.log(`🔗 URL Pública reportada: ${PUBLIC_URL}`);
    console.log(`📡 Intentando conectar a Coordinador: ${COORDINATOR_URL}`);
    
    // Esperamos un momento para asegurar que el servidor levantó antes de registrar
    setTimeout(async () => {
        await register();
        setInterval(sendPulse, PULSE_INTERVAL);
    }, 1000);
});