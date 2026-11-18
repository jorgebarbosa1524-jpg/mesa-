const NUM_CHANNELS = 6;
const channelNames = ["Voz 1", "Guitarra", "Baixo", "Bateria", "Teclado", "Aux In"];
const channels = [];
let audioCtx = null;
let isPlaying = false;
let aiActive = false;
let aiLoopId = null;
let userInteracting = false;

const consoleMain = document.getElementById("console-main");
const btnPlay = document.getElementById("btn-play");
const btnStop = document.getElementById("btn-stop");
const btnAi = document.getElementById("btn-ai");
const aiLog = document.getElementById("ai-log");
const aiPreset = document.getElementById("ai-preset");
const aiProviderSelect = document.getElementById("ai-provider");
const aiApiKeyInput = document.getElementById("ai-api-key");
const btnSaveKey = document.getElementById("btn-save-key");
const aiChatInput = document.getElementById("ai-chat-input");
const aiChatSend = document.getElementById("ai-chat-send");

// Carregar chave salva anteriormente se houver
const savedKey = localStorage.getItem("xr18_ai_key") || "";
const savedProvider = localStorage.getItem("xr18_ai_provider") || "auto";
if(savedKey) aiApiKeyInput.value = savedKey;
aiProviderSelect.value = savedProvider;

btnSaveKey.addEventListener("click", () => {
    const key = aiApiKeyInput.value.trim();
    localStorage.setItem("xr18_ai_key", key);
    localStorage.setItem("xr18_ai_provider", aiProviderSelect.value);
    
    let detected = "Modo Local";
    if(key.startsWith("AIza")) {
        detected = "Google Gemini (Chave AIza... detectada!)";
        if(aiProviderSelect.value === "auto") aiProviderSelect.value = "gemini";
    } else if(key.startsWith("sk-ant")) {
        detected = "Anthropic Claude (Chave sk-ant... detectada!)";
        if(aiProviderSelect.value === "auto") aiProviderSelect.value = "claude";
    } else if(key.length > 5) {
        detected = "Chave API personalizada salva";
    }
    aiLog.textContent = `✅ Configuração salva: ${detected}`;
});

for(let i=0; i<NUM_CHANNELS; i++) {
    channels.push({
        id: i,
        name: channelNames[i],
        volume: 0.75,
        gain: 1.0,
        high: 0,
        mid: 0,
        low: 0,
        mute: false,
        solo: false
    });

    const strip = document.createElement("div");
    strip.className = "strip";
    strip.id = `strip-${i}`;
    strip.innerHTML = `
        <div class="title">${channelNames[i]}</div>
        <div style="font-size:0.58rem; color:#94a3b8;">GAIN</div>
        <input type="range" min="0" max="200" value="100" data-idx="${i}" data-param="gain" style="width:90%; height:4px;">
        <div style="font-size:0.58rem; color:#94a3b8; margin-top:2px;">EQ H/M/L</div>
        <input type="range" min="-15" max="15" value="0" data-idx="${i}" data-param="high" id="eq-h-${i}" style="width:90%; height:3px;">
        <input type="range" min="-15" max="15" value="0" data-idx="${i}" data-param="mid" id="eq-m-${i}" style="width:90%; height:3px; margin:2px 0;">
        <input type="range" min="-15" max="15" value="0" data-idx="${i}" data-param="low" id="eq-l-${i}" style="width:90%; height:3px;">
        <div style="display:flex; gap:5px; margin-top:4px;">
            <button type="button" class="btn-mute" data-action="mute" data-idx="${i}" id="mute-${i}">MUTE</button>
            <button type="button" class="btn-solo" data-action="solo" data-idx="${i}" id="solo-${i}">SOLO</button>
        </div>
        <div style="display:flex; gap:6px; align-items:center; height:120px; margin-top:2px;">
            <input type="range" class="vertical" min="0" max="100" value="75" data-idx="${i}" data-param="volume" id="fader-${i}">
            <div class="vu"><div class="vu-fill" id="vu-${i}"></div></div>
        </div>
        <span id="readout-${i}" style="font-size:0.7rem; font-family:monospace; color:#38bdf8;">75%</span>
    `;
    consoleMain.appendChild(strip);
}

// Função dedicada para atualizar o estado visual do MUTE e SOLO
function toggleMute(idx) {
    channels[idx].mute = !channels[idx].mute;
    const btn = document.getElementById(`mute-${idx}`);
    const strip = document.getElementById(`strip-${idx}`);
    if(btn) {
        if(channels[idx].mute) {
            btn.classList.add("is-muted");
        } else {
            btn.classList.remove("is-muted");
        }
    }
    if(strip) {
        strip.classList.toggle("strip-muted", channels[idx].mute);
    }
}

function toggleSolo(idx) {
    channels[idx].solo = !channels[idx].solo;
    const btn = document.getElementById(`solo-${idx}`);
    if(btn) {
        if(channels[idx].solo) {
            btn.classList.add("is-solo");
        } else {
            btn.classList.remove("is-solo");
        }
    }
}

consoleMain.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if(!btn) return;
    const action = btn.dataset.action;
    const idx = Number(btn.dataset.idx);
    if(isNaN(idx)) return;

    if(action === "mute") {
        toggleMute(idx);
    } else if(action === "solo") {
        toggleSolo(idx);
    }
});

function initAudio() {
    if(!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(audioCtx.state === "suspended") {
        audioCtx.resume();
    }
}

btnPlay.addEventListener("click", () => {
    initAudio();
    isPlaying = true;
    btnPlay.classList.add("active");
    btnPlay.textContent = "▶ Tocando XR18...";
    startMeters();
});

btnStop.addEventListener("click", () => {
    isPlaying = false;
    btnPlay.classList.remove("active");
    btnPlay.textContent = "▶ Tocar Demo";
    resetMeters();
});

function startMeters() {
    function loop() {
        if(!isPlaying) return;
        const anySolo = channels.some(c => c.solo);
        channels.forEach((ch, idx) => {
            const vu = document.getElementById(`vu-${idx}`);
            if(vu) {
                const isAudible = anySolo ? ch.solo : !ch.mute;
                const val = !isAudible ? 0 : Math.floor(Math.random() * 75 + (ch.volume * 20));
                vu.style.height = `${val}%`;
            }
        });
        requestAnimationFrame(loop);
    }
    loop();
}

function resetMeters() {
    channels.forEach((_, idx) => {
        const vu = document.getElementById(`vu-${idx}`);
        if(vu) vu.style.height = "0%";
    });
}

document.addEventListener("pointerdown", e => {
    if(e.target.matches("input[type='range']")) userInteracting = true;
});
document.addEventListener("pointerup", () => userInteracting = false);

document.addEventListener("input", e => {
    const target = e.target;
    const idx = Number(target.dataset.idx);
    const param = target.dataset.param;
    if(isNaN(idx) || !param) return;
    const val = Number(target.value);

    if(param === "volume") {
        channels[idx].volume = val / 100;
        document.getElementById(`readout-${idx}`).textContent = `${val}%`;
    } else if(param === "gain") {
        channels[idx].gain = val / 100;
    } else if(param === "high") {
        channels[idx].high = val;
    } else if(param === "mid") {
        channels[idx].mid = val;
    } else if(param === "low") {
        channels[idx].low = val;
    }
});

// Integração real com Google Gemini API + Fallback Inteligente na Mesa
async function processAIChatCommand(cmd) {
    const text = cmd.toLowerCase();
    const key = aiApiKeyInput.value.trim();
    let provider = aiProviderSelect.value;

    if(provider === "auto") {
        if(key.startsWith("AIza")) provider = "gemini";
        else if(key.startsWith("sk-ant")) provider = "claude";
        else provider = "local";
    }

    aiLog.textContent = `🤖 XR18 IA (${provider.toUpperCase()}): Analisando "${cmd}"...`;

    // Aplica ajustes locais imediatos na mesa conforme a intenção do comando
    applyLocalMixAction(text);

    // Se houver chave do Gemini, consulta o Gemini 2.5 Flash para dicas profissionais reais
    if(provider === "gemini" && key.startsWith("AIza")) {
        try {
            const stateSummary = channels.map(c => `${c.name}: vol ${Math.round(c.volume*100)}%, EQ(H:${c.high}, M:${c.mid}, L:${c.low}), mute:${c.mute}`).join(" | ");
            const prompt = `Você é um engenheiro de som ao vivo operando uma Behringer XR18. Estado atual: [${stateSummary}]. O usuário pediu: "${cmd}". Responda em 1 frase curta e direta em português confirmando o ajuste técnico ideal.`;

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await res.json();
            if(data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                aiLog.textContent = `✨ Gemini XR18: ${data.candidates[0].content.parts[0].text.trim()}`;
                return;
            } else if(data.error) {
                aiLog.textContent = `⚠️ Gemini API (${data.error.message}) — Ajuste local aplicado na mesa!`;
                return;
            }
        } catch(err) {
            aiLog.textContent = `🤖 Ajuste aplicado na mesa! (Sem conexão externa no momento)`;
            return;
        }
    }
}

function applyLocalMixAction(text) {
    if(text.includes("baixo") || text.includes("bass")) {
        const ch = channels[2];
        ch.low = Math.min(8, ch.low + 3);
        ch.mid = Math.max(-4, ch.mid - 1);
        ch.volume = Math.min(0.88, ch.volume + 0.06);
        document.getElementById("eq-l-2").value = ch.low;
        document.getElementById("eq-m-2").value = ch.mid;
        document.getElementById("fader-2").value = Math.round(ch.volume * 100);
        document.getElementById("readout-2").textContent = `${Math.round(ch.volume * 100)}%`;
        aiLog.textContent = `🤖 XR18 IA: Baixo analisado e corrigido! Graves +${ch.low}dB, médios limpos e volume em ${Math.round(ch.volume*100)}%.`;
    } else if(text.includes("voz") || text.includes("vocal")) {
        const ch = channels[0];
        ch.high = Math.min(6, ch.high + 3);
        ch.volume = Math.min(0.92, ch.volume + 0.06);
        document.getElementById("eq-h-0").value = ch.high;
        document.getElementById("fader-0").value = Math.round(ch.volume * 100);
        document.getElementById("readout-0").textContent = `${Math.round(ch.volume * 100)}%`;
        aiLog.textContent = `🤖 XR18 IA: Voz Principal corrigida! Brilho +${ch.high}dB e volume em ${Math.round(ch.volume*100)}%.`;
    } else if(text.includes("mutar") || text.includes("mute")) {
        channelNames.forEach((name, idx) => {
            if(text.includes(name.toLowerCase().split(" ")[0])) {
                if(!channels[idx].mute) toggleMute(idx);
                aiLog.textContent = `🤖 XR18 IA: Canal ${name} mutado!`;
            }
        });
    } else if(text.includes("nivelar") || text.includes("corrigir") || text.includes("tudo")) {
        channels.forEach((ch, i) => {
            ch.volume = 0.75;
            ch.high = 0; ch.mid = 0; ch.low = 0;
            document.getElementById(`fader-${i}`).value = 75;
            document.getElementById(`eq-h-${i}`).value = 0;
            document.getElementById(`eq-m-${i}`).value = 0;
            document.getElementById(`eq-l-${i}`).value = 0;
            document.getElementById(`readout-${i}`).textContent = "75%";
        });
        aiLog.textContent = `🤖 XR18 IA: Todos os canais nivelados e equalizados!`;
    } else {
        aiLog.textContent = `🤖 XR18 IA: Ajuste aplicado para "${text}".`;
    }
}

aiChatSend.addEventListener("click", () => {
    const val = aiChatInput.value.trim();
    if(val) {
        processAIChatCommand(val);
        aiChatInput.value = "";
    }
});

aiChatInput.addEventListener("keydown", e => {
    if(e.key === "Enter") {
        aiChatSend.click();
    }
});

// IA Engenheiro ao vivo
function runAI() {
    if(!aiActive || !isPlaying || userInteracting) return;
    const preset = aiPreset.value;
    const targetCh = Math.floor(Math.random() * channels.length);
    const ch = channels[targetCh];

    if(preset === "vocal" && targetCh === 0) {
        ch.volume = Math.min(0.9, ch.volume + 0.02);
        aiLog.textContent = `🤖 XR18 Auto-Mix: Ajustando Voz Principal (${Math.round(ch.volume*100)}%)`;
    } else if(preset === "punch" && (targetCh === 2 || targetCh === 3)) {
        ch.low = Math.min(6, ch.low + 1);
        document.getElementById(`eq-l-${targetCh}`).value = ch.low;
        aiLog.textContent = `🤖 XR18 Auto-Mix: Reforçando graves do ${ch.name}`;
    } else {
        const delta = (Math.random() - 0.5) * 0.04;
        ch.volume = Math.max(0.45, Math.min(0.88, ch.volume + delta));
        aiLog.textContent = `🤖 XR18 Auto-Mix: Nivelando ${ch.name} para ${Math.round(ch.volume*100)}%`;
    }

    const faderInput = document.getElementById(`fader-${targetCh}`);
    const readout = document.getElementById(`readout-${targetCh}`);
    const pct = Math.round(ch.volume * 100);
    if(faderInput) faderInput.value = pct;
    if(readout) readout.textContent = `${pct}%`;

    const strip = document.getElementById(`strip-${targetCh}`);
    if(strip) {
        strip.classList.add("ai-active");
        requestAnimationFrame(() => strip.classList.remove("ai-active"));
    }
}

btnAi.addEventListener("click", () => {
    aiActive = !aiActive;
    btnAi.classList.toggle("active-ai", aiActive);
    btnAi.textContent = aiActive ? "🤖 Auto-Mix IA: ON" : "🤖 Auto-Mix IA: OFF";
    if(aiActive) {
        aiLog.textContent = "🤖 XR18 Auto-Mix ativado! Controlando faders e EQ ao vivo...";
        if(!aiLoopId) {
            const aiLoop = () => { runAI(); aiLoopId = requestAnimationFrame(aiLoop); };
            aiLoopId = requestAnimationFrame(aiLoop);
        }
    } else {
        aiLog.textContent = "Auto-Mix desativado. Controle manual ativo.";
        if(aiLoopId) { cancelAnimationFrame(aiLoopId); aiLoopId = null; }
    }
});
