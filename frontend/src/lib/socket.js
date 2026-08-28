import { io } from 'socket.io-client';
const url = import.meta.env.VITE_API_ORIGIN || window.location.origin;
export function createSocket(tenantId){return io(url,{path:'/socket.io',transports:['websocket','polling'],auth:{tenantId}});}
