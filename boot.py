SSID = "My Device"
SSI_PASSWORD = "password"

def do_connect():
    import network
    ap = network.WLAN(network.AP_IF)
    ap.config(essid=SSID, password=SSI_PASSWORD)
    ap.active(True)

    while ap.active() == False:
        pass

    ip = ap.ifconfig()[0]
    print("Modo Punto de Accesso activado")
    print("Direccion IP:: " + ip)
    return ip

print("Creando punto de acceso...")
do_connect()
