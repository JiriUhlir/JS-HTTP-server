const { Http2ServerRequest } = require("http2");
const fs = require("fs");
const net = require("net");
const zlib = require('zlib');

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
    //socket.write("HTTP/1.1 200 OK\r\n\r\n");

    socket.on("data", (data) => {
        const request = data.toString();
        const url = request.split(' ')[1];
        const headers = request.split('\r\n');
        const [method, path, protocol] = headers[0].split(" ");
        var httpResponse = 'HTTP/1.1 404 Not Found\r\n\r\n';

        try {
            if (url == "/") {
                httpResponse = "HTTP/1.1 200 OK\r\n\r\n";
            } else if (url.startsWith("/echo/")) {
                const match = url.match(/\/echo\/([^ ]+)/);
                const content = match[1];

                const acceptEncodings = headers.filter((val) => { return val.indexOf('Accept-Encoding') > -1; });
                const acceptEncoding = acceptEncodings != null && acceptEncodings.length > 0 ? acceptEncodings[0] : null;
                if (acceptEncoding != null && acceptEncoding.split('Accept-Encoding: ')[1].indexOf('gzip') > -1) {
                    const body = zlib.gzipSync(content);
                    socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Encoding: gzip\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n`);
                    socket.write(body);
                    httpResponse = null;
                } else {
                    httpResponse = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${content.length}\r\n\r\n${content}`;
                }
            } else if (url.startsWith("/files/") && method === "GET") {
                const fileName = url.split('/files/')[1];
                const directory = process != null && process.argv != null && process.argv.length >= 4 ? process.argv[3] : null;
                if (directory && fs.existsSync(`${directory}/${fileName}`)) {
                    const content = fs.readFileSync(`${directory}/${fileName}`).toString();
                    httpResponse = `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${content.length}\r\n\r\n${content}\r\n`;
                }
            } else if (url.startsWith("/files/") && method === "POST") {
                const directory = process != null && process.argv != null && process.argv.length >= 4 ? process.argv[3] : null;
                const fileName = url.split('/files/')[1];
                const req = request.split('\r\n');
                const body = req[req.length - 1];
                fs.writeFileSync(`${directory}/${fileName}`, body);
                httpResponse = "HTTP/1.1 201 Created\r\n\r\n";
            } else if (url == "/user-agent") {
                const userAgent = headers[2].split('User-Agent: ')[1];
                httpResponse = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${userAgent.length}\r\n\r\n${userAgent}`;
            }
        } catch {
            console.log('error');
            httpResponse = 'HTTP/1.1 500 Error\r\n\r\n';
        }

        if (httpResponse) {
            socket.write(httpResponse);
        }
        socket.end();
    });

    // socket.on("close", () => {
    //     socket.end();
    //     server.close();
    // });

});

server.listen(4221, "localhost");
