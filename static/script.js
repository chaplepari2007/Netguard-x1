
const $ = id => document.getElementById(id);

let historyItems = [];

const deviceInfo = {
    "PC 01": "End device · IPv4 example address 192.168.1.10.",
    "Switch": "Layer 2 device · forwards frames within the local LAN.",
    "Router": "Layer 3 device · forwards traffic between IP networks.",
    "Server": "Service host · example address 192.168.1.100."
};

function toast(message) {
    const t = $("toast");
    if (!t) return;
    t.textContent = message;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2200);
}

function gotoPage(id) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.toggle("hidden", page.id !== id);
    });

    document.querySelectorAll(".nav").forEach(button => {
        button.classList.toggle("active", button.dataset.page === id);
    });

    const titles = {
        overview: "Network overview",
        diagnostics: "Diagnostics lab",
        topologyPage: "Network map",
        protocols: "Protocol lab",
        learning: "Learning centre",
        incidents: "Incident history",
        quiz: "Knowledge check"
    };

    $("pageTitle").textContent = titles[id] || "NetGuard X";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav").forEach(button => {
    button.addEventListener("click", () => gotoPage(button.dataset.page));
});

document.querySelectorAll("[data-goto]").forEach(button => {
    button.addEventListener("click", () => gotoPage(button.dataset.goto));
});

// Interactive network devices
document.querySelectorAll(".device").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".device").forEach(device => {
            device.classList.remove("selected");
        });

        button.classList.add("selected");

        $("deviceDetail").innerHTML =
            `<b>${button.dataset.device}</b>
             <span>${deviceInfo[button.dataset.device] || "Network device"}</span>`;
    });
});

function faultDevice(fault) {
    document.querySelectorAll(".device").forEach(device => {
        device.classList.remove("failed");
    });

    if (fault === "switch_down") {
        document.querySelector('[data-device="Switch"]')?.classList.add("failed");
    }

    if (fault === "server_down") {
        document.querySelector('[data-device="Server"]')?.classList.add("failed");
    }

    if (fault === "bad_ip") {
        document.querySelector('[data-device="PC 01"]')?.classList.add("failed");
    }
}

// Network diagnostic simulation
async function runTest(ip, fault, protocol, where) {
    const out = $(where === "quick" ? "quickResult" : "diagOutput");

    out.innerHTML =
        "<b>⟳</b><div><strong>Running simulated test…</strong><p>Evaluating selected scenario.</p></div>";

    try {
        const response = await fetch("/api/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ip, fault, protocol })
        });

        if (!response.ok) {
            throw new Error("Network test failed.");
        }

        const result = await response.json();

        historyItems.unshift(result);
        renderResult(result);
        faultDevice(fault);

        const health = Math.max(
            0,
            100 - result.loss - Math.min(40, Math.max(0, result.latency - 20) / 5)
        );

        $("health").innerHTML = Math.round(health) + "<span>%</span>";
        $("healthBar").style.width = health + "%";
        $("latency").innerHTML = result.latency + "<span> ms</span>";
        $("loss").innerHTML = result.loss + "<span>%</span>";
        $("lossBar").style.width = result.loss + "%";
        $("testCount").textContent = historyItems.length;

        if (where === "quick") {
            out.innerHTML =
                `<i></i><div><b>${result.status}</b><small>${result.diagnosis}</small></div>`;
        } else {
            out.innerHTML =
                `<b>⌁</b><div>
                    <strong>${result.status} · ${result.ip_version}</strong>
                    <p>${result.diagnosis}</p>
                    <p><b>Recovery:</b> ${result.recovery}</p>
                    <p><b>Protocol:</b> ${result.protocol} ·
                    <b>Checksum:</b> ${result.checksum}</p>
                </div>`;
        }

        renderHistory();
        toast("Simulation complete — report updated.");
    } catch (error) {
        out.innerHTML =
            "<b>!</b><div><strong>Could not run test</strong><p>Check that Flask is running and reload the page.</p></div>";
    }
}

function renderResult(result) {
    $("reportEmpty").classList.add("hidden");
    $("report").classList.remove("hidden");

    $("report").innerHTML = `
        <div class="report-box">
            <h3>DIAGNOSIS · ${result.time}</h3>
            <p><b>${result.status}</b><br>${result.diagnosis}</p>
        </div>
        <div class="report-box">
            <h3>RECOVERY SUGGESTION</h3>
            <p>${result.recovery}</p>
        </div>
        <div class="report-box">
            <h3>NETWORK METRICS</h3>
            <p>Latency: ${result.latency} ms<br>
            Packet loss: ${result.loss}%<br>
            Address: ${result.ip_version}</p>
        </div>
        <div class="report-box">
            <h3>PROTOCOL / ERROR CHECK</h3>
            <p>Protocol: ${result.protocol}<br>${result.checksum}</p>
        </div>
    `;
}

$("quickRun").addEventListener("click", () => {
    runTest(
        $("quickIp").value,
        $("quickFault").value,
        "TCP",
        "quick"
    );
});

$("diagRun").addEventListener("click", () => {
    runTest(
        $("diagIp").value,
        $("diagFault").value,
        $("diagProtocol").value,
        "diag"
    );
});

// Incident history
function renderHistory() {
    const element = $("historyList");

    if (!historyItems.length) {
        element.className = "empty";
        element.textContent = "No incidents recorded yet.";
        return;
    }

    element.className = "";

    element.innerHTML = historyItems.map(result => `
        <div class="history-item">
            <div>
                <b>${result.status}</b>
                <small>${result.time} · ${result.protocol} · ${result.ip_version}</small>
                <small>${result.diagnosis}</small>
            </div>
            <span>${result.loss}% loss</span>
        </div>
    `).join("");
}

$("clearHistory").addEventListener("click", () => {
    historyItems = [];
    renderHistory();
    $("testCount").textContent = "0";
    toast("Session history cleared.");
});

// Export report as CSV
$("exportBtn").addEventListener("click", () => {
    if (!historyItems.length) {
        toast("Run a test before exporting.");
        return;
    }

    const rows = [
        [
            "time", "status", "diagnosis", "recovery",
            "ip_version", "latency_ms", "packet_loss_percent", "protocol"
        ],
        ...historyItems.map(result => [
            result.time,
            result.status,
            result.diagnosis,
            result.recovery,
            result.ip_version,
            result.latency,
            result.loss,
            result.protocol
        ])
    ];

    const csv = rows.map(row =>
        row.map(value =>
            '"' + String(value).replaceAll('"', '""') + '"'
        ).join(",")
    ).join("\r\n");

    const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "netguard-x-report.csv";
    link.click();

    URL.revokeObjectURL(url);
});

// TCP three-way handshake animation
$("animateHandshake").addEventListener("click", () => {
    const rows = [...document.querySelectorAll(".handshake div")];

    rows.forEach(row => row.classList.remove("lit"));

    let index = 0;

    const timer = setInterval(() => {
        if (index > 0 && index <= rows.length) {
            rows[index - 1].classList.remove("lit");
        }

        if (index === rows.length) {
            clearInterval(timer);
            $("handshakeStatus").textContent =
                "Handshake illustration complete: connection established.";
            return;
        }

        rows[index].classList.add("lit");

        $("handshakeStatus").textContent = [
            "Client sends SYN",
            "Server replies SYN-ACK",
            "Client sends ACK"
        ][index];

        index++;
    }, 750);
});

// Checksum demonstration
let corrupted = false;

$("corruptBtn").addEventListener("click", () => {
    corrupted = !corrupted;

    $("checksumBox").innerHTML = corrupted
        ? 'CHECK <b style="color:var(--red)">ERROR</b>'
        : "CHECK <b>OK</b>";

    $("checksumStatus").textContent = corrupted
        ? "Checksum mismatch simulated. Reliable protocols may retransmit damaged data."
        : "Data restored for this demonstration.";
});

// TCP flow control slider
$("windowSlider").addEventListener("input", event => {
    const value = Number(event.target.value);

    $("windowValue").textContent = value + "%";
    $("windowFill").style.width = value + "%";

    $("windowNote").textContent =
        value < 35
            ? "Small receiver window — sender should reduce its rate."
            : value > 75
                ? "Large receiver window — more data can be in flight."
                : "Moderate sending rate — receiver has room for more data.";
});

// ==================================================
// KNOWLEDGE CHECK / QUIZ
// ==================================================


const questions = [
    {
        q: "1. Which device connects computers in a wired LAN?",
        options: ["Router", "Switch", "Modem", "Monitor"],
        answer: 1,
        why: "A switch connects devices within a local area network."
    },
    {
        q: "2. How many bits does an IPv4 address contain?",
        options: ["16 bits", "32 bits", "64 bits", "128 bits"],
        answer: 1,
        why: "IPv4 addresses contain 32 bits."
    },
    {
        q: "3. What is the correct TCP three-way handshake?",
        options: [
            "ACK, SYN, SYN-ACK",
            "SYN-ACK, SYN, ACK",
            "SYN, SYN-ACK, ACK",
            "SYN, ACK, FIN"
        ],
        answer: 2,
        why: "The client sends SYN, the server responds with SYN-ACK, and the client sends ACK."
    },
    {
        q: "4. What does TCP flow control help prevent?",
        options: [
            "Overwhelming the receiver",
            "Changing IP addresses",
            "Losing the network cable",
            "Encrypting passwords"
        ],
        answer: 0,
        why: "Flow control helps prevent a sender from overwhelming the receiver."
    },
    {
        q: "5. QUIC runs over which transport protocol?",
        options: ["TCP", "UDP", "ARP", "ICMP"],
        answer: 1,
        why: "QUIC runs over UDP and supports secure connections."
    },
    {
        q: "6. What can a checksum help detect?",
        options: [
            "Screen damage",
            "Data corruption",
            "Low battery",
            "Wrong username"
        ],
        answer: 1,
        why: "A checksum helps detect errors or corruption in data."
    },
    {
        q: "7. Which device forwards packets between different IP networks?",
        options: ["Switch", "Router", "Keyboard", "Hub"],
        answer: 1,
        why: "A router forwards packets between different networks."
    }
];

let qi = 0;
let score = 0;
let answered = false;

function startQuiz() {
    qi = 0;
    score = 0;
    showQuestion();
}

function showQuestion() {
    const box = $("quizContent");

    if (!box) {
        console.error("quizContent was not found in index.html");
        return;
    }

    if (qi >= questions.length) {
        box.className = "empty";
        box.innerHTML = `
            <h2>Quiz complete!</h2>
            <p>Your score: <strong>${score} / ${questions.length}</strong></p>
            <p>${
                score === questions.length
                    ? "Excellent! All answers are correct."
                    : "Good effort! Review the topics and try again."
            }</p>
            <button class="primary" id="restartQuiz" type="button">
                Try again
            </button>
        `;

        $("restartQuiz").addEventListener("click", startQuiz);
        return;
    }

    answered = false;
    const question = questions[qi];

    box.className = "";
    box.innerHTML = `
        <p class="eyebrow">QUESTION ${qi + 1} OF ${questions.length}</p>
        <h2>${question.q}</h2>

        <div class="quiz-options">
            ${question.options.map((option, index) => `
                <button
                    class="secondary quiz-option"
                    data-answer="${index}"
                    type="button"
                >${option}</button>
            `).join("")}
        </div>

        <p id="quizFeedback" class="feedback" aria-live="polite"></p>

        <button class="primary hidden" id="nextQuestion" type="button">
            ${qi === questions.length - 1 ? "View results →" : "Next question →"}
        </button>
    `;

    box.querySelectorAll(".quiz-option").forEach(button => {
        button.addEventListener("click", () => {
            if (answered) return;
            answered = true;

            const selected = Number(button.dataset.answer);
            const correct = selected === question.answer;

            if (correct) score++;

            box.querySelectorAll(".quiz-option").forEach((option, index) => {
                option.disabled = true;

                if (index === question.answer) {
                    option.classList.add("correct-answer");
                }

                if (index === selected && !correct) {
                    option.classList.add("wrong-answer");
                }
            });

            $("quizFeedback").textContent =
                (correct ? "Correct! " : "Not quite. ") + question.why;

            $("nextQuestion").classList.remove("hidden");
        });
    });

    $("nextQuestion").addEventListener("click", () => {
        if (!answered) return;
        qi++;
        showQuestion();
    });
}

// Connect the Start Quiz button.
$("startQuiz")?.addEventListener("click", startQuiz);
