#!/bin/bash
# VHDL Simulator - pokretač lokalnog servera
PORT=8765
echo "Pokrećem VHDL Simulator na http://localhost:$PORT"
echo "Pritisnite Ctrl+C za zaustavljanje"
open "http://localhost:$PORT" 2>/dev/null || true
python3 -m http.server $PORT
