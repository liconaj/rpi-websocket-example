import asyncio
from microdot import Microdot, Response, send_file
from microdot.utemplate import Template
from microdot.websocket import with_websocket
import time

from cargo import Control

app = Microdot()
Response.default_content_type = "text/html"

control = Control()


def deserialize(data: str) -> dict:
    values = data[1:-1].split(",")
    data_dict = {
        "x": float(values[0]),
        "y": float(values[1]),
        "r": float(values[2]),
        "a": float(values[3]),
        "e": float(values[4]),
    }
    return data_dict


@app.route("/", methods=["GET", "POST"])
async def index(request):
    name = None
    if request.method == "POST":
        name = request.form.get("name")
    return Template("index.html").render(name=name)


@app.route("/ws")
@with_websocket
async def get_control(request, ws):
    while True:
        data = await ws.receive()
        control.update_values(deserialize(data))
        time.sleep_ms(2)


@app.route("/static/<path:path>")
def static(request, path):
    if ".." in path:
        return "Not found", 404
    return send_file("static/" + path)


async def move_car():
    print("Starting control loop")
    while True:
        control.update_direction()
        control.update_elevation()
        await asyncio.sleep(0.001)


async def start_server():
    app.run(port=80, debug=True)


async def main():
    server_task = asyncio.create_task(start_server())
    control_task = asyncio.create_task(move_car())

    await asyncio.gather(server_task, control_task)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
