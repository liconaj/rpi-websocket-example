"""
cargo.py - Módulo de control de hardware para un robot tipo forklift (montacargas).

Este archivo define las clases y funciones necesarias para controlar motores, servo,
y calcular la lógica de dirección de un robot controlado remotamente.

Aunque los detalles físicos del robot no son el foco del repositorio, este módulo
ilustra cómo se encapsula la lógica de movimiento que puede ser llamada desde un
servidor WebSocket, permitiendo el control desde un dispositivo móvil.
"""

from machine import Pin, PWM
import utime

# Pines de control para los motores
ENA = 8  # PWM motor izquierdo
IN1 = 9  # Dirección motor izquierdo
IN2 = 10  # Dirección motor izquierdo
IN3 = 11  # Dirección motor derecho
IN4 = 12  # Dirección motor derecho
ENB = 13  # PWM motor derecho

# Pin del servo de elevación
SERVO = 1


def turn_on_led():
    """Enciende el LED de la placa como indicador visual de encendido."""
    led = Pin("LED", Pin.OUT)
    led.on()


def calc_L(x: float, y: float) -> float:
    """
    Calcula una longitud de giro para maniobras especiales del robot.

    Este valor se usa para ajustar la diferencia de velocidad entre los motores
    cuando se quiere hacer un giro en el lugar o en curva.
    """
    L = []
    if y != -1:
        L.append(x / (y + 1))
        L.append(-x / (y + 1))
    if y != 1:
        L.append(x / (y - 1))
        L.append(x / (1 - y))
    L = abs(max(L))
    return L if L != 0 else 1


def clamp(num, min_value, max_value):
    """Restringe un valor numérico entre un mínimo y un máximo."""
    return max(min(num, max_value), min_value)


def sign(num):
    """Devuelve el signo de un número (-1, 0 o 1)."""
    return (num > 0) - (num < 0)


class Control:
    """
    Clase principal para manejar la lógica del robot.

    A partir de valores enviados desde el cliente (por WebSocket), actualiza
    la dirección, velocidad y elevación del robot.
    """

    def __init__(self):
        turn_on_led()  # Indica que el controlador ha iniciado

        # Variables internas
        self.x = 0  # movimiento lateral
        self.y = 0  # movimiento frontal
        self.r = 0  # radio de giro
        self.a = 0  # ángulo
        self.e = 0  # dirección de elevación

        # Instancias de motores y servo
        self.motor_left = Motor(ENA, IN2, IN1)
        self.motor_right = Motor(ENB, IN4, IN3)
        self.servo = Servo(
            SERVO, min_duty=870, max_duty=7300, min_angle=-90, max_angle=90
        )

    def update_values(self, data: dict) -> None:
        """
        Actualiza los valores internos de dirección y elevación.

        Este método es llamado con los datos que llegan del teléfono.
        """
        self.x = data["x"]
        self.y = data["y"]
        self.r = data["r"]
        self.a = data["a"]
        self.e = data["e"]

    def update_direction(self) -> None:
        """
        Calcula las velocidades de los motores izquierdo y derecho con base
        en los valores de x e y recibidos.

        Usa una lógica para manejar movimiento recto, giros y maniobras suaves.
        """
        x, y = self.x, self.y
        vel_left = 0
        vel_right = 0

        # Giro en el lugar si x es dominante
        if abs(x) > 0.7 and abs(y) < 0.25:
            L = calc_L(x, y)
            vel_left = y - x / L
            vel_right = x / L + y
        else:
            # Movimiento lineal o curva suave
            if abs(x) < 0.05:
                vel_left = vel_right = y
            elif x <= 0:
                vel_left = sign(y)
                vel_right = 0.005 * sign(y)
            else:
                vel_right = sign(y)
                vel_left = 0.005 * sign(y)

        self.motor_left.set_velocity(vel_left)
        self.motor_right.set_velocity(vel_right)

    def update_elevation(self) -> None:
        """
        Ajusta el ángulo del servo de elevación según el valor de `e`.

        Este control permite subir o bajar una plataforma tipo forklift.
        """
        rate = 0.5  # Grados por ciclo de actualización
        if self.e != 0:
            self.servo.increase(rate * self.e)


class Motor:
    """
    Clase que encapsula el control de un motor con dirección y velocidad PWM.
    """

    def __init__(self, pin_speed: int, pin_forward: int, pin_back: int):
        self.pin_forward = Pin(pin_forward, Pin.OUT)
