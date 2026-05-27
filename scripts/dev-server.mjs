import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve, sep } from "node:path";

const root = resolve(".");
const host = process.env.HOST || "127.0.0.1";
const port = Number.parseInt(process.env.PORT || "8000", 10);
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".txt", "text/plain; charset=utf-8"],
]);

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendStatus(response, 400, "Bad Request");
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
  const filePath = await resolveRequestPath(url.pathname);

  if (!filePath) {
    sendStatus(response, 403, "Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      sendStatus(response, 404, "Not Found");
      return;
    }

    response.writeHead(200, {
      "Content-Length": fileStat.size,
      "Content-Type": mimeTypes.get(extname(filePath)) || "application/octet-stream",
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(filePath).pipe(response);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      sendStatus(response, 404, "Not Found");
      return;
    }

    console.error(error);
    sendStatus(response, 500, "Internal Server Error");
  }
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}/`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Run with PORT=8001 pnpm dev to use another port.`);
    process.exit(1);
  }

  throw error;
});

async function resolveRequestPath(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const requestedPath = join(root, normalizedPath);
  const candidatePath = pathname.endsWith("/") ? join(requestedPath, "index.html") : requestedPath;
  const relativePath = relative(root, candidatePath);

  if (relativePath.startsWith("..") || relativePath.includes(`..${sep}`)) {
    return null;
  }

  return candidatePath;
}

function sendStatus(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(`${message}\n`);
}
