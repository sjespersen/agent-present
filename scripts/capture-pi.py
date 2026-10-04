#!/usr/bin/env python3
"""
Drives the real Pi TUI in a pseudo-terminal and captures screens.

Used to verify the extension end to end and to produce the gallery's
"in Pi" screenshots. Requires `pyte` (pip install pyte).

  python3 scripts/capture-pi.py steps.json out-dir

steps.json:
  {"cols": 110, "rows": 48, "args": ["pi", "--no-session", ...],
   "steps": [{"send": "/present demo repo-review\\r", "wait": 2}, {"snap": "glance"}]}

Each snap writes <name>.txt (plain) and <name>.json (cells with colours).
"""
import json
import os
import pty
import select
import sys
import time

import pyte


def main() -> None:
    spec = json.load(open(sys.argv[1]))
    out_dir = sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    cols, rows = spec.get("cols", 110), spec.get("rows", 48)

    screen = pyte.Screen(cols, rows)
    stream = pyte.ByteStream(screen)

    pid, fd = pty.fork()
    if pid == 0:
        os.environ.update({"TERM": "xterm-256color", "COLORTERM": "truecolor", "COLUMNS": str(cols), "LINES": str(rows)})
        os.environ.update(spec.get("env", {}))
        os.execvp(spec["args"][0], spec["args"])

    import fcntl
    import struct
    import termios

    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))

    def pump(seconds: float) -> None:
        end = time.time() + seconds
        while time.time() < end:
            r, _, _ = select.select([fd], [], [], 0.05)
            if fd in r:
                try:
                    data = os.read(fd, 65536)
                except OSError:
                    return
                if not data:
                    return
                stream.feed(data)
                # answer common terminal queries so the app does not wait on them
                if b"\x1b[c" in data or b"\x1b[0c" in data:
                    os.write(fd, b"\x1b[?62;22c")
                if b"\x1b[6n" in data:
                    os.write(fd, f"\x1b[{screen.cursor.y + 1};{screen.cursor.x + 1}R".encode())

    def snap(name: str) -> None:
        lines, cells = [], []
        for y in range(rows):
            row = screen.buffer[y]
            text = "".join(row[x].data for x in range(cols))
            lines.append(text.rstrip())
            cells.append([[row[x].data, row[x].fg, row[x].bg, row[x].bold, row[x].italics, row[x].reverse] for x in range(cols)])
        open(os.path.join(out_dir, f"{name}.txt"), "w").write("\n".join(lines) + "\n")
        json.dump({"cols": cols, "rows": rows, "cells": cells}, open(os.path.join(out_dir, f"{name}.json"), "w"))
        print(f"snap {name}")

    pump(spec.get("startup", 4))
    for step in spec["steps"]:
        if "send" in step:
            os.write(fd, step["send"].encode())
        if "wait" in step:
            pump(step["wait"])
        if "snap" in step:
            pump(0.3)
            snap(step["snap"])
    try:
        os.kill(pid, 9)
    except OSError:
        pass


if __name__ == "__main__":
    main()
