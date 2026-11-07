"""
Sample frames from a span of a video and report where the speaker's face is.

Usage: face_track.py <video> <start_sec> <end_sec> [samples]
Prints one JSON object on stdout:
  {"width": 1920, "height": 1080, "centres": [1534.0, 1541.5, ...]}

`centres` holds, for each sampled frame that has a face, the x-centre (source
pixels) of the LARGEST face — on a talking-head or podcast shot that is the
speaker closest to the camera. Frames with no face contribute nothing; the
caller falls back to a centre crop when the list is empty.

Uses the Haar cascade bundled inside opencv-python-headless, so there is no
model file to download or ship. Frontal faces only, which is what a talking
head is; a profile shot simply yields no detection and a centre crop.
"""
import json
import sys

import cv2


def main() -> int:
    if len(sys.argv) < 4:
        print("usage: face_track.py <video> <start_sec> <end_sec> [samples]", file=sys.stderr)
        return 2
    path = sys.argv[1]
    start = float(sys.argv[2])
    end = float(sys.argv[3])
    samples = int(sys.argv[4]) if len(sys.argv) > 4 else 12

    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        print(f"cannot open {path}", file=sys.stderr)
        return 1
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    # Detect on a downscaled frame: Haar cost grows with pixel count and a face
    # big enough to matter in a vertical crop survives a 480px-high frame.
    scale = min(1.0, 480.0 / max(1, height))
    min_face = max(24, int(min(width, height) * scale * 0.06))

    span = max(0.0, end - start)
    centres = []
    for i in range(samples):
        t = start + span * (i + 0.5) / samples
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000.0)
        ok, frame = cap.read()
        if not ok or frame is None:
            continue
        small = cv2.resize(frame, None, fx=scale, fy=scale) if scale < 1.0 else frame
        gray = cv2.equalizeHist(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY))
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(min_face, min_face))
        if len(faces) == 0:
            continue
        x, _y, w, _h = max(faces, key=lambda f: f[2] * f[3])
        centres.append(round((x + w / 2.0) / scale, 1))

    cap.release()
    json.dump({"width": width, "height": height, "centres": centres}, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
