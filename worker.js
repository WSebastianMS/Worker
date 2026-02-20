const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.argv[2] || 3001;


const id = crypto.randomUUID();
let COORDINATOR_URL = null;
let PUBLIC_URL = null;
const PULSE_INTERVAL = 2000; // 2 segundos
let pulseTimer = null;

let workerState = {
    status: "stopped",
    coordinatorStatus: "Desconectado",
    lastHeartbeat: null
};


const systemLogs = [];
const errorLogs = [];

function logEvent(message, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message };
    
    if (isError) {
        console.error(`[${timestamp}] ❌ ${message}`);
        errorLogs.unshift(logEntry);
    } else {
        console.log(`[${timestamp}] ℹ️ ${message}`);
    }
    systemLogs.unshift(logEntry);
    
    if (systemLogs.length > 50) systemLogs.pop();
    if (errorLogs.length > 50) errorLogs.pop();
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


async function register() {
    if (!COORDINATOR_URL) return;
    
    workerState.status = "registering";
    logEvent(`Registrando en ${COORDINATOR_URL}...`);

    try {
        const response = await fetch(`${COORDINATOR_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, url: PUBLIC_URL })
        });

        if (response.ok) {
            logEvent("✅ Registro exitoso. Iniciando pulsos.");
            workerState.status = "active";
            workerState.coordinatorStatus = "Conectado";
            
            if (!pulseTimer) {
                pulseTimer = setInterval(sendPulse, PULSE_INTERVAL);
            }
        } else {
            throw new Error(`Status ${response.status}`);
        }
    } catch (error) {
        logEvent(`Fallo al registrar: ${error.message}`, true);
        workerState.status = "error";
        workerState.coordinatorStatus = "Error Registro";
        setTimeout(() => {
            if (COORDINATOR_URL) register();
        }, 5000);
    }
}

async function sendPulse() {
    if (!COORDINATOR_URL) return;

    try {
        const response = await fetch(`${COORDINATOR_URL}/pulse`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        });

        if (response.ok) {
            workerState.lastHeartbeat = Date.now();
            workerState.coordinatorStatus = "Conectado";
            workerState.status = "active";
            logEvent("💓 Pulso enviado");
        } else {
            if (response.status === 404) {
                logEvent("⚠️ Coordinador reiniciado. Re-registrando...", true);
                clearInterval(pulseTimer);
                pulseTimer = null;
                register();
            } else {
                throw new Error(`Status ${response.status}`);
            }
        }
    } catch (error) {
        logEvent(`Error pulso: ${error.message}`, true);
        workerState.coordinatorStatus = "Error Conexión";
    }
}

app.post("/connect", async (req, res) => {
    const { coordinatorUrl, publicUrl } = req.body;
    if (!coordinatorUrl || !publicUrl) return res.status(400).json({ error: "Faltan URLs" });

    if (pulseTimer) clearInterval(pulseTimer);
    
    COORDINATOR_URL = coordinatorUrl;
    PUBLIC_URL = publicUrl;
    
    logEvent(`🔧 Configuración aplicada.`);
    register();
    res.json({ message: "Iniciando..." });
});

app.post("/disconnect", (req, res) => {
    if (pulseTimer) clearInterval(pulseTimer);
    pulseTimer = null;
    COORDINATOR_URL = null;
    workerState.status = "stopped";
    workerState.coordinatorStatus = "Desconectado";
    logEvent("🛑 Worker detenido manualmente.");
    res.json({ message: "Detenido" });
});

app.get("/status", (req, res) => {
    res.json({

        id,
        port: PORT,
        public_url: PUBLIC_URL,
        coordinator_url: COORDINATOR_URL,
        pulse_interval: PULSE_INTERVAL,  
        current_timestamp: Date.now(),
        
        state: workerState,
        logs: systemLogs,
        errors: errorLogs
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Worker Server UI disponible en http://localhost:${PORT}`);
});