import Agents from "../components/Agents";
import Layout from "../components/Layout";
import Graph from "../components/Graph";
import { useEffect, useState } from "react";
import io from "socket.io-client";
const socket = io();

export default function Dashboard() {
  socket.on("agent/message", (message) => {
    console.log("mes", message);
  });

  return (
    <Layout title="Dashboard">
      <main>
        <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex justify-center	">
            <h2 className="font-mono font-bold text-xl sm:text-2xl">
              <svg
                className="w-8 inline-block text-blue-600 	 "
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>{" "}
              Agentes Recientes
            </h2>
          </div>

          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 h-auto rounded-lg h-96 p-4	">
              <Agents />
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
