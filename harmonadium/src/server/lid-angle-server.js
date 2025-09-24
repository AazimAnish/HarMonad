const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

class LidAngleServer {
  constructor(port = 8080) {
    this.port = port;
    this.wss = new WebSocket.Server({ port });
    this.lidAngleProcess = null;
    this.currentAngle = null;
    this.clients = new Set();

    this.setupWebSocketServer();
    console.log(`Lid Angle WebSocket Server running on port ${port}`);
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws) => {
      console.log('Client connected');
      this.clients.add(ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Invalid message format:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);

        if (this.clients.size === 0 && this.lidAngleProcess) {
          this.stopAngleMonitoring();
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  handleMessage(ws, data) {
    switch (data.command) {
      case 'start_monitoring':
        this.startAngleMonitoring();
        ws.send(JSON.stringify({ status: 'monitoring_started' }));
        break;

      case 'stop_monitoring':
        this.stopAngleMonitoring();
        ws.send(JSON.stringify({ status: 'monitoring_stopped' }));
        break;

      case 'get_current_angle':
        ws.send(JSON.stringify({
          angle: this.currentAngle,
          timestamp: Date.now()
        }));
        break;

      default:
        ws.send(JSON.stringify({ error: 'Unknown command' }));
    }
  }

  startAngleMonitoring() {
    if (this.lidAngleProcess) {
      console.log('Angle monitoring already running');
      return;
    }

    const bridgePath = path.resolve(__dirname, '../../sensor-bridge');

    try {
      this.lidAngleProcess = spawn(bridgePath, ['--json'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.lidAngleProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        const lines = output.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            try {
              const angleData = JSON.parse(line);
              if (angleData.angle !== undefined) {
                this.currentAngle = parseFloat(angleData.angle);
                this.broadcastAngle(this.currentAngle);
              }
            } catch (parseError) {
              const match = output.match(/angle:\s*([\d.-]+)/);
              if (match) {
                this.currentAngle = parseFloat(match[1]);
                this.broadcastAngle(this.currentAngle);
              }
            }
          }
        }
      });

      this.lidAngleProcess.stderr.on('data', (data) => {
        console.error('LidAngleSensor error:', data.toString());
      });

      this.lidAngleProcess.on('close', (code) => {
        console.log(`LidAngleSensor process exited with code ${code}`);
        this.lidAngleProcess = null;
      });

      this.lidAngleProcess.on('error', (error) => {
        console.error('Failed to start LidAngleSensor:', error);
        this.lidAngleProcess = null;
      });

      console.log('Started angle monitoring process');
    } catch (error) {
      console.error('Failed to spawn lid angle sensor:', error);
    }
  }

  stopAngleMonitoring() {
    if (this.lidAngleProcess) {
      this.lidAngleProcess.kill();
      this.lidAngleProcess = null;
      console.log('Stopped angle monitoring');
    }
  }

  broadcastAngle(angle) {
    const message = JSON.stringify({
      angle,
      timestamp: Date.now()
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  close() {
    this.stopAngleMonitoring();
    this.wss.close();
  }
}

if (require.main === module) {
  const server = new LidAngleServer();

  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close();
    process.exit(0);
  });
}

module.exports = LidAngleServer;