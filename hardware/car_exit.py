import platform
import cv2
from ultralytics import YOLO
import pytesseract
import time
import serial
import serial.tools.list_ports
from collections import Counter
import psycopg2
from datetime import datetime, timedelta
from psycopg2.extras import DictCursor

# Load YOLOv8 model
model = YOLO("../model_dev/runs/detect/train/weights/best.pt")

# Configurations
DB_CONFIG = {
    "dbname": "parking_system",
    "user": "jodos",
    "password": "jodos",
    "host": "localhost",
    "port": "5432",
}
MAX_DISTANCE = 50  # cm
MIN_DISTANCE = 0  # cm
EXIT_TIME_WINDOW = 5  # minutes


def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)


# ===== Auto-detect Arduino Serial Port =====
def detect_arduino_port():
    for port in serial.tools.list_ports.comports():
        dev = port.device
        if platform.system() == "Linux" and "ttyACM" in dev:
            return dev
        if platform.system() == "Darwin" and ("usbmodem" in dev or "usbserial" in dev):
            return dev
        if platform.system() == "Windows" and "COM" in dev:
            return dev
    return None


# Read distance from Arduino (returns float or None)
def read_distance(arduino):
    if not arduino or arduino.in_waiting == 0:
        return None
    try:
        val = arduino.readline().decode("utf-8").strip()
        return float(val)
    except (UnicodeDecodeError, ValueError):
        return None


def handle_exit(plate_number, arduino=None):
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=DictCursor) as cur:
                # First, check if there's any entry record at all for this plate
                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM parking_entries
                    WHERE car_plate = %s
                """,
                    (plate_number,),
                )

                has_any_entry = cur.fetchone()[0] > 0

                if not has_any_entry:
                    # Log security incident for exit attempt without entry
                    cur.execute(
                        """
                        INSERT INTO security_incidents 
                        (car_plate, incident_type, incident_time, description)
                        VALUES (%s, 'NO_ENTRY_EXIT_ATTEMPT', %s, %s)
                    """,
                        (
                            plate_number,
                            datetime.now(),
                            f"Vehicle {plate_number} attempted to exit without any entry record",
                        ),
                    )
                    conn.commit()
                    print(
                        f"[SECURITY ALERT] Exit attempt without entry record: {plate_number}"
                    )

                    # Trigger more aggressive alarm pattern
                    if arduino:
                        print("[ALARM] Triggering security breach alarm")
                        for _ in range(5):  # Five alarm bursts (longer pattern)
                            arduino.write(b"1")  # Open gate (triggers buzzer)
                            time.sleep(0.7)  # Longer beep
                            arduino.write(b"0")  # Close gate (stops buzzer)
                            time.sleep(0.2)  # Short pause

                    return "NO_ENTRY"

                # Rest of the existing checks for unpaid and valid exits...
                # Check if there's an unpaid entry
                cur.execute(
                    """
                    SELECT id
                    FROM parking_entries
                    WHERE car_plate = %s 
                    AND payment_status = FALSE
                    AND exit_time IS NULL
                    ORDER BY entry_time DESC LIMIT 1
                """,
                    (plate_number,),
                )

                unpaid_entry = cur.fetchone()

                if unpaid_entry:
                    # Log unauthorized exit attempt
                    cur.execute(
                        """
                        INSERT INTO security_incidents 
                        (car_plate, incident_type, incident_time, description)
                        VALUES (%s, 'UNAUTHORIZED_EXIT', %s, %s)
                    """,
                        (
                            plate_number,
                            datetime.now(),
                            f"Attempted exit without payment for plate {plate_number}",
                        ),
                    )
                    conn.commit()
                    print(
                        f"[SECURITY ALERT] Unauthorized exit attempt by {plate_number}"
                    )

                    # Trigger alarm pattern
                    if arduino:
                        print("[ALARM] Triggering security alarm")
                        for _ in range(3):  # Three alarm bursts
                            arduino.write(b"1")
                            time.sleep(0.5)
                            arduino.write(b"0")
                            time.sleep(0.3)

                    return "UNAUTHORIZED"

                # Check for valid exit
                cur.execute(
                    """
                    SELECT *
                    FROM parking_entries
                    WHERE car_plate = %s 
                    AND payment_status = TRUE 
                    AND exit_time IS NOT NULL
                    AND exit_time > %s
                    ORDER BY exit_time DESC LIMIT 1
                """,
                    (
                        plate_number,
                        datetime.now() - timedelta(minutes=EXIT_TIME_WINDOW),
                    ),
                )

                result = cur.fetchone()

                if result:
                    print(f"[ACCESS GRANTED] Latest paid exit found for {plate_number}")
                    return "GRANTED"
                else:
                    print(
                        f"[ACCESS DENIED] No recent paid exit record for {plate_number}"
                    )
                    if arduino:
                        for _ in range(5):  # Five alarm bursts (longer pattern)
                            arduino.write(b"1")  # Open gate (triggers buzzer)
                            time.sleep(0.7)  # Longer beep
                            arduino.write(b"0")  # Close gate (stops buzzer)
                            time.sleep(0.2)  # Short pause

                    return "DENIED"

    except psycopg2.Error as e:
        print(f"[DATABASE ERROR] {e}")
        return "ERROR"


def main():
    # Initialize Arduino
    arduino_port = detect_arduino_port()
    arduino = None
    if arduino_port:
        print(f"[CONNECTED] Arduino on {arduino_port}")
        arduino = serial.Serial(arduino_port, 9600, timeout=1)
        time.sleep(2)
    else:
        print("[ERROR] Arduino not detected.")

    # Initialize Webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[ERROR] Cannot open camera")
        if arduino:
            arduino.close()
        return

    plate_buffer = []
    print("[EXIT SYSTEM] Ready. Press 'q' to quit.")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[ERROR] Failed to capture frame")
                break

            # Get distance reading, default to safe value
            distance = read_distance(arduino) or (MAX_DISTANCE - 1)
            print(f"[SENSOR] Distance: {distance} cm")

            if MIN_DISTANCE <= distance <= MAX_DISTANCE:
                results = model(frame)

                for result in results:
                    for box in result.boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        plate_img = frame[y1:y2, x1:x2]

                        # Preprocess
                        gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)
                        blur = cv2.GaussianBlur(gray, (5, 5), 0)
                        thresh = cv2.threshold(
                            blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
                        )[1]

                        # OCR
                        plate_text = (
                            pytesseract.image_to_string(
                                thresh,
                                config="--psm 8 --oem 3 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
                            )
                            .strip()
                            .replace(" ", "")
                        )

                        if "RA" in plate_text:
                            start_idx = plate_text.find("RA")
                            plate_candidate = plate_text[start_idx:]
                            if len(plate_candidate) >= 7:
                                plate_candidate = plate_candidate[:7]
                                prefix, digits, suffix = (
                                    plate_candidate[:3],
                                    plate_candidate[3:6],
                                    plate_candidate[6],
                                )
                                if (
                                    prefix.isalpha()
                                    and prefix.isupper()
                                    and digits.isdigit()
                                    and suffix.isalpha()
                                    and suffix.isupper()
                                ):
                                    print(f"[VALID] Plate Detected: {plate_candidate}")
                                    plate_buffer.append(plate_candidate)

                                    if len(plate_buffer) >= 3:
                                        most_common = Counter(plate_buffer).most_common(
                                            1
                                        )[0][0]
                                        plate_buffer.clear()

                                        exit_status = handle_exit(most_common, arduino)

                                        if exit_status == "GRANTED":
                                            print(
                                                f"[ACCESS GRANTED] Exit recorded for {most_common}"
                                            )
                                            if arduino:
                                                arduino.write(b"1")  # Open gate
                                                print("[GATE] Opening gate")
                                                time.sleep(15)
                                                arduino.write(b"0")  # Close gate
                                                print("[GATE] Closing gate")
                                        elif exit_status == "NO_ENTRY":
                                            print(
                                                f"[SECURITY ALERT] No entry record found for {most_common}"
                                            )
                                            # Alarm is already handled in handle_exit function
                                        elif exit_status == "UNAUTHORIZED":
                                            print(
                                                f"[SECURITY ALERT] Unauthorized exit attempt by {most_common}"
                                            )
                                            # Alarm is already handled in handle_exit function
                                        else:
                                            print(
                                                f"[ACCESS DENIED] Exit not allowed for {most_common}"
                                            )
                                            # Warning beep is already handled in handle_exit function

                        cv2.imshow("Plate", plate_img)
                        cv2.imshow("Processed", thresh)
                        time.sleep(0.5)

                annotated_frame = results[0].plot() if distance <= 50 else frame
                cv2.imshow("Exit Webcam Feed", annotated_frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    except Exception as e:
        print(f"[ERROR] An error occurred: {e}")
    finally:
        if arduino:
            arduino.close()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
