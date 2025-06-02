import platform
import cv2
from ultralytics import YOLO
import pytesseract
import os
import time
import serial
import serial.tools.list_ports
import csv
from collections import Counter
import psycopg2
from datetime import datetime

# Load YOLOv8 model
model = YOLO("../model_dev/runs/detect/train/weights/best.pt")

# Configurations
SAVE_DIR = "plates"
DB_CONFIG = {
    "dbname": "parking_system",
    "user": "jodos",
    "password": "jodos",
    "host": "localhost",
    "port": "5432"
}
ENTRY_COOLDOWN = 300  # seconds
MAX_DISTANCE = 50  # cm
MIN_DISTANCE = 0  # cm
CAPTURE_THRESHOLD = 3  # number of consistent reads before logging
GATE_OPEN_TIME = 15  # seconds

# Ensure directories exist
os.makedirs(SAVE_DIR, exist_ok=True)

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

def has_unpaid_record(plate):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) FROM parking_entries WHERE car_plate = %s AND payment_status = FALSE",
                    (plate,)
                )
                count = cur.fetchone()[0]
                return count > 0
    except Exception as e:
        print(f"Database error: {e}")
        return False

def save_entry(plate):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO parking_entries (entry_time, car_plate, payment_status)
                    VALUES (%s, %s, FALSE)
                    RETURNING id
                    """,
                    (datetime.now(), plate)
                )
                entry_id = cur.fetchone()[0]
                conn.commit()
                return entry_id
    except Exception as e:
        print(f"Database error: {e}")
        return None

# Rest of the Arduino detection code remains the same
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

def read_distance(arduino):
    if not arduino or arduino.in_waiting == 0:
        return None
    try:
        val = arduino.readline().decode("utf-8").strip()
        return float(val)
    except (UnicodeDecodeError, ValueError):
        return None

# Initialize Arduino
arduino_port = detect_arduino_port()
arduino = None
if arduino_port:
    print(f"[CONNECTED] Arduino on {arduino_port}")
    arduino = serial.Serial(arduino_port, 9600, timeout=1)
    time.sleep(2)
else:
    print("[ERROR] Arduino not detected.")

# Initialize Webcam and Windows
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("[ERROR] Cannot open camera.")
    exit(1)
cv2.namedWindow("Webcam Feed", cv2.WINDOW_NORMAL)
cv2.namedWindow("Plate", cv2.WINDOW_NORMAL)
cv2.namedWindow("Processed", cv2.WINDOW_NORMAL)
cv2.resizeWindow("Webcam Feed", 800, 600)

# State variables
plate_buffer = []
last_saved_plate = None
last_entry_time = 0

print("[SYSTEM] Ready. Press 'q' to exit.")

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Frame capture failed.")
            break

        distance = read_distance(arduino) or (MAX_DISTANCE - 1)
        annotated = frame.copy()

        if MIN_DISTANCE <= distance <= MAX_DISTANCE:
            results = model(frame)[0]
            annotated = results.plot()

            for box in results.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                plate_img = frame[y1:y2, x1:x2]

                # OCR preprocess
                gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)
                blur = cv2.GaussianBlur(gray, (5, 5), 0)
                thresh = cv2.threshold(
                    blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
                )[1]

                text = (
                    pytesseract.image_to_string(
                        thresh,
                        config="--psm 8 --oem 3 "
                        "-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
                    )
                    .strip()
                    .replace(" ", "")
                )

                # Validate Rwandan format RAxxxA
                if text.startswith("RA") and len(text) >= 7:
                    plate = text[:7]
                    pr, dg, su = plate[:3], plate[3:6], plate[6]
                    if pr.isalpha() and dg.isdigit() and su.isalpha():
                        plate_buffer.append(plate)

                # Once the buffer is full, decide
                if len(plate_buffer) >= CAPTURE_THRESHOLD:
                    common = Counter(plate_buffer).most_common(1)[0][0]
                    now = time.time()

                    # Only save if not duplicate unpaid
                    if not has_unpaid_record(common):
                        # Optional cool-down logic still applies
                        if (
                            common != last_saved_plate
                            or (now - last_entry_time) > ENTRY_COOLDOWN
                        ):
                            if save_entry(common):
                                print(f"[NEW] Logged plate {common}")

                                # Gate actuation
                                if arduino:
                                    arduino.write(b"1")
                                    time.sleep(GATE_OPEN_TIME)
                                    arduino.write(b"0")

                                last_saved_plate = common
                                last_entry_time = now
                        else:
                            print(f"[SKIPPED] Cooldown: {common}")
                    else:
                        print(f"[SYSTEM TERMINATED] Unpaid record exists for {common}")
                        cap.release()
                        if arduino:
                            arduino.close()
                        cv2.destroyAllWindows()
                        exit(0)

                    plate_buffer.clear()

                # Show previews
                cv2.imshow("Plate", plate_img)
                cv2.imshow("Processed", thresh)
                time.sleep(0.5)

        # Display feed
        cv2.imshow("Webcam Feed", annotated)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
finally:
    cap.release()
    if arduino:
        arduino.close()
    cv2.destroyAllWindows()