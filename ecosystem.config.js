module.exports = {
  apps: [
    {
      name: "canvas-server",
      script: "./dist/cluster.js",
      instances: 1, // cluster.js가 내부적으로 워커 관리
      exec_mode: "fork", // fork 모드
      env: {
        NODE_ENV: "production",
        PORT: 1234,
        WORKER_COUNT: 2,
      },
    },
    {
      name: "canvas-server-dev",
      script: "node",
      args: "node_modules/ts-node-dev/lib/bin.js src/cluster.ts",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "development",
        PORT: 1234,
        WORKER_COUNT: 2,
      },
      cwd: "./",
      error_file: "./logs/pm2-dev-error.log",
      out_file: "./logs/pm2-dev-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};
