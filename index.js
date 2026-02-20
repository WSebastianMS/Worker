const express = require("express")
const cors = require("cors")
const crypto = require("crypto")


const app = express()
const PORT = process.argv[2]
const COORDINATOR_URL = process.argv[3]
const PUBLIC_URL = process.argv[4]
const PULSE_INTERVAL = 2000

if (!COORDINATOR_URL || !PUBLIC_URL) {
    console.log("Uso: node index.js  <PORT> <COORDINATOR_URL> <PUBLIC_URL>")
    process.exit(1)
}

const id = crypto.randomUUID()

app.use(cors())
app.use(express.json())

app.get("/status", () => {
    res.json({
        id,
        status: "alive",
        timestamp: Date.now()
    })

    async function register() {
        try {
            await fetch(`${COORDINATOR_URL}/register`,{
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    url : PUBLIC_URL
                })
            })

            console.log("Eviado correctamente")
        } catch (error) {
            console.log("Error registrando: ", error)
        }
    }
    async function sendPulse() {
        try {
            await fetch(`${COORDINATOR_URL}/pulse`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
            })

            console.log("Pulso enviado correctamente")

        } catch (error) {
            console.log("Error al enviar pulso: ", error)
        }
    }
})

app.listen(PORT, async () => {
    console.log(`Worker ${id} corriendo en ${PORT}`)
    await register()
    setInterval(sendPulse, PULSE_INTERVAL)

})