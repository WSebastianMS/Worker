// Variables de control UI
let isConnected = false;

// Función para enviar configuración al Backend
async function connectWorker() {
    const coordUrl = document.getElementById('input-coord').value;
    const publicUrl = document.getElementById('input-public').value;

    if (!coordUrl || !publicUrl) {
        alert("Por favor, ingresa ambas URLs");
        return;
    }

    try {
        await fetch('/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coordinatorUrl: coordUrl, publicUrl })
        });
        // La UI se actualizará sola con el polling
    } catch (e) {
        alert("Error al intentar conectar con el backend local");
    }
}

// Función para desconectar
async function disconnectWorker() {
    await fetch('/disconnect', { method: 'POST' });
}

// Función principal de actualización (Polling)
async function updateDashboard() {
    try {
        const res = await fetch('/status');
        const data = await res.json();

        // 1. Actualizar Panel de Configuración
        const form = document.getElementById('connection-form');
        const activeMsg = document.getElementById('connection-active');

        if (data.coordinator_url) {
            form.style.display = 'none';
            activeMsg.style.display = 'block';
        } else {
            form.style.display = 'block';
            activeMsg.style.display = 'none';
        }

        // 2. Info Local (Worker)
        document.getElementById('w-id').textContent = data.id ? data.id.substring(0,8) + '...' : 'Cargando...';
        document.getElementById('w-port').textContent = data.port;
        
        // ARREGLADO: Intervalo
        document.getElementById('w-interval').textContent = (data.pulse_interval || 2000) + " ms"; 
        
        // ARREGLADO: Timestamp
        if (data.current_timestamp) {
            document.getElementById('w-timestamp').textContent = new Date(data.current_timestamp).toLocaleTimeString(); 
        } else {
            document.getElementById('w-timestamp').textContent = "--:--:--";
        }

        // URL Pública
        const pubUrlEl = document.getElementById('w-public-url');
        pubUrlEl.textContent = data.public_url || "Esperando configuración...";
        
        const wStatus = document.getElementById('w-status');
        wStatus.textContent = data.state.status.toUpperCase();
        wStatus.className = 'badge ' + (data.state.status === 'active' ? 'success' : 'warning');

        // 3. Info Coordinador
        // URL Coordinador
        const coordUrlEl = document.getElementById('c-url');
        coordUrlEl.textContent = data.coordinator_url || "Esperando configuración...";

        const cStatus = document.getElementById('c-status');
        cStatus.textContent = data.state.coordinatorStatus;
        cStatus.className = 'badge ' + (data.state.coordinatorStatus === 'Conectado' ? 'success' : 'danger');

        if (data.state.lastHeartbeat) {
            document.getElementById('c-last').textContent = new Date(data.state.lastHeartbeat).toLocaleTimeString();
        } else {
            document.getElementById('c-last').textContent = "Nunca";
        }

        // 4. Logs y Errores
        renderLogs(data.logs, data.errors);

    } catch (e) {
        console.error("No se puede contactar con worker server", e);
    }
}

function renderLogs(logs, errors) {
    const logsContainer = document.getElementById('terminal-logs');
    const logsHtml = logs.map(log => 
        `<div class="log-line"><span class="log-time">[${log.timestamp}]</span> ${log.message}</div>`
    ).join('');
    
    // Solo actualizamos si hay cambios para evitar saltos en el scroll si el usuario está leyendo
    if (logsContainer.innerHTML !== logsHtml) {
        logsContainer.innerHTML = logsHtml;
    }

    document.getElementById('errorCount').textContent = errors.length;
    const errorList = document.getElementById('error-list');
    
    // Renderizado de errores
    errorList.innerHTML = errors.length > 0 
        ? errors.map(err => `<div class="error-line"><strong>${err.timestamp}:</strong> ${err.message}</div>`).join('')
        : '<p style="text-align:center; color:#666;">Sin errores recientes.</p>';
}

function toggleModal() {
    const modal = document.getElementById('errorModal');
    modal.style.display = modal.style.display === "block" ? "none" : "block";
}

setInterval(updateDashboard, 1000);
updateDashboard();