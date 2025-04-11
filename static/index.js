// Dirección del WebSocket del ESP32 (cambia si es necesario)
let targetUrl = "ws://192.168.4.1:80/ws";
let connection;

/**
 * Inicializa la conexión WebSocket con el ESP32.
 */
function initializeSocket() {
    connection = new WebSocket(targetUrl);

    connection.onopen = function () {
        console.log("Starting connection to WebSocket server...");
    };

    connection.onerror = function (error) {
        console.error('WebSocket Error:', error);
        alert('Conexión fallida');
    };

    connection.onmessage = function (e) {
        console.log('Server:', e.data);
    };
}

/**
 * Envía un objeto de datos al servidor WebSocket.
 * @param {any} data 
 */
function send(data) {
    const jsonData = JSON.stringify(data);
    console.log("Sending:", jsonData);
    connection.send(jsonData);
}

// Variables del canvas y joystick
let canvas, ctx;
let canvas_width, canvas_height;
let radius, joy_x_orig, joy_y_orig;
let isButUp = false;
let isButDown = false;

let started = false;
let stopped = false;
let moving = false;

// Se ejecuta al cargar la página
window.addEventListener('load', () => {
    initializeSocket();

    // Obtener y preparar canvas
    canvas = document.getElementById('canvas');
    canvas.oncontextmenu = e => e.preventDefault();
    ctx = canvas.getContext('2d');

    resize();

    // Eventos de mouse y touch
    document.addEventListener('mousedown', startDrawing);
    document.addEventListener('mouseup', stopDrawing);
    document.addEventListener('mousemove', Draw);

    document.addEventListener('touchstart', startDrawing);
    document.addEventListener('touchcancel', stopDrawing);
    document.addEventListener('touchend', stopDrawing);
    document.addEventListener('touchmove', Draw);

    window.addEventListener('resize', resize);
});

/**
 * Ajusta el tamaño del canvas y redibuja los elementos.
 */
function resize() {
    canvas_width = window.innerWidth - 20;
    canvas_height = window.innerHeight - 20;
    const main_size = Math.min(canvas_width, canvas_height);
    radius = Math.floor(main_size * 0.2);

    ctx.canvas.width = canvas_width;
    ctx.canvas.height = canvas_height;

    background();
    joystick(joyGetX(canvas_width), joyGetY(canvas_height));
}

// Coordenadas relativas
function joyGetX(width) { return width * 0.25; }
function joyGetY(height) { return height * 0.5; }
function butGetX(width) { return width * 0.75; }
function butGetY(height) { return height * 0.5; }

/**
 * Dibuja el fondo con botones y texto.
 */
function background() {
    joy_x_orig = joyGetX(canvas_width);
    joy_y_orig = joyGetY(canvas_height);

    // Área circular del joystick
    ctx.beginPath();
    ctx.arc(joy_x_orig, joy_y_orig, radius + 20, 0, Math.PI * 2, true);
    ctx.fillStyle = '#ECE5E5';
    ctx.fill();

    text();
    buttons();
}

/**
 * Dibuja el joystick en una posición dada.
 */
function joystick(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, true);
    ctx.fillStyle = "#F08080";
    ctx.fill();
    ctx.strokeStyle = '#F6ABAB';
    ctx.lineWidth = 8;
    ctx.stroke();
}

/**
 * Dibuja los botones de dirección arriba y abajo.
 */
function buttons() {
    const x = butGetX(canvas_width);
    const y = butGetY(canvas_height);
    const gap = radius * 0.2;
    const height = radius * 1.25;

    // Botón arriba
    ctx.beginPath();
    ctx.moveTo(x, y - height);
    ctx.lineTo(x + radius, y - gap);
    ctx.lineTo(x - radius, y - gap);
    ctx.closePath();
    setButCol(isButUp);

    // Botón abajo
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + radius, y + gap);
    ctx.lineTo(x - radius, y + gap);
    ctx.closePath();
    setButCol(isButDown);
}

/**
 * Establece el color de los botones según su estado.
 */
function setButCol(active) {
    ctx.fillStyle = active ? "#F08080" : "#808080";
    ctx.strokeStyle = active ? "#F6ABAB" : "#ECE5E5";
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.stroke();
}

// Variables de dibujo y control
let coord = { x: 0, y: 0 };
let dy_elevation = 0;
let paint = false;

/**
 * Actualiza coordenadas si se mueve dentro del joystick.
 */
function updateJoystick(event) {
    if (!event) return;

    const mouse_x = event.clientX || event.touches[0].clientX;
    const mouse_y = event.clientY || event.touches[0].clientY;

    coord.x = joy_x_orig;
    coord.y = joy_y_orig;

    if (mouse_x < canvas_width / 2) {
        coord.x = mouse_x - canvas.offsetLeft;
        coord.y = mouse_y - canvas.offsetTop;
        return true;
    }
    return false;
}

/**
 * Actualiza el estado de los botones si se tocan.
 */
function updateButtons(event) {
    if (!event) return;

    const mouse_x = event.clientX || event.touches[0].clientX;
    const mouse_y = event.clientY || event.touches[0].clientY;

    if (mouse_x < canvas_width / 2) return;

    dy_elevation = 0;
    if (mouse_y < canvas_height / 2) {
        isButUp = true;
        dy_elevation = 1;
    }
    if (mouse_y > canvas_height / 2) {
        isButDown = true;
        dy_elevation = -1;
    }
}

/**
 * Verifica si el punto está dentro del círculo del joystick.
 */
function is_it_in_the_circle() {
    const distance = Math.hypot(coord.x - joy_x_orig, coord.y - joy_y_orig);
    return distance <= radius;
}

/**
 * Inicia el movimiento cuando se presiona/toca.
 */
function startDrawing(event) {
    if (started) return;

    paint = true;
    updateJoystick(event);
    updateButtons(event);

    if (is_it_in_the_circle()) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        background();
        joystick(coord.x, coord.y);
        Draw("starting");
    }

    send(updateData(0, 0, 0, 0, dy_elevation));
    started = true;
    stopped = false;
}

/**
 * Detiene el movimiento cuando se suelta.
 */
function stopDrawing() {
    if (stopped) return;

    paint = false;
    isButUp = false;
    isButDown = false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    background();
    joystick(joyGetX(canvas_width), joyGetY(canvas_height));

    send(resetData());
    stopped = true;
    started = false;
}

/**
 * Dibuja el texto en la pantalla.
 */
function text() {
    ctx.beginPath();
    ctx.font = "40px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#808080";
    ctx.fillText("AKI TOY RC", canvas.width / 2, canvas.width * 0.1);
}

/**
 * Crea el paquete de datos con valores nulos.
 */
function resetData() {
    return [0, 0, 0, 0, 0];
}

/**
 * Crea el paquete de datos actual para enviar al ESP32.
 */
function updateData(x, y, speed, angle, dy) {
    return [x, y, speed, angle % 360, dy];
}

/**
 * Maneja el evento de movimiento del joystick y botones.
 */
function Draw(event) {
    if (event === "starting" || !updateJoystick(event)) return;

    if (paint) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        background();

        let angle = Math.atan2(coord.y - joy_y_orig, coord.x - joy_x_orig);
        let angle_deg = angle < 0
            ? Math.round(-angle * 180 / Math.PI)
            : Math.round(360 - angle * 180 / Math.PI);

        let x, y;
        if (is_it_in_the_circle()) {
            x = coord.x;
            y = coord.y;
        } else {
            x = radius * Math.cos(angle) + joy_x_orig;
            y = radius * Math.sin(angle) + joy_y_orig;
        }

        joystick(x, y);

        const speed = Math.round(100 * Math.hypot(x - joy_x_orig, y - joy_y_orig) / radius);
        const x_rel = Math.round(x - joy_x_orig) / radius;
        const y_rel = Math.round(y - joy_y_orig) / radius;

        const data = updateData(x_rel, -y_rel, speed, angle_deg, dy_elevation);
        send(data);
    }
}
