const db = require("./db/Database");
const mosca = require("mosca");
const configDB = require("./config/db");
const mqttConfig = require("./config/mqtt");
const parsePayload = require("./utils/parsePayload");

class MQTTServer {
  constructor(settings) {
    this.server = mosca.Server(settings);
    this.clients = new Map();
    this.entities = {};
    this.events();
  }
  events() {
    this.server.on("clientConnected", (client) => {
      console.log(`Client connected ${client.id}`);
      this.clients.set(client.id, null);
    });
    this.server.on("clientDisconnected", async (client) => {
      const agent = this.clients.get(client.id);

      if (agent) {
        agent.connected = false;
        try {
          await Agent.createOrUpdate(agent);
        } catch (error) {
          return handleError(error);
        }

        this.clients.delete(client.id);

        this.server.publish({
          topic: "agent/disconnected",
          payload: JSON.stringify({
            agent: {
              uuid: agent.uuid,
            },
          }),
        });
        console.log(
          `Client (${client.id}) associate to Agent (${agent.uuid}) marked as disconnected`
        );
      }
    });
    /**
     * When the client publish message
     */
    this.server.on("published", async (packet, client) => {
      console.log(packet.topic);
      switch (packet.topic) {
        case "agent/connected":
        case "agent/disconnected":
          console.log(`Payload : ${packet.payload}`);
          break;
        case "agent/message":
          console.log(`Payload : ${packet.payload}`);
          const payload = parsePayload(packet.payload);
          console.log(payload);
          if (payload) {
            payload.agent.connected = true;
            let agent;
            let user;
            try {
              user = await this.User.findByUsername(payload.agent.username);
              if (user.token !== payload.token) {
                throw new Error("invalid token");
              }
              payload.agent.userId = user.id;
              agent = await this.Agent.createOrUpdate(payload.agent);
            } catch (error) {
              return handleError(error);
            }

            console.log(`Agent ${agent.uuid} saved`);

            if (!this.clients.get(client.id)) {
              this.clients.set(client.id, agent);
              this.server.publish({
                topic: "agent/connected",
                payload: JSON.stringify({
                  agent: {
                    uuid: agent.uuid,
                    name: agent.name,
                    hostname: agent.hostname,
                    pid: agent.pid,
                    connected: agent.connected,
                  },
                }),
              });
            }
            for (let metric of payload.metrics) {
              let met;
              try {
                console.log("met", metric);
                met = await this.Metric.create(agent.uuid, metric);
              } catch (error) {
                return handleError(error);
              }
              console.log(`Metric ${met.id} saved on agent ${agent.uuid}`);
            }
          }
          break;
      }
    });
    /**
     *  When the server is up and start
     */
    this.server.on("ready", async () => {
      let config = configDB();
      const services = await new db(config)
        .initialize()
        .catch(handleFatalError);

      this.Agent = services.Agent;
      this.Metric = services.Metric;
      this.User = services.User;
      console.log(`[rtverse-mqtt] server is running`);
    });
    this.server.on("error", handleFatalError);
  }
}

function handleFatalError(err) {
  console.error(`[fatal error] ${err.message}}`);
  console.error(err.stack);
  process.exit(1);
}
function handleError(err) {
  console.error(`[error] ${err.message}}`);
  console.error(err.stack);
}

process.on("uncaughtException", handleFatalError);
process.on("unhandledRejection", handleFatalError);

function d() {
  new MQTTServer(mqttConfig);
}
d();

module.exports = MQTTServer;
