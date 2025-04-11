// Dirección del WebSocket (cambia si es necesario)
let targetUrl = "ws://192.168.4.1:80/ws";
let connection;

/**
 * Inicializa la conexión WebSocket
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

// Configuración inicial de Konva y lógica del joystick
let stage, layer, joystickCircle, baseCircle, textLabel;
let canvas_width, canvas_height;
let radius, joy_x_orig, joy_y_orig;
let isButUp = false;
let isButDown = false;

let started = false;
let stopped = false;
let moving = false;

window.addEventListener('load', () => {
    initializeSocket();
    setupKonva();
    window.addEventListener('resize', resize);
});

function setupKonva() {
    stage = new Konva.Stage({
        container: 'canvas',
        width: window.innerWidth,
        height: window.innerHeight,
    });

    layer = new Konva.Layer();
    stage.add(layer);

    canvas_width = stage.width();
    canvas_height = stage.height();

    const main_size = Math.min(canvas_width, canvas_height);
    radius = Math.floor(main_size * 0.2);
    joy_x_orig = joyGetX(canvas_width);
    joy_y_orig = joyGetY(canvas_height);

    // Base del joystick
    baseCircle = new Konva.Circle({
        x: joy_x_orig,
        y: joy_y_orig,
        radius: radius + 20,
        fill: '#ECE5E5'
    });
    layer.add(baseCircle);

    // Círculo del joystick
    joystickCircle = new Konva.Circle({
        x: joy_x_orig,
        y: joy_y_orig,
        radius: radius,
        fill: '#F08080',
        stroke: '#F6ABAB',
        strokeWidth: 8,
        draggable: true
    });
    layer.add(joystickCircle);

    // Título
    textLabel = new Konva.Text({
        x: 0,
        y: canvas_width * 0.05,
        width: canvas_width,
        text: 'ROBOT CONTROL',
        fontSize: 40,
        fontFamily: 'sans-serif',
        fill: '#808080',
        align: 'center'
    });
    layer.add(textLabel);

    // Eventos
    joystickCircle.on('dragmove', () => handleDrag());
    joystickCircle.on('dragend', () => resetJoystick());

    drawButtons();
    layer.draw();
}

function resize() {
    stage.width(window.innerWidth);
    stage.height(window.innerHeight);
    setupKonva();
}

function joyGetX(width) { return width * 0.25; }
function joyGetY(height) { return height * 0.5; }
function butGetX(width) { return width * 0.75; }
function butGetY(height) { return height * 0.5; }

function drawButtons() {
    const x = butGetX(canvas_width);
    const y = butGetY(canvas_height);
    const gap = radius * 0.2;
    const height = radius * 1.25;

    const up = new Konva.RegularPolygon({
        x: x,
        y: y - height / 2,
        sides: 3,
        radius: radius,
        rotation: 0,
        fill: '#808080',
        stroke: '#ECE5E5',
        strokeWidth: 8
    });
    up.on('mousedown touchstart', () => {
        isButUp = true;
        send(updateData(0, 0, 0, 0, 1));
    });
    up.on('mouseup touchend', () => {
        isButUp = false;
        send(resetData());
    });

    const down = new Konva.RegularPolygon({
        x: x,
        y: y + height / 2,
        sides: 3,
        radius: radius,
        rotation: 180,
        fill: '#808080',
        stroke: '#ECE5E5',
        strokeWidth: 8
    });
    down.on('mousedown touchstart', () => {
        isButDown = true;
        send(updateData(0, 0, 0, 0, -1));
    });
    down.on('mouseup touchend', () => {
        isButDown = false;
        send(resetData());
    });

    layer.add(up);
    layer.add(down);
}

function handleDrag() {
    const pos = joystickCircle.position();
    const dx = pos.x - joy_x_orig;
    const dy = pos.y - joy_y_orig;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let angle = Math.atan2(dy, dx);
    let angle_deg = angle < 0 ? Math.round(-angle * 180 / Math.PI) : Math.round(360 - angle * 180 / Math.PI);

    if (dist > radius) {
        const newX = radius * Math.cos(angle) + joy_x_orig;
        const newY = radius * Math.sin(angle) + joy_y_orig;
        joystickCircle.position({ x: newX, y: newY });
    }

    const rel_x = (joystickCircle.x() - joy_x_orig) / radius;
    const rel_y = -(joystickCircle.y() - joy_y_orig) / radius;
    const speed = Math.round(100 * Math.hypot(rel_x, rel_y));

    const data = updateData(rel_x, rel_y, speed, angle_deg, 0);
    send(data);
    layer.draw();
}

function resetJoystick() {
    joystickCircle.position({ x: joy_x_orig, y: joy_y_orig });
    send(resetData());
    layer.draw();
}

function resetData() {
    return [0, 0, 0, 0, 0];
}

function updateData(x, y, speed, angle, dy) {
    return [x, y, speed, angle % 360, dy];
}