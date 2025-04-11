import asyncio
from microdot import Microdot, Response, send_file
from microdot.utemplate import Template
from microdot.websocket import with_websocket
import time

from cargo import Control

# Inicialización del servidor Microdot
app = Microdot()
Response.default_content_type = "text/html"

# Instancia del objeto de control del forklift
control = Control()


def deserialize(data: str) -> dict:
    """
    Convierte un string de datos en formato [x,y,r,a,e] en un diccionario.

    Args:
        data (str): String de datos en formato [x,y,r,a,e].

    Returns:
        dict: Diccionario con las claves 'x', 'y', 'r', 'a', 'e' y valores float.
    """
    try:
        values = data[1:-1].split(",")
        return {
            "x": float(values[0]),
            "y": float(values[1]),
            "r": float(values[2]),
            "a": float(values[3]),
            "e": float(values[4]),
        }
    except (IndexError, ValueError) as e:
        print("Error en deserialize:", e)
        return {"x": 0, "y": 0, "r": 0, "a": 0, "e": 0}


@app.route("/", methods=["GET", "POST"])
async def index(request):
    """
    Ruta principal que entrega el HTML inicial.

    Args:
        request: Objeto de solicitud HTTP.

    Returns:
        str: HTML renderizado.
    """
    name = None
    if request.method == "POST":
        name = request.form.get("name")
    return Template("index.html").render(name=name)


@app.route("/ws")
@with_websocket
async def get_control(request, ws):
    """
    Ruta de WebSocket que recibe datos del navegador en tiempo real.

    Args:
        request: Objeto de solicitud.
        ws: Objeto de WebSocket.

    Recibe los datos del control y actualiza el objeto `control`.
    """
    print("WebSocket conectado.")
    try:
        while True:
            data = await ws.receive()
            control.update_values(deserialize(data))
            await asyncio.sleep(0.002)  # 2 ms para liberar el loop
    except Exception as e:
        print("WebSocket desconectado o error:", e)


@app.route("/static/<path:path>")
def static(request, path):
    """
    Ruta para servir archivos estáticos como CSS o JS.

    Args:
        request: Objeto de solicitud.
        path (str): Ruta del archivo dentro de /static.

    Returns:
        Archivo estático o error 404.
    """
    if ".." in path:
        return "Not found", 404
    return send_file("static/" + path)


async def move_car():
    """
    Bucle principal que actualiza continuamente la dirección y elevación
    del forklift a partir de los valores actuales.
    """
    print("Iniciando bucle de control del forklift...")
    while True:
        control.update_direction()
        control.update_elevation()
        await asyncio.sleep(0.001)  # Espera de 1 ms para no saturar CPU


async def start_server():
    """
    Inicia el servidor web en el puerto 80.
    """
    app.run(port=80, debug=True)


async def main():
    """
    Lanza en paralelo el servidor web y el bucle de control del forklift.
    """
    server_task = asyncio.create_task(start_server())
    control_task = asyncio.create_task(move_car())

    await asyncio.gather(server_task, control_task)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Servidor detenido manualmente.")
