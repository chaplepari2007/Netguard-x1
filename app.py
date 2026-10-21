from flask import Flask, render_template, request, jsonify
from datetime import datetime
import ipaddress

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/test", methods=["POST"])
def network_test():
    data = request.get_json(silent=True) or {}
    ip_text = (data.get("ip") or "").strip()
    fault = data.get("fault", "normal")
    protocol = data.get("protocol", "TCP")
    try:
        address = ipaddress.ip_address(ip_text)
        valid_ip = True
        ip_version = f"IPv{address.version}"
        ip_message = f"Valid {ip_version} address."
    except ValueError:
        valid_ip = False
        ip_version = "Unknown"
        ip_message = "Invalid IP address. Check the format and try again."

    scenarios = {
        "normal": ("Healthy", "No simulated fault detected.", 12, 0, "No action required. Repeat the test if connectivity changes."),
        "bad_ip": ("Configuration error", "Check the IP address, subnet prefix and default gateway.", 0, 0, "Confirm the address belongs to the correct subnet and check the subnet mask/prefix and gateway."),
        "packet_loss": ("Packet loss", "Some packets are dropped in this simulation.", 86, 18, "Inspect cables and switch ports, check interface errors and reduce congestion."),
        "latency": ("High latency", "The simulated response time is high.", 245, 0, "Compare latency across hops, inspect traffic load and verify the route."),
        "corruption": ("Checksum mismatch", "A simulated data-corruption error was detected.", 48, 1, "Check link quality and error counters; retransmit data when supported."),
        "switch_down": ("Switch offline", "The switch is unavailable in this scenario.", 0, 100, "Check switch power, uplink cable and port configuration."),
        "server_down": ("Server unreachable", "The server is offline in this scenario.", 0, 100, "Check server availability, service status, firewall rules and routing.")
    }
    status, diagnosis, latency, loss, recovery = scenarios.get(fault, scenarios["normal"])
    if not valid_ip:
        status, diagnosis, latency, loss = "Invalid IP", ip_message, 0, 100
        recovery = "Enter a valid IPv4 address (e.g. 192.168.1.10) or IPv6 address (e.g. 2001:db8::1)."
    elif fault == "normal":
        diagnosis = ip_message + " " + diagnosis
    return jsonify({"time": datetime.now().strftime("%H:%M:%S"), "status": status, "diagnosis": diagnosis,
                    "recovery": recovery, "ip_valid": valid_ip, "ip_version": ip_version,
                    "latency": latency, "loss": loss, "protocol": protocol,
                    "checksum": "Mismatch simulated" if fault == "corruption" else "No mismatch in this scenario"})

@app.route("/api/quiz")
def quiz_questions():
    return jsonify([
        {"q":"Which message starts a TCP three-way handshake?","options":["ACK","SYN","FIN","RST"],"answer":1,"why":"The client starts by sending SYN."},
        {"q":"QUIC is built on top of which transport protocol?","options":["TCP","UDP","ICMP","ARP"],"answer":1,"why":"QUIC runs over UDP."},
        {"q":"How long is an IPv6 address?","options":["32 bits","48 bits","64 bits","128 bits"],"answer":3,"why":"IPv6 addresses are 128 bits."},
        {"q":"What can a checksum help detect?","options":["Data corruption","Screen resolution","Usernames","Cable length"],"answer":0,"why":"Checksums help detect accidental data corruption."},
        {"q":"TCP flow control helps prevent what?","options":["Receiver overload","All routing errors","Invalid HTML","Power failure"],"answer":0,"why":"Flow control helps avoid overwhelming the receiver."},
        {"q":"Which device commonly forwards frames using MAC addresses?","options":["Switch","Monitor","Keyboard","Printer"],"answer":0,"why":"A Layer 2 switch forwards frames using MAC addresses."},
        {"q":"What does DNS commonly translate?","options":["Domain names to IP addresses","TCP to UDP","Bytes to pixels","Wi-Fi to Ethernet"],"answer":0,"why":"DNS resolves domain names to IP addresses."}
    ])

if __name__ == "__main__":
    app.run(debug=True)
