from machine import Pin, PWM
import utime

ENA = 8
IN1 = 9
IN2 = 10
IN3 = 11
IN4 = 12
ENB = 13

SERVO = 1


def turn_on_led():
    led = Pin("LED", Pin.OUT)
    led.on()


def calc_L(x: float, y: float) -> float:
    L = []
    if y != -1:
        L.append(x/(y+1))
        L.append(-x/(y+1))
    if y != 1:
        L.append(x/(y-1))
        L.append(x/(1-y))
    L = abs(max(L))
    if L == 0:
        L = 1
    return L


def clamp(num, min_value, max_value):
    if num > max_value:
        return max_value
    if num < min_value:
        return min_value
    return num

def sign(num):
    if num > 0:
        return 1
    elif num < 0:
        return -1
    else:
        return 0


class Control:
    def __init__(self):
        turn_on_led()
        self.x = 0 # x relative
        self.y = 0 # y relative
        self.r = 0 # radius
        self.a = 0 # angle in degrees
        self.e = 0 # dy elevation

        self.motor_left = Motor(ENA, IN2, IN1)
        self.motor_right = Motor(ENB, IN4, IN3)

        self.servo = Servo(SERVO, min_duty=870, max_duty=7300, min_angle=-90, max_angle=90)

    def update_values(self, data: dict) -> None:
        self.x = data["x"]
        self.y = data["y"]
        self.r = data["r"]
        self.a = data["a"]
        self.e = data["e"]

    def update_direction(self) -> None:
        x = self.x
        y = self.y
        vel_left = 0
        vel_right = 0
        if abs(x) > 0.7 and abs(y) < 0.25:
            L = calc_L(x, y)
            vel_left = y - x/L
            vel_right = x/L + y
        else:
            if abs(x) < 0.05:
                vel_right = y
                vel_left = y
            elif -x >= 0:
                vel_left = sign(y)
                vel_right = 0.005 * sign(y)
                #vel_right = y * (1 - abs(x))/2
            else:
                vel_right = sign(y)
                vel_left = 0.005 * sign(y)
                # vel_left = y * (1 - abs(x))/2
        self.motor_left.set_velocity(vel_left)
        self.motor_right.set_velocity(vel_right)

    def update_elevation(self) -> None:
        rate = 0.5  # degrees
        if self.e != 0:
            self.servo.increase(rate*self.e)


class Motor:
    def __init__(self, pin_speed: int, pin_forward: int, pin_back: int):
        self.pin_forward = Pin(pin_forward, Pin.OUT)
        self.pin_back = Pin(pin_back, Pin.OUT)

        self.pin_speed = PWM(Pin(pin_speed, Pin.OUT))
        self.pin_speed.freq(1500)
        self.min_speed = 30000
        self.max_speed = int(65535)

    def set_velocity(self, velocity: float) -> None:
        """ set velocity
        param: velocity: númmero entero entre -1 y 1 que
               determina la dirección y velocidad del motor
        """
        dv = self.max_speed - self.min_speed
        self.speed = self.min_speed + abs(velocity) * dv
        self.pin_speed.duty_u16(int(self.speed))
        # self.pin_speed.duty_u16(self.max_speed)
        if velocity > 0:
            self.pin_forward.on()
            self.pin_back.off()
        elif velocity < 0:
            self.pin_forward.off()
            self.pin_back.on()
        else:
            self.pin_forward.off()
            self.pin_back.off()


class Servo():
    def __init__(self, pin_pwm: int, min_duty: int, max_duty: int, min_angle: float = -90, max_angle: float = 90, rest_angle: float = 0):
        self.pwm = PWM(Pin(pin_pwm, Pin.OUT))
        self.pwm.freq(50)
        self.min_duty = min_duty
        self.max_duty = max_duty
        self.min_angle = min_angle
        self.max_angle = max_angle
        self.rest_angle = rest_angle
        self.reset()

    def set(self, angle: float) -> None:
        angle = clamp(angle, self.min_angle, self.max_angle)
        self.angle = angle
        d_duty = self.max_duty - self.min_duty
        d_angle = self.max_angle - self.min_angle
        duty = (angle - self.min_angle) * (d_duty/d_angle) + self.min_duty
        self.pwm.duty_u16(int(duty))

    def increase(self, rate: float) -> None:
        old = self.angle
        self.angle += rate
        self.angle = clamp(self.angle, self.min_angle, self.max_angle)
        self.set(self.angle)
        if old != self.angle:
            self.set(self.angle)

    def decrease(self, rate: float) -> None:
        old = self.angle
        self.angle -= rate
        self.angle = clamp(self.angle, self.min_angle, self.max_angle)
        if old != self.angle:
            self.set(self.angle)

    def reset(self) -> None:
        self.set(self.rest_angle)
