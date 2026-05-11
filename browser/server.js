// Simple HTTP server for browser development
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  // Log request
  console.log(`${req.method} ${req.url}`);

  // Remove query string and decode URL
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  // Get file extension
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  // Prevent directory traversal
  const realPath = path.resolve(filePath);
  if (!realPath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Try to read file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // If not found and it's a route, try index.html (for SPA support)
        if (!ext) {
          fs.readFile(path.join(__dirname, 'index.html'), (fallbackErr, fallbackData) => {
            if (fallbackErr) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('404 Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(fallbackData);
            }
          });
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        }
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Dev server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
