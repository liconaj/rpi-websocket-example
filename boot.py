"""
boot.py - Configura la Raspberry Pi Pico W como un punto de acceso Wi-Fi.

Este archivo se ejecuta automáticamente al iniciar el dispositivo. Su objetivo es
habilitar el modo Access Point (AP) para que otros dispositivos, como un teléfono,
puedan conectarse directamente a la Pico W vía Wi-Fi.

Una vez que el AP está activo, se imprime la dirección IP, que puede usarse para
acceder al servidor web implementado más adelante en el proyecto.
"""

# Nombre de red (SSID) y contraseña para el punto de acceso
SSID = "My Device"
SSID_PASSWORD = "password"


def do_connect():
    """
    Habilita el modo Access Point en la Pico W y espera hasta que esté activo.

    Returns:
        str: Dirección IP asignada al punto de acceso.
    """
    import network

    # Crear interfaz Wi-Fi en modo Access Point
    ap = network.WLAN(network.AP_IF)
    ap.config(essid=SSID, password=SSID_PASSWORD)
    ap.active(True)

    # Esperar hasta que el AP esté activo
    while not ap.active():
        pass

    # Obtener la dirección IP del punto de acceso
    ip = ap.ifconfig()[0]
    print("Modo Punto de Acceso activado")
    print("Dirección IP: " + ip)
    return ip


# Ejecutar la conexión al iniciar
print("Creando punto de acceso...")
do_connect()
