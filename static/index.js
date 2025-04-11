var targetUrl = "ws://192.168.4.1:80/ws"

var connection;

function initializeSocket() {
    connection = new WebSocket(targetUrl);
    connection.onopen = function () {
        // connection.send('Connect ' + new Date());
        console.log("Starting connection to WebSocket server...")
    };
    connection.onerror = function (error) {
        console.log('WebSocket Error ', error);
        alert('Conexión fallida', error);
    };
    connection.onmessage = function (e) {
        console.log('Server: ', e.data);
    };
}

function send(data) {
    data = JSON.stringify(data);
    console.log(data);
    connection.send(data);
}

var canvas, ctx;
var canvas_width, canvas_height;
var radius, joy_x_orig, joy_y_orig;
var isButUp, isButDown;

var started = false;
var stopped = false;
var moving = false;

window.addEventListener('load', () => {

    initializeSocket();

    canvas = document.getElementById('canvas');
    canvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    ctx = canvas.getContext('2d');
    isButUp = false;
    isButDown = false;
    resize();

    document.addEventListener('mousedown', startDrawing);
    document.addEventListener('mouseup', stopDrawing);
    document.addEventListener('mousemove', Draw);

    document.addEventListener('touchstart', startDrawing);
    document.addEventListener('touchcancel', stopDrawing);
    document.addEventListener('touchend', stopDrawing);
    document.addEventListener('touchmove', Draw);

    window.addEventListener('resize', resize);
});

function resize() {
    canvas_width = window.innerWidth - 20;
    canvas_height = window.innerHeight - 20;
    main_size = canvas_width;
    if (canvas_height < canvas_width) {
        main_size = canvas_height;
    }
    radius = Math.floor(main_size * 0.2);

    ctx.canvas.width = canvas_width;
    ctx.canvas.height = canvas_height;
    background();
    joystick(joyGetX(canvas_width), joyGetY(canvas_height));
}

function joyGetX(width) {
    return width * 0.25;
}

function joyGetY(height) {
    return height * 0.5;
}

function butGetX(width) {
    return width * 0.75;
}

function butGetY(height) {
    return height * 0.5;
}

function setButCol(value) {
    if (value) {
        ctx.fillStyle = "#F08080";
        ctx.strokeStyle = '#F6ABAB';
    } else {
        ctx.fillStyle = "#808080";
        ctx.strokeStyle = '#ECE5E5';
    }
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.stroke();
}

function background() {
    joy_x_orig = joyGetX(canvas_width);
    joy_y_orig = joyGetY(canvas_height);

    ctx.beginPath();
    ctx.arc(joy_x_orig, joy_y_orig, radius + 20, 0, Math.PI * 2, true);
    ctx.fillStyle = '#ECE5E5';
    ctx.fill();
    text();
    buttons();
}

function joystick(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, true);
    ctx.fillStyle = "#F08080";
    ctx.fill();
    ctx.strokeStyle = '#F6ABAB';
    ctx.lineWidth = 8;
    ctx.stroke();
}

function buttons() {
    x = butGetX(canvas_width);
    y = butGetY(canvas_height);
    gap = radius * 0.2;
    height = radius * 1.25;

    // boton ariba
    ctx.beginPath();
    ctx.moveTo(x, y - height);
    ctx.lineTo(x + radius, y - gap);
    ctx.lineTo(x - radius, y - gap);
    ctx.closePath();

    setButCol(isButUp);

    // boton abajo
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + radius, y + gap);
    ctx.lineTo(x - radius, y + gap);
    ctx.closePath();

    setButCol(isButDown);
}

let coord = { x: 0, y: 0 };
let dy_elevation = 0;
let paint = false;

function updateJoystick(event) {
    if (!event) {
        return;
    }
    var mouse_x = event.clientX || event.touches[0].clientX;
    var mouse_y = event.clientY || event.touches[0].clientY;

    coord.x = joy_x_orig;
    coord.y = joy_y_orig;

    // joystick
    if (mouse_x < canvas_width / 2) {
        coord.x = mouse_x - canvas.offsetLeft;
        coord.y = mouse_y - canvas.offsetTop;
        return true;
    }

    return false;
}

function updateButtons(event) {
    if (!event) {
        return;
    }

    var mouse_x = event.clientX || event.touches[0].clientX;
    var mouse_y = event.clientY || event.touches[0].clientY;

    if (mouse_x < canvas_width / 2) {
        return;
    }

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

function is_it_in_the_circle() {
    var current_radius = Math.sqrt(Math.pow(coord.x - joy_x_orig, 2) + Math.pow(coord.y - joy_y_orig, 2));
    if (radius >= current_radius) return true
    else return false
}


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
    var data = updateData(0, 0, 0, 0, dy_elevation);
    send(data);
    started = true;
    stopped = false;
}


function stopDrawing() {
    if (stopped) return;
    paint = false;
    isButUp = false;
    isButDown = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    background();
    joystick(joyGetX(canvas_width), joyGetY(canvas_height));
    var data = resetData();
    send(data);
    stopped = true;
    started = false;
}

function text() {
    // Texto
    ctx.beginPath();
    ctx.font = "40px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#808080";
    ctx.fill();
    ctx.strokeStyle = "#808080";
    ctx.lineWidth = 0;
    ctx.stroke();
    ctx.fillText("AKI TOY RC", canvas.width / 2, canvas.width * 0.1);
}

function resetData() {
    // data = { "x": 0, "y": 0, "speed": 0, "angle": 0, "dy": 0 };
    data = [0,0,0,0,0]
    return data;
}

function updateData(x_relative, y_relative, speed, angle_in_degrees, dy_elevation) {
    // data = { "x": x_relative, "y": y_relative, "speed": speed, "angle": angle_in_degrees % 360, "dy": dy_elevation }
    data = [x_relative, y_relative, speed, angle_in_degrees, dy_elevation]
    return data;
}

function Draw(event) {
    if (event == "starting" || !updateJoystick(event)) {
        return;
    }

    if (paint) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        background();

        var angle_in_degrees, x, y, speed;
        var angle = Math.atan2((coord.y - joy_y_orig), (coord.x - joy_x_orig));

        if (Math.sign(angle) == -1) {
            angle_in_degrees = Math.round(-angle * 180 / Math.PI);
        }
        else {
            angle_in_degrees = Math.round(360 - angle * 180 / Math.PI);
        }


        if (is_it_in_the_circle()) {
            joystick(coord.x, coord.y);
            x = coord.x;
            y = coord.y;
        }
        else {
            x = radius * Math.cos(angle) + joy_x_orig;
            y = radius * Math.sin(angle) + joy_y_orig;
            joystick(x, y);
        }

        var speed = Math.round(100 * Math.sqrt(Math.pow(x - joy_x_orig, 2) + Math.pow(y - joy_y_orig, 2)) / radius);

        var x_relative = Math.round(x - joy_x_orig) / radius;
        var y_relative = Math.round(y - joy_y_orig) / radius;

        var data = updateData(x_relative, -y_relative, speed, angle_in_degrees, dy_elevation);
        send(data);
    }
} 