import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Desactiva el indicador de dev que analiza en segundo plano si cada ruta
  // es estática/dinámica: en este entorno ese worker crashea repetidamente
  // ("Jest worker encountered N child process exceptions") y termina
  // apareciendo como error de runtime al navegar, aunque las rutas
  // funcionan correctamente. No afecta errores reales de compilación/runtime.
  devIndicators: false,
};

export default nextConfig;
